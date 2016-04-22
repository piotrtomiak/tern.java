import * as tern from "tern/lib/tern";
import * as infer from "tern/lib/infer";

function processProperty(server, file, prop, parent, level, resolvedTypes) {
  var originFile;
  if (prop.originNode && prop.originNode.sourceFile) {
    originFile = prop.originNode.sourceFile.name;
  } else {
    originFile = prop.origin;
  }
  if (!originFile || !server.fileMap[originFile] || (level == 1 && originFile != file.name)) {
    return;
  }
  var child;
  // create child node only if this is not a prototype
  if (prop.propertyName != "prototype") {
    var nodeType = prop.types.length > 0 ? prop.types.join('|') : "?";
    if (!parent.name || parent.kind == "prototype" || nodeType.startsWith("fn(")) {
      child = {
          name: prop.propertyName,
          file: originFile,
          value: originFile != file.name,
          type: nodeType,
          start: prop.originNode ? prop.originNode.start : -1,
          end: prop.originNode ? prop.originNode.end : -1
        };
    }
  } else {
    // mark the parent as a prototype
    parent.kind = "prototype";
  }
  // process property only if it is not a constructor
  if (prop.propertyName != "constructor" &&  (child || parent.kind == "prototype")) {
    for (var typeNr in prop.types) {
      var type = prop.types[typeNr];
      if (type) {
        if (!child || child.type.startsWith("fn(") || resolvedTypes.indexOf(type.name) == -1) {
          if (parent && parent.kind == "prototype" && resolvedTypes.indexOf(parent.name) == -1) {
            resolvedTypes.push(parent.name);
            resolvedTypes.push(parent.name + ".prototype");
          }
          gather(server, file, type, child ? child : parent, level, resolvedTypes);
          // process possible scope only if type is from a current file
          if (type.originNode && type.originNode.sourceFile == file && (type.originNode.type == "FunctionExpression" || type.originNode.type == "FunctionDeclaration")) {
            var scope = infer.scopeAt(file.ast, type.originNode.end);
            if (scope && (scope.isBlock || scope.fnType)) {
              gather(server, file, scope, child ? child : parent, level, resolvedTypes);
            }
          }
        }
      }
    }
  }
  if (child) {
    var children = parent;
    if (!(children instanceof Array)) {
      if (children.children) {
        children = children.children;
      } else {
        children = children.children = [];
      }
    }
    for (var c in children) {
      if (child.name == children[c].name) {
        return;
      }
    }
    children.push(child);
  }
}

function gather(server, file, node, parent, level, resolvedTypes) {
  if (level++ > 6) return;
  if (node.instances && node.instances.length > 0) {
    var instance = node.instances[0].instance;
    if (instance) {
      for (var propNr in instance.props) {
        processProperty(server, file, instance.props[propNr], parent, level, resolvedTypes);
      }
    }
  }
  for (var propName in node.props) {
    var prop = node.props[propName];
    if (node.fnType && node.fnType.argNames.indexOf(prop.propertyName) != -1) {
      continue;
    }
    processProperty(server, file, prop, parent, level, resolvedTypes);
  }
  if (node.proto && (node.proto.name == parent.name || node.proto.name == node.name + ".prototype")) {
    gather(server, file, node.proto, parent, --level, resolvedTypes);
  }
}

export function create(server, query, file, resolvedTypes) {
  try {
    var outline = [],
        scope = file.scope;
    var resolvedTypes = ["boolean", "number", "string", "symbol", "Array"];
    gather(server, file, scope, outline, 0, resolvedTypes);
    return { outline: outline };
  } catch (err) {
    console.error(err, err.stack);
    return { outline: [] };
  }
}