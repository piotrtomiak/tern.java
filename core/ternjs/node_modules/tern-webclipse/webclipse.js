(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.tern || (g.tern = {})).webclipse = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.findRoots = findRoots;
exports.findCallers = findCallers;
exports.findCallees = findCallees;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _ternLibTern = _dereq_("tern/lib/tern");

var tern = _interopRequireWildcard(_ternLibTern);

var _ternLibInfer = _dereq_("tern/lib/infer");

var infer = _interopRequireWildcard(_ternLibInfer);

var _acornDistWalk = _dereq_("acorn/dist/walk");

var walk = _interopRequireWildcard(_acornDistWalk);

function nodeKey(node) {
  return (node.sourceFile ? node.sourceFile.name : "<no-source>") + "$#" + node.type + "/" + node.start;
}

function findEnclosingFnScope(scope) {
  while (scope && !(scope.name == "<top>" || scope.originNode && (scope.originNode.type == "FunctionExpression" || scope.originNode.type == "FunctionDeclaration" || scope.originNode.type == "ArrowFunction" || scope.originNode.type == "ArrowFunctionExpression" || scope.originNode.type == "Program"))) {
    if (scope.originNode) {
      console.log("Call Hierarchy: Skipping scope type " + scope.originNode.type);
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
    };
  } else if (type == "FunctionExpression" || type == "FunctionDeclaration" || type == "ArrowFunction" || type == "ArrowFunctionExpression") {
    var _ret = (function () {
      //we need to locate method declaration

      var found = function found(idNode) {
        this.idNode = idNode;
      };

      if (scope.originNode.id) {
        return {
          v: scope.originNode.id
        };
      }
      try {
        walk.simple(file.ast, {
          MethodDefinition: function MethodDefinition(node) {
            if (node.value == scope.originNode) {
              throw new found(node.key);
            }
          }
        });
      } catch (e) {
        if (e.idNode) {
          return {
            v: e.idNode
          };
        }
      }
      return {
        v: {
          name: scope.originNode.name || "<anonymous>",
          start: scope.originNode.start,
          end: scope.originNode.start + 8
        }
      };
    })();

    if (typeof _ret === "object") return _ret.v;
  }
}

function storeCaller(query, file, callers) {

  function getCaller(node, scope) {
    var enclosingFnScope = findEnclosingFnScope(scope);
    if (!enclosingFnScope) {
      return;
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
      };
    }
    return res;
  }

  return function (node, scope) {
    var caller = getCaller(node, scope);
    if (caller) {
      caller.positions.push({
        start: tern.outputPos(query, file, node.start),
        end: tern.outputPos(query, file, node.end)
      });
    }
  };
}

function findCallersOfVariable(srv, query, file, expr) {
  var name = expr.node.name;

  for (var scope = expr.state; scope && !(name in scope.props); scope = scope.prev) {}
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

  var res = { calls: [] };
  for (var o in callers) {
    res.calls.push(callers[o]);
  }
  res.calls.reverse();
  return res;
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

  var res = { calls: [] };
  for (var o in callers) {
    res.calls.push(callers[o]);
  }
  res.calls.reverse();
  return res;
}

function findRoots(server, query, file) {
  var def = tern.findDef(server, query, file);
  if (!def) {
    return { roots: [] };
  }
  var origFile = server.fileMap[def.file];
  return {
    roots: [{
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
  };
  return { roots: [] };
}

function findCallers(srv, query, file) {
  var expr = tern.findQueryExpr(file, query, true);
  if (expr && expr.node.type == "Identifier") {
    return findCallersOfVariable(srv, query, file, expr);
  } else if (expr && expr.node.type == "MemberExpression" && !expr.node.computed) {
    var p = expr.node.property;
    expr.node = expr.node.object;
    return findCallers_(srv, query, expr, p);
  } else if (expr && expr.node.type == "ObjectExpression") {
    var pos = tern.resolvePos(file, query.end);
    for (var i = 0; i < expr.node.properties.length; ++i) {
      var k = expr.node.properties[i].key;
      if (k.start <= pos && k.end >= pos) return findCallers_(srv, query, expr, k);
    }
  } else if (expr && expr.node.type == "MethodDefinition") {
    var p = expr.node.key;
    return findCallers_(srv, query, expr, p);
  }
}

function findCallees(server, query, file) {

  return {
    calls: [/* {
            name: "testCallee",
            start: 10,
            end: 20,
            type: "method",
            javadoc: "jdoc",
            returnType: "LObject;",
            signature: "?fn(String,Array,MyClass",
            isConstructor: false,
            params: [
            { name: "foo", type: "LString;"},
            { name: "bar", type: "[Array"},
            ],
            positions: [
            {start: 6, end: 12, line: 2},
            {start: 24, end: 26, line: 4}
            ]
            }*/]
  };
}

},{"acorn/dist/walk":undefined,"tern/lib/infer":undefined,"tern/lib/tern":undefined}],2:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.create = create;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _ternLibTern = _dereq_("tern/lib/tern");

var tern = _interopRequireWildcard(_ternLibTern);

function processProperty(file, prop, parent, level) {
  if (prop.origin == file.name) {
    var child = {
      name: prop.propertyName,
      type: prop.types.length > 0 ? prop.types.join('|') : "?",
      start: prop.originNode ? prop.originNode.start : -1,
      end: prop.originNode ? prop.originNode.end : -1
    };
    for (var typeNr in prop.types) {
      var type = prop.types[typeNr];
      gather(file, type, child, level);
    }

    var children = parent;
    if (!(children instanceof Array)) {
      if (children.children) {
        children = children.children;
      } else {
        children = children.children = [];
      }
    }

    children.push(child);
  }
}

function gather(file, node, parent, level) {
  if (level++ > 10) return;
  for (var propName in node.props) {
    processProperty(file, node.props[propName], parent, level);
  }
  for (var propName in node.maybeProps) {
    processProperty(file, node.maybeProps[propName], parent, level);
  }
}

function create(query, file) {
  try {
    var outline = [],
        scope = file.scope;
    gather(file, scope, outline, 0);
    return { outline: outline };
  } catch (err) {
    console.error(err, err.stack);
    return { outline: [] };
  }
}

},{"tern/lib/tern":undefined}],3:[function(_dereq_,module,exports){
"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _ternLibTern = _dereq_("tern/lib/tern");

var tern = _interopRequireWildcard(_ternLibTern);

var _call_hierarchyJs = _dereq_("./call_hierarchy.js");

var call_hierarchy = _interopRequireWildcard(_call_hierarchyJs);

var _outlineJs = _dereq_("./outline.js");

var outline = _interopRequireWildcard(_outlineJs);

tern.defineQueryType("call-hierarchy-roots", {
  takesFile: true,
  run: function run(server, query, file) {
    return call_hierarchy.findRoots(server, query, file);
  }
});

tern.defineQueryType("call-hierarchy-callers", {
  takesFile: true,
  run: function run(server, query, file) {
    return call_hierarchy.findCallers(server, query, file);
  }
});

tern.defineQueryType("call-hierarchy-callees", {
  takesFile: true,
  run: function run(server, query, file) {
    return call_hierarchy.findCallees(server, query, file);
  }
});

tern.defineQueryType("webclipse-outline", {
  takesFile: true,
  run: function run(server, query, file) {
    return outline.create(query, file);
  }
});

tern.registerPlugin("webclipse", function (server, options) {
  server._webclipse = {};
});

},{"./call_hierarchy.js":1,"./outline.js":2,"tern/lib/tern":undefined}]},{},[3])(3)
});