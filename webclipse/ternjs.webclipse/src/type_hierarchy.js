import * as tern from "tern/lib/tern"
import * as infer from "tern/lib/infer"
import * as walk from "acorn/dist/walk"

export function getTypeHierarchy(server, query, file) {
  var expr = tern.findQueryExpr(file, query, true);
  if (!expr) {
    return {};
  }
  var root = infer.expressionType(expr);
  var hierarchy = {};
  hierarchy.supertypes = [];
  if (root && !root.name) {
    var rootDef = {
        type: "type",
        file: root.origin
    };
    if (root.originNode) {
      rootDef.name = root.originNode.name;
      rootDef.start = root.originNode.start;
      rootDef.end = root.originNode.end;
    }
    var type = root.getType();
    var rootProto;
    if (type && type.props.prototype) {
      var prototypes = type.props.prototype.types;
      if (prototypes && prototypes.length > 0) {
        var rootProto = prototypes[0];
      }
    } else {
      rootProto = type;
    }
    if (rootProto && rootProto.name) {
      if (!rootProto.name.endsWith(".prototype")) {
        rootProto.name = rootDef.name + ".prototype";
      }
      rootDef.props = collectProperties(rootProto, rootDef.name, true);
      var typeCtor = getConstructor(rootProto, rootDef.name);
      if (typeCtor) {
        rootDef.props.push(typeCtor);
      }
      var nextProto = rootProto.proto;
      if (nextProto && nextProto.name != "Function.prototype") {
        processType(rootProto.proto, hierarchy.supertypes, server);
        hierarchy.supertypes.push(rootDef);   
        rootDef.subtypes = collectSubtypes(rootDef.name, server, file);
      }
    }
  }
  return hierarchy;
}

function processType(proto, supertypes, server) {
  // create a new type
  var protoDef = {
      type: "type",
      file: proto.origin,
      props: []
  };
  // set prototype name
  if (proto.name) {
    if (proto.name.endsWith(".prototype")) {
      protoDef.name = proto.name.substring(0, proto.name.length - 10);
    } else {
      protoDef.name = proto.name;
    }
  } else {
    protoDef.name = "undefined";
  }
  // set position
  if (proto.originNode) {
    protoDef.start = proto.originNode.start;
    protoDef.end = proto.originNode.end;
  } else if (proto.proto && proto.name) {
    // try find definition in other file only if it is not a root
    var protoFile = server.fileMap[proto.origin];
    if (protoFile) {
      var varDef = protoFile.scope.defVar(protoDef.name);
      if (varDef) {
        var varType = varDef.getType();
        if (varDef) {
          protoDef.start = varDef.originNode.start;
          protoDef.end = varDef.originNode.end;
        }
      }
    }
  }
  // set constructor
  var typeCtor = getConstructor(proto, protoDef.name);
  if (typeCtor) {
    protoDef.props.push(typeCtor);
  }
  // get properties
  protoDef.props = collectProperties(proto, protoDef.name, true);
  
  var nextProto = proto.proto;
  if (nextProto && nextProto.name == protoDef.name + ".prototype") {
    //skip next prototype
    nextProto = nextProto.proto;
  }
  if (nextProto) {
    processType(nextProto, supertypes, server); 
  }
  supertypes.push(protoDef);
}

function collectSubtypes(name, server, file) {
  var subtypes = [];
  walk.simple(file.ast, {
    FunctionDeclaration: function (node) {
      if (node.id.name != name) {
        var subtype = createSubtypeFromFunction(name, node, server, file);
        if (subtype) {
          subtypes.push(subtype);
        }
      }
    },
    ClassDeclaration: function (node) {
      if (node.superClass && node.superClass.name == name) {
        subtypes.push(createSubtypeFromClass(node, server, file));
      }
    },
    VariableDeclarator: function (node) {
      if (node.id.name != name) {
        var subtype = createSubtypeFromFunction(name, node, server, file);
        if (subtype) {
          subtypes.push(subtype);
        }
      }
    }
  });
  return subtypes;
}

