import * as tern from "tern/lib/tern"
import * as infer from "tern/lib/infer"
import * as walk from "acorn/dist/walk"

function nodeKey(node) {
  return (node.sourceFile ? node.sourceFile.name : "<no-source>") + "$#" + node.type + "/" + node.start;
}

function findEnclosingFnScope(scope) {
  while (scope && !(scope.name == "<top>"
      || (scope.originNode &&
          (scope.originNode.type == "FunctionExpression"
            || scope.originNode.type == "FunctionDeclaration"
            || scope.originNode.type == "ArrowFunction"
            || scope.originNode.type == "ArrowFunctionExpression"
            || scope.originNode.type == "Program")))) {
    if (scope.originNode) {
      console.log("Call Hierarchy: Skipping scope type " + scope.originNode.type)
    } else {
      console.log("Call hierarchy: Skipping empty scope type");
    }
    scope = scope.prev;
  }
  return scope;
}

function getFnScopeInfo(file, scope) {
  var type = scope.originNode ? scope.originNode.type : "Program";
  if (type == "Program") {
    return {
      name: "<top>"
    }
  } else if (type == "FunctionExpression"
        || type == "FunctionDeclaration"
        || type == "ArrowFunction"
        || type == "ArrowFunctionExpression") {
    if (scope.originNode.id) {
      return scope.originNode.id;
    }
    //we need to locate method declaration
    function found(idNode) {
      this.idNode = idNode;
    }
    try {
      walk.simple(file.ast, {
        MethodDefinition: function(node) {
          if (node.value == scope.originNode) {
            throw new found(node.key);
          }
        }
      })
    } catch (e) {
      if (e.idNode) {
        return e.idNode;
      }
    }
    return {
      name: scope.originNode.name || "<anonymous>",
      start: scope.originNode.start,
      end: scope.originNode.start+8,
    }
  }
}


function storeCaller(query, file, callers) {
  
  function getCaller(node, scope) {
    var enclosingFnScope = findEnclosingFnScope(scope);
    if (!enclosingFnScope) {
      return
    } 
    var key = enclosingFnScope.originNode ? nodeKey(enclosingFnScope.originNode) : file.name;
    var res = callers[key];
    if (!res) {
      var info = getFnScopeInfo(file, enclosingFnScope);
      res = callers[key] = {
        file: file.name,
        name: info.name,
        start: info.start ? tern.outputPos(query, file, info.start) : -1,
        end: info.end ? tern.outputPos(query, file, info.end) : -1,
        type: "method",
        key: key,
        javadoc: "",
        returnType: "V",
        signature: "",
        isConstructor: info.name == "constructor",
        params: [
//                    { name: "foo", type: "LString;"},
//                    { name: "car", type: "LMyClass;"}
        ],
        positions: []
      }
    }
    return res;
  }
  
  return function(node, scope) {
    var caller = getCaller(node, scope);
    if (caller) {
      caller.positions.push({
        start: tern.outputPos(query, file, node.start), 
        end: tern.outputPos(query, file, node.end)
      })
    }
  };
}

function findCallersOfVariable(srv, query, file, state, name) {
  for (var scope = state; scope && !(name in scope.props); scope = scope.prev) {}
  if (!scope) throw ternError("Could not find a definition for " + name);
  
  var callers = {};
  
  if (scope.originNode) {
    infer.findRefs(scope.originNode, scope, name, scope, storeCaller(query, file, callers));
  } else {
    for (var i = 0; i < srv.files.length; ++i) {
      var cur = srv.files[i];
      infer.findRefs(cur.ast, cur.scope, name, scope, storeCaller(query, cur, callers));
    }
  }

  var res = {calls: []};
  for (let o in callers) {
    res.calls.push(callers[o]);
  }
  res.calls.reverse();
  return res;
}

function findVariableByFnExpr(ast, start) {
  var id;
  walk.simple(ast, {
    VariableDeclarator: function (node) {
      if (node.init && node.init.type == "FunctionExpression" && node.init.start == start) {
        id = node.id;
      }
    }
  });
  return id;
}

