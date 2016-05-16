import * as tern from "tern/lib/tern";
import * as infer from "tern/lib/infer";

function processProperty(server, file, prop, parent, level, resType, resolvedTypes) {
  if (prop.propertyName == "<i>") {
    return;
  }
  var originFile;
  if (prop.originNode && prop.originNode.sourceFile) {
    originFile = prop.originNode.sourceFile.name;
  } else {
    originFile = prop.origin;
  }
  if (!prop.origin || !server.fileMap[prop.origin] || !originFile || !server.fileMap[originFile]) {
    return;
  }
  var child;
  // create child node only if this is not a prototype
  if (prop.propertyName != "prototype") {
    var nodeType = prop.types.length > 0 ? prop.types.join('|') : "?";
    if (!parent.name || nodeType.indexOf("fn(") == 0 || resType == "proto") {
      child = {
          name: prop.propertyName,
          file: originFile,
          value: originFile != file.name,
          type: nodeType,
          resType : resType,
          start: prop.originNode ? prop.originNode.start : -1,
          end: prop.originNode ? prop.originNode.end : -1
        };
    }
  } else {
    // mark the parent as a prototype
    parent.kind = "prototype";
  }
  // process property only if it is not a constructor
  if (prop.propertyName != "constructor" && (child || parent.kind == "prototype")) {
    if (prop.types && prop.types.length > 0) {
      var type = prop.types[0];
      if (type && (type.originNode || type.instances || !type.name)) {
        var shouldResolve = resolveType(prop.propertyName, type.name, type.originNode ? type.originNode.start : "none", resolvedTypes);
        if (shouldResolve) {
          gather(server, file, type, child ? child : parent, level, "proto", resolvedTypes);
          // process possible scope only if type is from a current file
          if (type.originNode && type.originNode.sourceFile == file && (type.originNode.type == "FunctionExpression" || type.originNode.type == "FunctionDeclaration")) {
            var scope = infer.scopeAt(file.ast, type.originNode.end);
            if (scope) {
              // check if it is a block statement
              if (scope.isBlock) {
                gather(server, file, scope, child ? child : parent, level, "scope", resolvedTypes);
                // if this is a block statement previous scope should be also resolved
                scope = scope.prev;
              }
              // check if it is a function expression
              if (scope.fnType) {
                gather(server, file, scope, child ? child : parent, level, "scope", resolvedTypes);
              }
            }
          }
        }
      }
    }
  }
  if (child && (child.children || child.start != -1)) {
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

function resolveType(propName, name, start, resolvedTypes) {
  if (name && propName != name) {
    var loc = resolvedTypes[name];
	  if (!loc) {
	    resolvedTypes[name] = start;
	  } else if (loc == start || loc == "basic" || loc == "none") {
	    return false;
	  }
  }
  return true;
}

function gather(server, file, node, parent, level, resType, resolvedTypes) {
  if (level++ > 10) return;
  if (node.instances && node.instances.length > 0) {
    var instance = node.instances[0].instance;
    if (instance) {
      for (var propNr in instance.props) {
        processProperty(server, file, instance.props[propNr], parent, level, resType, resolvedTypes);
      }
    }
  }
  for (var propName in node.props) {
    var prop = node.props[propName];
    if (node.fnType && node.fnType.argNames.indexOf(prop.propertyName) != -1) {
      continue;
    }
    processProperty(server, file, prop, parent, level, resType, resolvedTypes);
  }
  if (node.proto && (node.proto.name == parent.name || node.proto.name == node.name + ".prototype")) {
    gather(server, file, node.proto, parent, --level, resType, resolvedTypes);
  }
}

export function create(server, query, file, resolvedTypes) {
  try {
    var outline = [],
        scope = file.scope;
    var resolvedTypes = {
            "boolean": "basic",
            "number": "basic",
            "string": "basic",
            "symbol": "basic",
            "Array": "basic"
    };
    gather(server, file, scope, outline, 0, "scope", resolvedTypes);
    var body = file.ast.body;
    for (var elementNr in body) {
      var element = body[elementNr];
      if (element.type == "ExpressionStatement") {
        var fns = findFnExpressions(element.expression);
        for (var fnNr in fns) {
          var fnExpr = fns[fnNr];
          if (!fnExpr.name) {
            var child = {
                name : "<anonymous>",
                file : file.name,
                value : false,
                type : "fn()",
                resType : "scope",
                start : fnExpr.start,
                end : fnExpr.start + 8
            };
            if (fnExpr.scope) {
              gather(server, file, fnExpr.scope, child, 0, "proto", resolvedTypes);
            }
            if (fnExpr.body.scope) {
              gather(server, file, fnExpr.body.scope, child, 0, "proto", resolvedTypes);
            }
            if (child.children && child.children.length > 0) {
              for (var childNr in outline) {
                if (outline[childNr].start > child.start) {
                  outline.splice(childNr, 0, child);
                  child = null;
                  break;
                }
              }
              if (child) {
                outline.push(child);
              }
            }
          }
        }
      }
    }
    return { outline: outline };
  } catch (err) {
    console.error(err, err.stack);
    return { outline: [] };
  }
}

function findFnExpressions(expression) {
  var fns = [];
  if (expression.type == "UnaryExpression") {
    var expr = expression.argument;
    if (expr) {
      if (expr.type == "FunctionExpression") {
        fns.push(expr);
      }
      else if (expr.type == "CallExpression") {
        expression = expr;
      }
    }
  }
  if (expression.type == "CallExpression") {
    for (var argNr in expression.arguments) {
      var arg = expression.arguments[argNr];
      if (arg && arg.type == "FunctionExpression") {
        fns.push(arg);
      }
    }
    if (expression.callee && expression.callee.type == "FunctionExpression") {
      fns.push(expression.callee);
    }
  }
  return fns;
}