function createSubtypeFromClass(node, server, file) {
  var type = node.objType;
  var props = [];
  var classname = node.id.name;
  if (node.objType.self) {
    var types = node.objType.self.types;
    if (types && types.length > 0) {
        props = collectProperties(types[0], classname, true);
    }
  }
  var subtypes = collectSubtypes(classname, server, file);
  return {
    name: classname,
    start: node.id.start,
    end: node.id.end,
    file: node.sourceFile.name,
    type: "type",
    props: props,
    subtypes: subtypes
  };
}

function createSubtypeFromFunction(name, node, server, file) {
  var query = {};
  query.end = node.id.end;
  var expr = tern.findQueryExpr(file, query, true); 
  var root = infer.expressionType(expr);
  if (root) {
    var type = root.getType();
    if (type && type.self) {
      var types = type.self.types;
      if (types && types.length > 0) {
        var superType = types[0].proto;
        if (superType.name == type.name + ".prototype") {
          superType = superType.proto;
        }
        if (superType.name == name || superType.name == name + ".prototype") {
          var props = collectProperties(types[0], type.name);
          return {
            name: type.name,
            start: root.originNode.start,
            end: root.originNode.end,
            file: root.origin,
            type: "type",
            props: props,
            subtypes: collectSubtypes(type.name, server, file)
          };
        }
      }
    }
  }
  return null;
}

function getConstructor(proto, name) {
  if (proto.hasCtor && proto.hasCtor.name == name) {
    var ctor = proto.hasCtor;
    var typeCtor = {
      name: ctor.name,
      type: "function",
      isConstructor: true,
      start: ctor.originNode ? ctor.originNode.start : -1,
      end: ctor.originNode ? ctor.originNode.end : -1
    };
    if (ctor.args && ctor.args.length > 0) {
      typeCtor.params = [];
      for (var argNr in ctor.args) {
        var arg = ctor.args[argNr];
        typeCtor.params.push({
            name: arg.propertyName,
            type: "Lx;"
          });
      }
    }
    return typeCtor;
  }
  return null;
}

function collectProperties(proto, typeName, processInstance) {
  var props = [];
  if (proto && proto.name && (proto.name == typeName || proto.name == typeName + ".prototype")) {
    props = mergeProperties(props, getProperties(proto));
    if (processInstance && proto.name == typeName + ".prototype" && proto.instances) {
      for (var instanceNr in proto.instances) {
        var instance = proto.instances[instanceNr].instance;
        props = mergeProperties(props, getProperties(instance));
      }
    }
    if (proto.name == typeName) {
      props = mergeProperties(props, collectProperties(proto.proto, typeName, false));
    }
  }
  return props;
}

function mergeProperties(props, newProps) {
  var shouldAdd = function(name) { 
    for (var p in props) {
      if (props[p].name == name) {
        return false;
      }    
    };
    return true;
  };
  for (var index in newProps) {
    if (shouldAdd(newProps[index].name)) {
      props.push(newProps[index]);
    }
  }
  return props;
}

function getProperties(proto) {
  var props = props = [];
  for (var propName in proto.props) {
    var prop = proto.props[propName];
    var propType;
    if (prop.types.length > 0) {
      propType = isFunction(prop.types[0]) ? "function" : "field";
    } else {
      propType = "field";
    }
    var child = {
        name: prop.propertyName,
        type: propType,
        start: prop.originNode ? prop.originNode.start : -1,
        end: prop.originNode ? prop.originNode.end : -1
    };
    if (prop.originNode) {
      child.file = prop.originNode.sourceFile.name;
    }
    props.push(child);
  }
  return props;
}

function isFunction(proto) {
  if (proto) {  
    if (proto.name == "Function.prototype") {
      return true;
    } else if (proto.name == "Object.prototype") {
      return false;
    }
    return isFunction(proto.proto);
  }
  return false;
}