function findCallers_(srv, query, expr, prop) {    
  var exprType = infer.expressionType(expr);
  if (expr.node.type == "MethodDefinition") {
    exprType = exprType.propertyOf;
  }
  var objType = exprType.getObjType();
  if (!objType) throw ternError("Couldn't determine type of base object.");

  var callers = {};
  
  for (var i = 0; i < srv.files.length; ++i) {
    var cur = srv.files[i];
    infer.findPropRefs(cur.ast, cur.scope, objType, prop.name, storeCaller(query, cur, callers));
  }

  var res = {calls: []};
  for (let o in callers) {
    res.calls.push(callers[o]);
  }
  res.calls.reverse();
  return res;
}

export function findRoots(server, query, file) {
	var def = tern.findDef(server, query, file);
	if (!def) {
	  return {roots:[]}
	}
	var origFile = server.fileMap[def.file];
  return {
    roots: [ {
      file: origFile.name,
      name: origFile.text.slice(def.start, def.end),
      start: tern.outputPos(query, origFile, def.start),
      end: tern.outputPos(query, origFile, def.end),
      type: "method",
      javadoc: "",
      key: "key",
      returnType: "V",
      signature: "",
      isConstructor: false,
      params: [
//    					    { name: "foo", type: "LString;"},
//    					    { name: "bar", type: "[Array"},
//    					    { name: "car", type: "LMyClass;"}
			  ]
    }]
  }
  return {roots:[]};	
}

export function findCallers(srv, query, file) {
  var expr = tern.findQueryExpr(file, query, true);
  if (expr && expr.node.type == "FunctionExpression") {
    var id = findVariableByFnExpr(file.ast, expr.node.start);
    if (id) {
      return findCallersOfVariable(srv, query, file, expr.state, id.name);
    }
  } else if (expr && expr.node.type == "Identifier") {
    return findCallersOfVariable(srv, query, file, expr.state, expr.node.name);
  } else if (expr && expr.node.type == "MemberExpression" && !expr.node.computed) {
    var p = expr.node.property;
    expr.node = expr.node.object;
    return findCallers_(srv, query, expr, p);
  } else if (expr && expr.node.type == "ObjectExpression") {
    var pos = tern.resolvePos(file, query.end);
    for (var i = 0; i < expr.node.properties.length; ++i) {
      var k = expr.node.properties[i].key;
      if (k.start <= pos && k.end >= pos)
        return findCallers_(srv, query, expr, k);
    }
  } else if (expr && expr.node.type == "MethodDefinition") {
    var p = expr.node.key;
    return findCallers_(srv, query, expr, p);
  }
  return { calls: [] };
}

export function findCallees(server, query, file) {
  var expr = tern.findQueryExpr(file, query, true);
  var node = expr.node;
  if (expr && expr.node.type == "Identifier") {
    node = expr.state.originNode;
    if (!node) {
      // find function associated with this identifier
      var originNode = expr.state.originNode;
      if (!originNode) {
        originNode = file.ast;
      }
      node = findFunctionByVariableName(originNode, expr.node.name);
    }
  } else if (expr && expr.node.type == "MemberExpression" && !expr.node.computed) {
    node = expr.node.object;
  }
  if (node) {
    return getCallees(node, expr, server, file);
  } else {
    return { calls: [] };
  }
}

function findFunctionByVariableName(rootNode, name) {
  var identifier = null;
  walk.simple(rootNode, {
    VariableDeclarator: function FunctionDeclaration(node) {
      if (!identifier && node.id.name == name) {
        identifier = node.init;
      }
    }
  });
  return identifier;
}

function getCallees(rootMethod, expr, server, file) {
  var res = { calls: [] };
  walk.simple(rootMethod, {
    CallExpression: function CallExpression(node) {
      var callee = node.callee;
      var query = {};
      query.end = callee.end;
      var def = tern.findDef(server, query, file);
      if (def && def.start) {
        res.calls.push(createCallee(def, callee.name, "method", callee.start, callee.end));
      }
    }
  });
  return res;
}
  
function createCallee(def, name, type, start, end) {
  return {
    type: type,
    javadoc: "",
    key: (def.file ? def.file : "<no-source>") + "$#" + type + "/" + def.start,
    file: def.file,
    name: name,
    start: def.start,
    end: def.end,
    returnType: "V",
    signature: "",
    isConstructor: name == "constructor",
    positions: [{ start: start, end: end }]
  };
}
