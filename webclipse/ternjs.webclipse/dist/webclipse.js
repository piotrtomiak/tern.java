(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}(g.tern || (g.tern = {})).webclipse = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";

var _state = _dereq_("./state");

var _parseutil = _dereq_("./parseutil");

var _acornDistAcorn = _dereq_("acorn/dist/acorn");

var lp = _state.SyntaxValidator.prototype;

lp.checkLVal = function (expr, binding) {
  if (!expr) return expr;
  switch (expr.type) {
    case "Identifier":
      return expr;

    case "MemberExpression":
      return binding ? this.dummyIdent("Member identifier was not expected") : expr;

    case "ParenthesizedExpression":
      expr.expression = this.checkLVal(expr.expression, binding);
      return expr;

    // FIXME recursively check contents
    case "ObjectPattern":
    case "ArrayPattern":
    case "RestElement":
    case "AssignmentPattern":
      if (this.options.ecmaVersion >= 6) return expr;

    default:
      return this.dummyIdent("Left-hand operand expected.");
  }
};

lp.parseExpression = function (noIn) {
  var start = this.storeCurrentPos();
  var expr = this.parseMaybeAssign(noIn);
  if (this.tok.type === _acornDistAcorn.tokTypes.comma) {
    var node = this.startNodeAt(start);
    node.expressions = [expr];
    while (this.eat(_acornDistAcorn.tokTypes.comma)) node.expressions.push(this.parseMaybeAssign(noIn));
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};

lp.parseParenExpression = function () {
  this.pushCx();
  var startToken = this.tok;
  if (this.expect(_acornDistAcorn.tokTypes.parenL)) {
    var val = this.parseExpression();
    if (!this.canEat(_acornDistAcorn.tokTypes.parenR)) {
      this.reportError("Missing closing ')'", startToken.start, startToken.end);
    }
    this.expect(_acornDistAcorn.tokTypes.parenR);
  }
  this.popCx();
  return val;
};

lp.parseMaybeAssign = function (noIn) {
  var start = this.storeCurrentPos();
  var left = this.parseMaybeConditional(noIn);
  if (this.tok.type.isAssign) {
    var node = this.startNodeAt(start);
    node.operator = this.tok.value;
    node.left = this.tok.type === _acornDistAcorn.tokTypes.eq ? this.toAssignable(left) : this.checkLVal(left);
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression");
  }
  return left;
};

lp.parseMaybeConditional = function (noIn) {
  var start = this.storeCurrentPos();
  var expr = this.parseExprOps(noIn);
  if (this.eat(_acornDistAcorn.tokTypes.question)) {
    var node = this.startNodeAt(start);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    node.alternate = this.expect(_acornDistAcorn.tokTypes.colon) ? this.parseMaybeAssign(noIn) : this.dummyIdent("Incomplete conditional expression. Missing ':'.");
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};

lp.parseExprOps = function (noIn) {
  var start = this.storeCurrentPos();
  return this.parseExprOp(this.parseMaybeUnary(noIn), start, -1, noIn);
};

lp.parseExprOp = function (left, start, minPrec, noIn) {
  var prec = this.tok.type.binop;
  if (prec != null && (!noIn || this.tok.type !== _acornDistAcorn.tokTypes._in)) {
    if (prec > minPrec) {
      var node = this.startNodeAt(start);
      node.left = left;
      node.operator = this.tok.value;
      this.next();
      var rightStart = this.storeCurrentPos();
      node.right = this.parseExprOp(this.parseMaybeUnary(noIn), rightStart, prec, noIn);
      this.finishNode(node, /&&|\|\|/.test(node.operator) ? "LogicalExpression" : "BinaryExpression");
      return this.parseExprOp(node, start, minPrec, noIn);
    }
  }
  return left;
};

lp.parseMaybeUnary = function (noIn) {
  if (this.tok.type.prefix) {
    var node = this.startNode(),
        update = this.tok.type === _acornDistAcorn.tokTypes.incDec;
    node.operator = this.tok.value;
    node.prefix = true;
    this.next();
    node.argument = this.parseMaybeUnary(noIn);
    if (update) node.argument = this.checkLVal(node.argument);
    return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  } else if (this.tok.type === _acornDistAcorn.tokTypes.ellipsis) {
    var node = this.startNode();
    this.next();
    node.argument = this.parseMaybeUnary(noIn);
    return this.finishNode(node, "SpreadElement");
  }
  var start = this.storeCurrentPos();
  var expr = this.parseExprSubscripts();
  while (this.tok.type.postfix && !this.canInsertSemicolon()) {
    var node = this.startNodeAt(start);
    node.operator = this.tok.value;
    node.prefix = false;
    node.argument = this.checkLVal(expr);
    this.next();
    expr = this.finishNode(node, "UpdateExpression");
  }
  return expr;
};

lp.parseExprSubscripts = function () {
  var start = this.storeCurrentPos();
  return this.parseSubscripts(this.parseExprAtom(), start, false);
};

lp.parseSubscripts = function (base, start, noCalls) {
  for (;;) {

    if (this.eat(_acornDistAcorn.tokTypes.dot)) {
      var node = this.startNodeAt(start);
      node.object = base;
      node.property = this.parsePropertyAccessor() || this.dummyIdent("Missing member identifier");
      node.computed = false;
      base = this.finishNode(node, "MemberExpression");
    } else if (this.tok.type == _acornDistAcorn.tokTypes.bracketL) {
      this.pushCx();
      this.next();
      var node = this.startNodeAt(start);
      node.object = base;
      node.property = this.parseExpression();
      node.computed = true;
      this.popCx();
      this.expect(_acornDistAcorn.tokTypes.bracketR);
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.tok.type == _acornDistAcorn.tokTypes.parenL) {
      var node = this.startNodeAt(start);
      node.callee = base;
      node.arguments = this.parseExprList(_acornDistAcorn.tokTypes.parenR);
      base = this.finishNode(node, "CallExpression");
    } else if (this.tok.type == _acornDistAcorn.tokTypes.backQuote) {
      var node = this.startNodeAt(start);
      node.tag = base;
      node.quasi = this.parseTemplate();
      base = this.finishNode(node, "TaggedTemplateExpression");
    } else {
      return base;
    }
  }
};

lp.parseExprAtom = function () {
  var node = undefined;
  switch (this.tok.type) {
    case _acornDistAcorn.tokTypes._this:
    case _acornDistAcorn.tokTypes._super:
      var type = this.tok.type === _acornDistAcorn.tokTypes._this ? "ThisExpression" : "Super";
      node = this.startNode();
      this.next();
      return this.finishNode(node, type);

    case _acornDistAcorn.tokTypes.name:
      var start = this.storeCurrentPos();
      var id = this.parseIdent();
      return this.eat(_acornDistAcorn.tokTypes.arrow) ? this.parseArrowExpression(this.startNodeAt(start), [id]) : id;

    case _acornDistAcorn.tokTypes.regexp:
      node = this.startNode();
      var val = this.tok.value;
      node.regex = { pattern: val.pattern, flags: val.flags };
      node.value = val.value;
      node.raw = this.input.slice(this.tok.start, this.tok.end);
      this.next();
      return this.finishNode(node, "Literal");

    case _acornDistAcorn.tokTypes.num:case _acornDistAcorn.tokTypes.string:
      node = this.startNode();
      node.value = this.tok.value;
      node.raw = this.input.slice(this.tok.start, this.tok.end);
      this.next();
      return this.finishNode(node, "Literal");

    case _acornDistAcorn.tokTypes._null:case _acornDistAcorn.tokTypes._true:case _acornDistAcorn.tokTypes._false:
      node = this.startNode();
      node.value = this.tok.type === _acornDistAcorn.tokTypes._null ? null : this.tok.type === _acornDistAcorn.tokTypes._true;
      node.raw = this.tok.type.keyword;
      this.next();
      return this.finishNode(node, "Literal");

    case _acornDistAcorn.tokTypes.parenL:
      var parenStart = this.storeCurrentPos();
      this.next();
      var inner = this.parseExpression();
      this.expect(_acornDistAcorn.tokTypes.parenR);
      if (this.eat(_acornDistAcorn.tokTypes.arrow)) {
        return this.parseArrowExpression(this.startNodeAt(parenStart), inner.expressions || (_parseutil.isDummy(inner) ? [] : [inner]));
      }
      if (this.options.preserveParens) {
        var par = this.startNodeAt(parenStart);
        par.expression = inner;
        inner = this.finishNode(par, "ParenthesizedExpression");
      }
      return inner;

    case _acornDistAcorn.tokTypes.bracketL:
      node = this.startNode();
      node.elements = this.parseExprList(_acornDistAcorn.tokTypes.bracketR, true);
      return this.finishNode(node, "ArrayExpression");

    case _acornDistAcorn.tokTypes.braceL:
      return this.parseObj();

    case _acornDistAcorn.tokTypes._class:
      return this.parseClass();

    case _acornDistAcorn.tokTypes._function:
      node = this.startNode();
      this.next();
      return this.parseFunction(node, false);

    case _acornDistAcorn.tokTypes._new:
      return this.parseNew();

    case _acornDistAcorn.tokTypes._yield:
      node = this.startNode();
      this.next();
      if (this.type == this.tok.type.semi || this.canInsertSemicolon() || this.tok.type != _acornDistAcorn.tokTypes.star && !this.tok.type.startsExpr) {
        node.delegate = false;
        node.argument = null;
      } else {
        node.delegate = this.eat(_acornDistAcorn.tokTypes.star);
        node.argument = this.parseMaybeAssign();
      }
      return this.finishNode(node, "YieldExpression");

    case _acornDistAcorn.tokTypes.backQuote:
      return this.parseTemplate();

    default:
      return this.dummyIdent("Empty expression");
  }
};

lp.parseNew = function () {
  var node = this.startNode();
  var meta = this.parseIdent(true);
  if (this.options.ecmaVersion >= 6 && this.eat(_acornDistAcorn.tokTypes.dot)) {
    node.meta = meta;
    node.property = this.parseIdent(true);
    return this.finishNode(node, "MetaProperty");
  }
  var start = this.storeCurrentPos();
  node.callee = this.parseSubscripts(this.parseExprAtom(), start, true);
  if (this.tok.type == _acornDistAcorn.tokTypes.parenL) {
    node.arguments = this.parseExprList(_acornDistAcorn.tokTypes.parenR);
  } else {
    node.arguments = [];
  }
  return this.finishNode(node, "NewExpression");
};

lp.parseTemplateElement = function () {
  var elem = this.startNode();
  elem.value = {
    raw: this.input.slice(this.tok.start, this.tok.end).replace(/\r\n?/g, '\n'),
    cooked: this.tok.value
  };
  this.next();
  elem.tail = this.tok.type === _acornDistAcorn.tokTypes.backQuote;
  return this.finishNode(elem, "TemplateElement");
};

lp.parseTemplate = function () {
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement();
  node.quasis = [curElt];
  while (!curElt.tail) {
    this.next();
    node.expressions.push(this.parseExpression());
    if (this.expect(_acornDistAcorn.tokTypes.braceR)) {
      curElt = this.parseTemplateElement();
    } else {
      curElt = this.startNode();
      curElt.value = { cooked: '', raw: '' };
      curElt.tail = true;
    }
    node.quasis.push(curElt);
  }
  this.expect(_acornDistAcorn.tokTypes.backQuote);
  return this.finishNode(node, "TemplateLiteral");
};

lp.parseObj = function () {
  var node = this.startNode();
  node.properties = [];
  this.pushCx();
  this.eat(_acornDistAcorn.tokTypes.braceL);
  while (!this.closes(_acornDistAcorn.tokTypes.braceR)) {
    var prop = this.startNode(),
        isGenerator = undefined,
        start = undefined;
    if (this.options.ecmaVersion >= 6) {
      start = this.storeCurrentPos();
      prop.method = false;
      prop.shorthand = false;
      isGenerator = this.eat(_acornDistAcorn.tokTypes.star);
    }
    this.parsePropertyName(prop);
    if (_parseutil.isDummy(prop.key)) {
      if (_parseutil.isDummy(this.parseMaybeAssign())) this.next();this.eat(_acornDistAcorn.tokTypes.comma);continue;
    }
    if (this.eat(_acornDistAcorn.tokTypes.colon)) {
      prop.kind = "init";
      prop.value = this.parseMaybeAssign();
    } else if (this.options.ecmaVersion >= 6 && (this.tok.type === _acornDistAcorn.tokTypes.parenL || this.tok.type === _acornDistAcorn.tokTypes.braceL)) {
      prop.kind = "init";
      prop.method = true;
      prop.value = this.parseMethod(isGenerator);
    } else if (this.options.ecmaVersion >= 5 && prop.key.type === "Identifier" && !prop.computed && (prop.key.name === "get" || prop.key.name === "set") && this.tok.type != _acornDistAcorn.tokTypes.comma && this.tok.type != _acornDistAcorn.tokTypes.braceR) {
      prop.kind = prop.key.name;
      this.parsePropertyName(prop);
      prop.value = this.parseMethod(false);
    } else {
      prop.kind = "init";
      if (this.options.ecmaVersion >= 6) {
        if (this.eat(_acornDistAcorn.tokTypes.eq)) {
          var assign = this.startNodeAt(start);
          assign.operator = "=";
          assign.left = prop.key;
          assign.right = this.parseMaybeAssign();
          prop.value = this.finishNode(assign, "AssignmentExpression");
        } else {
          prop.value = prop.key;
        }
      } else {
        prop.value = this.dummyIdent("Missing property value");
      }
      prop.shorthand = true;
    }
    node.properties.push(this.finishNode(prop, "Property"));
    this.eat(_acornDistAcorn.tokTypes.comma);
  }
  this.popCx();
  if (!this.eat(_acornDistAcorn.tokTypes.braceR)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
  }
  return this.finishNode(node, "ObjectExpression");
};

lp.parsePropertyName = function (prop) {
  if (this.options.ecmaVersion >= 6) {
    if (this.eat(_acornDistAcorn.tokTypes.bracketL)) {
      prop.computed = true;
      prop.key = this.parseExpression();
      this.expect(_acornDistAcorn.tokTypes.bracketR);
      return;
    } else {
      prop.computed = false;
    }
  }
  var key = this.tok.type === _acornDistAcorn.tokTypes.num || this.tok.type === _acornDistAcorn.tokTypes.string ? this.parseExprAtom() : this.parseIdent();
  return prop.key = key || this.dummyIdent("Missing object property name.");
};

lp.parsePropertyAccessor = function () {
  if (this.tok.type === _acornDistAcorn.tokTypes.name || this.tok.type.keyword) return this.parseIdent();
};

lp.parseIdent = function () {
  var name = this.tok.type === _acornDistAcorn.tokTypes.name ? this.tok.value : this.tok.type.keyword;
  if (!name) return this.dummyIdent("Missing identifier");
  if (this.options.ecmaVersion < 6 && "let" == name) {
    this.reportError("'let' keyword is not allowed if ECMAScript version is lower than 6", this.tok.start, this.tok.end);
  }
  var node = this.startNode();
  this.next();
  node.name = name;
  return this.finishNode(node, "Identifier");
};

lp.initFunction = function (node) {
  node.id = null;
  node.params = [];
  if (this.options.ecmaVersion >= 6) {
    node.generator = false;
    node.expression = false;
  }
};

// Convert existing expression atom to assignable pattern
// if possible.

lp.toAssignable = function (node, binding) {
  if (this.options.ecmaVersion >= 6 && node) {
    switch (node.type) {
      case "ObjectExpression":
        node.type = "ObjectPattern";
        var props = node.properties;
        for (var i = 0; i < props.length; i++) {
          this.toAssignable(props[i].value, binding);
        }
        break;

      case "ArrayExpression":
        node.type = "ArrayPattern";
        this.toAssignableList(node.elements, binding);
        break;

      case "SpreadElement":
        node.type = "RestElement";
        node.argument = this.toAssignable(node.argument, binding);
        break;

      case "AssignmentExpression":
        node.type = "AssignmentPattern";
        delete node.operator;
        break;
    }
  }
  return this.checkLVal(node, binding);
};

lp.toAssignableList = function (exprList, binding) {
  for (var i = 0; i < exprList.length; i++) {
    exprList[i] = this.toAssignable(exprList[i], binding);
  }return exprList;
};

lp.parseFunctionParams = function (params) {
  if (this.tok.type == _acornDistAcorn.tokTypes.parenL) {
    params = this.parseExprList(_acornDistAcorn.tokTypes.parenR);
    return this.toAssignableList(params, true);
  } else {
    this.reportError("Expected function parameters list", this.tok.start, this.tok.end);
    return this.dummyIdent("Expected function parameters list");
  }
};

lp.parseMethod = function (isGenerator) {
  var node = this.startNode();
  this.initFunction(node);
  node.params = this.parseFunctionParams();
  node.generator = isGenerator || false;
  node.expression = this.options.ecmaVersion >= 6 && this.tok.type !== _acornDistAcorn.tokTypes.braceL;
  node.body = node.expression ? this.parseMaybeAssign() : this.parseBlock();
  return this.finishNode(node, "FunctionExpression");
};

lp.parseArrowExpression = function (node, params) {
  this.initFunction(node);
  node.params = this.toAssignableList(params, true);
  node.expression = this.tok.type !== _acornDistAcorn.tokTypes.braceL;
  node.body = node.expression ? this.parseMaybeAssign() : this.parseBlock();
  return this.finishNode(node, "ArrowFunctionExpression");
};

lp.parseExprList = function (close, allowEmpty) {
  this.pushCx();
  var elts = [];
  var startTok = this.tok;
  this.next(); // Opening bracket
  var endsWithComma = false;
  while (!this.closes(close)) {
    if (this.canEat(_acornDistAcorn.tokTypes.comma)) {
      elts.push(allowEmpty ? null : this.dummyIdent("Missing expression"));
      this.eat(_acornDistAcorn.tokTypes.comma);
      continue;
    }
    var elt = this.parseMaybeAssign();
    if (_parseutil.isDummy(elt)) {
      if (this.closes(close)) break;
      this.next();
    } else {
      elts.push(elt);
    }
    endsWithComma = this.eat(_acornDistAcorn.tokTypes.comma);
  }
  if (endsWithComma) {
    elts.push(allowEmpty ? null : this.dummyIdent("Missing expression"));
  }
  this.popCx();
  if (!this.eat(close)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.reportError("Missing closing '" + close.label + "'", startTok.start, startTok.end);
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
  }
  return elts;
};

},{"./parseutil":3,"./state":4,"acorn/dist/acorn":undefined}],2:[function(_dereq_,module,exports){
// Acorn: Syntax Validator
//
// This module is based on an alternative parser (`parse_dammit`) and
// performs syntax validation

"use strict";

exports.__esModule = true;
exports.validate_syntax = validate_syntax;
exports.validateFile = validateFile;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _acornDistAcorn = _dereq_("acorn/dist/acorn");

var acorn = _interopRequireWildcard(_acornDistAcorn);

var _state = _dereq_("./state");

var _ternLibTern = _dereq_("tern/lib/tern");

var tern = _interopRequireWildcard(_ternLibTern);

_dereq_("./tokenize");

_dereq_("./statement");

_dereq_("./expression");

exports.SyntaxValidator = _state.SyntaxValidator;
exports.pluginsSyntaxVal = _state.pluginsSyntaxVal;

acorn.defaultOptions.tabSize = 4;

function validate_syntax(input, options) {
  var messages = {};
  var p = new _state.SyntaxValidator(input, options, messages);
  p.next();
  p.validateTopLevel();
  return messages;
}

//Validator
function validate(server, query, file, messages, strictParserError) {
  function makeError(msg, start, end) {
    if (start > end) {
      var tmp = start;
      start = end;
      end = tmp;
    }
    if (start == end) {
      end = start + 1;
    }
    if (end >= file.text.length) {
      end = file.text.length;
      if (start >= end) {
        start = end - 1;
      }
    }
    var error = {
      message: msg,
      from: tern.outputPos(query, file, start),
      to: tern.outputPos(query, file, end),
      severity: "error"
    };
    if (query.lineNumber) {
      error.lineNumber = 1 + query.lineCharPositions ? error.from.line : tern.outputPos({ lineCharPositions: true }, file, start).line;
    }
    if (!query.groupByFiles) error.file = file.name;
    return error;
  }

  var options = {
    directSourceFile: file,
    allowReturnOutsideFunction: true,
    allowImportExportEverywhere: true,
    ecmaVersion: server.options.ecmaVersion
  };
  var text = server.signalReturnFirst("preParse", file.text, options) || file.text;
  text = tern.removeShebang(text);
  var err_msgs = validate_syntax(text, options);
  /* for debugging purposes
  if (strictParserError && !err_msgs[strictParserError.pos]) {
    err_msgs[strictParserError.pos] = {
        message: "[Raw] " + strictParserError.message.replace(/\(\d*\:\d*\)$/, ""),
        start: strictParserError.pos,
        end: strictParserError.raisedAt
    }
  } */
  for (var id in err_msgs) {
    var msg = err_msgs[id];
    messages.push(makeError(msg.message, msg.start, msg.end));
  }
  if (messages.length == 0 && strictParserError) {
    messages.push(makeError(strictParserError.message.replace(/\(\d*\:\d*\)$/, "[Strict]"), strictParserError.pos, strictParserError.raisedAt));
  }
}

// Validate one file

function validateFile(server, query, file) {
  try {
    var messages = [],
        ast = file.ast,
        state = file.scope;
    // if (ast.error) {
    validate(server, query, file, messages, ast.error);
    // }
    return { messages: messages };
  } catch (err) {
    console.error(err.stack);
    return { messages: [] };
  }
}

acorn.validate_syntax = validate_syntax;
acorn.SyntaxValidator = _state.SyntaxValidator;
acorn.pluginsSyntaxVal = _state.pluginsSyntaxVal;

},{"./expression":1,"./state":4,"./statement":5,"./tokenize":6,"acorn/dist/acorn":undefined,"tern/lib/tern":undefined}],3:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.isDummy = isDummy;

function isDummy(node) {
  return node.name == "✖";
}

},{}],4:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _acornDistAcorn = _dereq_("acorn/dist/acorn");

var _acornDistWalk = _dereq_("acorn/dist/walk");

// Registered plugins
var pluginsSyntaxVal = {};

exports.pluginsSyntaxVal = pluginsSyntaxVal;

var SyntaxValidator = (function () {
  function SyntaxValidator(input, options, messages) {
    _classCallCheck(this, SyntaxValidator);

    this.messages = messages;
    this.toks = _acornDistAcorn.tokenizer(input, options);
    this.options = this.toks.options;
    this.input = this.toks.input;
    this.tok = this.last = { type: _acornDistAcorn.tokTypes.eof, start: 0, end: 0 };
    if (this.options.locations) {
      var here = this.toks.curPosition();
      this.tok.loc = new _acornDistAcorn.SourceLocation(this.toks, here, here);
    }
    this.ahead = []; // Tokens ahead
    // Load plugins
    this.options.pluginsSyntaxVal = options.pluginsSyntaxVal || {};
    this.loadPlugins(this.options.pluginsSyntaxVal);
  }

  SyntaxValidator.prototype.reportError = function reportError(message, start, end) {
    start = start || this.tok.start;
    end = end || this.tok.end;
    if (end < start) {
      var tmp = end;
      end = start;
      start = tmp;
    }
    this.messages[start] = {
      message: message,
      start: start,
      end: end
    };
  };

  SyntaxValidator.prototype.startNode = function startNode() {
    return new _acornDistAcorn.Node(this.toks, this.tok.start, this.options.locations ? this.tok.loc.start : null);
  };

  SyntaxValidator.prototype.storeCurrentPos = function storeCurrentPos() {
    return this.options.locations ? [this.tok.start, this.tok.loc.start] : this.tok.start;
  };

  SyntaxValidator.prototype.startNodeAt = function startNodeAt(pos) {
    if (this.options.locations) {
      return new _acornDistAcorn.Node(this.toks, pos[0], pos[1]);
    } else {
      return new _acornDistAcorn.Node(this.toks, pos);
    }
  };

  SyntaxValidator.prototype.finishNode = function finishNode(node, type) {
    node.type = type;
    node.end = this.last.end;
    if (this.options.locations) node.loc.end = this.last.loc.end;
    if (this.options.ranges) node.range[1] = this.last.end;
    return node;
  };

  SyntaxValidator.prototype.dummyIdent = function dummyIdent(message) {
    if (!message) {
      throw new Error("No message!");
    }
    var dummy = this.startNode();
    dummy.name = "✖";
    dummy.error = {
      message: message,
      start: this.tok.start,
      end: this.tok.end
    };
    return this.finishNode(dummy, "Identifier");
  };

  SyntaxValidator.prototype.dummyString = function dummyString(message) {
    if (!message) {
      throw new Error("No message!");
    }
    var dummy = this.startNode();
    dummy.value = dummy.raw = "✖";
    dummy.error = {
      message: message,
      start: this.tok.start,
      end: this.tok.end
    };
    return this.finishNode(dummy, "Literal");
  };

  SyntaxValidator.prototype.isUseStrict = function isUseStrict(stmt) {
    return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.raw.slice(1, -1) === "use strict";
  };

  SyntaxValidator.prototype.canEat = function canEat(type) {
    return this.tok.type === type;
  };

  SyntaxValidator.prototype.eat = function eat(type) {
    if (this.tok.type === type) {
      this.next();
      return true;
    } else {
      return false;
    }
  };

  SyntaxValidator.prototype.isContextual = function isContextual(name) {
    return this.tok.type === _acornDistAcorn.tokTypes.name && this.tok.value === name;
  };

  SyntaxValidator.prototype.eatContextual = function eatContextual(name) {
    return this.tok.value === name && this.eat(_acornDistAcorn.tokTypes.name);
  };

  SyntaxValidator.prototype.expectContextual = function expectContextual(name) {
    if (this.eatContextual(name)) return true;
    this.reportError("Expected name '" + name + "'");
    for (var i = 1; i <= 2; i++) {
      var ahead = this.lookAhead(i);
      if (ahead.type === _acornDistAcorn.tokTypes.name && ahead.value === name) {
        for (var j = 0; j < i; j++) {
          this.next();
        }return true;
      }
    }
  };

  SyntaxValidator.prototype.canInsertSemicolon = function canInsertSemicolon() {
    return this.tok.type === _acornDistAcorn.tokTypes.eof || this.tok.type === _acornDistAcorn.tokTypes.braceR || _acornDistAcorn.lineBreak.test(this.input.slice(this.last.end, this.tok.start));
  };

  SyntaxValidator.prototype.insertSemicolon = function insertSemicolon() {
    if (this.canInsertSemicolon()) {
      if (this.options.onInsertedSemicolon) this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc);
      return true;
    }
  };

  SyntaxValidator.prototype.semicolon = function semicolon() {
    var isOk = this.eat(_acornDistAcorn.tokTypes.semi) || this.insertSemicolon();
    if (!isOk) {
      this.reportError("Expected end of statement or expression.", this.tok.start, this.tok.end);
    }
    return isOk;
  };

  SyntaxValidator.prototype.expect = function expect(type) {
    if (this.eat(type)) return true;
    this.reportError("Expected '" + type.label + "', but found '" + this.tok.type.label + "' instead");
    for (var i = 1; i <= 2; i++) {
      if (this.lookAhead(i).type == type) {
        for (var j = 0; j < i; j++) {
          this.next();
        }return true;
      }
    }
  };

  SyntaxValidator.prototype.pushCx = function pushCx() {};

  SyntaxValidator.prototype.popCx = function popCx() {};

  SyntaxValidator.prototype.lineEnd = function lineEnd(pos) {
    while (pos < this.input.length && !_acornDistAcorn.isNewLine(this.input.charCodeAt(pos))) ++pos;
    return pos;
  };

  SyntaxValidator.prototype.closes = function closes(closeTok) {
    if (this.tok.type === closeTok || this.tok.type === _acornDistAcorn.tokTypes.eof) return true;
    return false;
  };

  SyntaxValidator.prototype.visitErrorNodes = function visitErrorNodes(program) {
    var parser = this;

    (function c(node, st, override) {
      var type = override || node.type;
      if (node.name == "✖" || node.value == "✖") {
        if (node.error) {
          parser.reportError(node.error.message, node.start, node.end);
        }
      } else {
        _acornDistWalk.base[type](node, st, c);
      }
    })(program, null, null);
  };

  SyntaxValidator.prototype.extend = function extend(name, f) {
    this[name] = f(this[name]);
  };

  SyntaxValidator.prototype.loadPlugins = function loadPlugins(pluginConfigs) {
    for (var _name in pluginConfigs) {
      var plugin = pluginsSyntaxVal[_name];
      if (!plugin) throw new Error("Plugin '" + _name + "' not found");
      plugin(this, pluginConfigs[_name]);
    }
  };

  return SyntaxValidator;
})();

exports.SyntaxValidator = SyntaxValidator;

},{"acorn/dist/acorn":undefined,"acorn/dist/walk":undefined}],5:[function(_dereq_,module,exports){
"use strict";

var _state = _dereq_("./state");

var _parseutil = _dereq_("./parseutil");

var _acornDistAcorn = _dereq_("acorn/dist/acorn");

var lp = _state.SyntaxValidator.prototype;

lp.validateTopLevel = function () {
  var first = true;
  var node = this.startNodeAt(this.options.locations ? [0, _acornDistAcorn.getLineInfo(this.input, 0)] : 0);
  node.body = [];
  while (this.tok.type !== _acornDistAcorn.tokTypes.eof) {
    var stmt = this.parseStatement(true, true);
    node.body.push(stmt);
    if (first) {
      //      if (this.isUseStrict(stmt)) this.setStrict(true)
      first = false;
    }
  }
  this.last = this.tok;
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType;
  }
  this.visitErrorNodes(this.finishNode(node, "Program"));
};

lp.parseStatement = function (declaration, topLevel) {
  var starttype = this.tok.type,
      node = this.startNode();

  switch (starttype) {
    case _acornDistAcorn.tokTypes._break:case _acornDistAcorn.tokTypes._continue:
      this.next();
      var isBreak = starttype === _acornDistAcorn.tokTypes._break;
      if (this.eat(_acornDistAcorn.tokTypes.semi) || this.canInsertSemicolon()) {
        node.label = null;
      } else {
        node.label = this.tok.type === _acornDistAcorn.tokTypes.name ? this.parseIdent() : null;
        if (node.label == null) {
          this.reportError("Label expected");
        } else {
          this.semicolon();
        }
      }
      return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

    case _acornDistAcorn.tokTypes._debugger:
      this.next();
      this.semicolon();
      return this.finishNode(node, "DebuggerStatement");

    case _acornDistAcorn.tokTypes._do:
      this.next();
      node.body = this.parseStatement();
      node.test = this.eat(_acornDistAcorn.tokTypes._while) ? this.parseParenExpression() : this.dummyIdent("missing while statement");
      this.semicolon();
      return this.finishNode(node, "DoWhileStatement");

    case _acornDistAcorn.tokTypes._for:
      this.next();
      this.pushCx();
      this.expect(_acornDistAcorn.tokTypes.parenL);
      if (this.tok.type === _acornDistAcorn.tokTypes.semi) return this.parseFor(node, null);
      if (this.tok.type === _acornDistAcorn.tokTypes._var || this.tok.type === _acornDistAcorn.tokTypes._let || this.tok.type === _acornDistAcorn.tokTypes._const) {
        var _init = this.parseVar(true);
        if (_init.declarations.length === 1 && (this.tok.type === _acornDistAcorn.tokTypes._in || this.isContextual("of"))) {
          return this.parseForIn(node, _init);
        }
        return this.parseFor(node, _init);
      }
      var init = this.parseExpression(true);
      if (this.tok.type === _acornDistAcorn.tokTypes._in || this.isContextual("of")) return this.parseForIn(node, this.toAssignable(init));
      return this.parseFor(node, init);

    case _acornDistAcorn.tokTypes._function:
      this.next();
      return this.parseFunction(node, true);

    case _acornDistAcorn.tokTypes._if:
      this.next();
      node.test = this.parseParenExpression();
      node.consequent = this.parseStatement();
      node.alternate = this.eat(_acornDistAcorn.tokTypes._else) ? this.parseStatement() : null;
      return this.finishNode(node, "IfStatement");

    case _acornDistAcorn.tokTypes._return:
      this.next();
      if (this.eat(_acornDistAcorn.tokTypes.semi) || this.canInsertSemicolon()) node.argument = null;else {
        node.argument = this.parseExpression();this.semicolon();
      }
      return this.finishNode(node, "ReturnStatement");

    case _acornDistAcorn.tokTypes._switch:
      this.next();
      node.discriminant = this.parseParenExpression();
      node.cases = [];
      this.pushCx();
      this.expect(_acornDistAcorn.tokTypes.braceL);

      var cur = undefined;
      while (!this.closes(_acornDistAcorn.tokTypes.braceR)) {
        if (this.tok.type === _acornDistAcorn.tokTypes._case || this.tok.type === _acornDistAcorn.tokTypes._default) {
          var isCase = this.tok.type === _acornDistAcorn.tokTypes._case;
          if (cur) this.finishNode(cur, "SwitchCase");
          node.cases.push(cur = this.startNode());
          cur.consequent = [];
          this.next();
          if (isCase) cur.test = this.parseExpression();else cur.test = null;
          this.expect(_acornDistAcorn.tokTypes.colon);
        } else {
          if (!cur) {
            node.cases.push(cur = this.startNode());
            cur.consequent = [];
            cur.test = null;
          }
          cur.consequent.push(this.parseStatement());
        }
      }
      if (cur) this.finishNode(cur, "SwitchCase");
      this.popCx();
      this.eat(_acornDistAcorn.tokTypes.braceR);
      return this.finishNode(node, "SwitchStatement");

    case _acornDistAcorn.tokTypes._throw:
      this.next();
      node.argument = this.parseExpression();
      this.semicolon();
      return this.finishNode(node, "ThrowStatement");

    case _acornDistAcorn.tokTypes._try:
      this.next();
      node.block = this.parseBlock();
      node.handler = null;
      if (this.tok.type === _acornDistAcorn.tokTypes._catch) {
        var clause = this.startNode();
        this.next();
        this.expect(_acornDistAcorn.tokTypes.parenL);
        clause.param = this.toAssignable(this.parseExprAtom(), true);
        this.expect(_acornDistAcorn.tokTypes.parenR);
        clause.guard = null;
        clause.body = this.parseBlock();
        node.handler = this.finishNode(clause, "CatchClause");
      }
      node.finalizer = this.eat(_acornDistAcorn.tokTypes._finally) ? this.parseBlock() : null;
      if (!node.handler && !node.finalizer) return node.block;
      return this.finishNode(node, "TryStatement");

    case _acornDistAcorn.tokTypes._let:
      if (this.options.ecmaVersion < 6) {
        this.reportError("'let' keyword is not allowed if ECMAScript version is lower than 6", this.tok.start, this.tok.end);
      }
    case _acornDistAcorn.tokTypes._var:
    case _acornDistAcorn.tokTypes._const:
      return this.parseVar();

    case _acornDistAcorn.tokTypes._while:
      this.next();
      node.test = this.parseParenExpression();
      node.body = this.parseStatement();
      return this.finishNode(node, "WhileStatement");

    case _acornDistAcorn.tokTypes._with:
      this.next();
      node.object = this.parseParenExpression();
      node.body = this.parseStatement();
      return this.finishNode(node, "WithStatement");

    case _acornDistAcorn.tokTypes.braceL:
      return this.parseBlock();

    case _acornDistAcorn.tokTypes.semi:
      this.next();
      return this.finishNode(node, "EmptyStatement");

    case _acornDistAcorn.tokTypes._class:
      return this.parseClass(true);

    case _acornDistAcorn.tokTypes._import:
      return this.parseImport();

    case _acornDistAcorn.tokTypes._export:
      return this.parseExport();

    case _acornDistAcorn.tokTypes.braceR:
      this.reportError("Closing brace without opening brace.", this.tok.start, this.tok.end);
      this.next();
      if (this.tok.type === _acornDistAcorn.tokTypes.eof) return this.finishNode(node, "EmptyStatement");
      return this.parseStatement();

    case _acornDistAcorn.tokTypes.parenR:
      this.reportError("Closing parenthesis without opening parenthesis.", this.tok.start, this.tok.end);
      this.next();
      if (this.tok.type === _acornDistAcorn.tokTypes.eof) return this.finishNode(node, "EmptyStatement");
      return this.parseStatement();

    case _acornDistAcorn.tokTypes.bracketR:
      this.reportError("Closing bracket without opening bracket.", this.tok.start, this.tok.end);
      this.next();
      if (this.tok.type === _acornDistAcorn.tokTypes.eof) return this.finishNode(node, "EmptyStatement");
      return this.parseStatement();

    default:
      var expr = this.parseExpression();
      if (_parseutil.isDummy(expr)) {
        this.next();
        if (this.tok.type === _acornDistAcorn.tokTypes.eof) return this.finishNode(node, "EmptyStatement");
        return this.parseStatement();
      } else if (starttype === _acornDistAcorn.tokTypes.name && expr.type === "Identifier" && this.eat(_acornDistAcorn.tokTypes.colon)) {
        node.body = this.parseStatement();
        node.label = expr;
        return this.finishNode(node, "LabeledStatement");
      } else {
        node.expression = expr;
        this.semicolon();
        return this.finishNode(node, "ExpressionStatement");
      }
  }
};

lp.parseBlock = function () {
  var node = this.startNode();
  this.pushCx();
  this.expect(_acornDistAcorn.tokTypes.braceL);
  node.body = [];
  while (!this.closes(_acornDistAcorn.tokTypes.braceR)) node.body.push(this.parseStatement());
  this.popCx();
  this.eat(_acornDistAcorn.tokTypes.braceR);
  return this.finishNode(node, "BlockStatement");
};

lp.parseFor = function (node, init) {
  node.init = init;
  node.test = node.update = null;
  if (this.eat(_acornDistAcorn.tokTypes.semi) && this.tok.type !== _acornDistAcorn.tokTypes.semi) node.test = this.parseExpression();
  if (this.eat(_acornDistAcorn.tokTypes.semi) && this.tok.type !== _acornDistAcorn.tokTypes.parenR) node.update = this.parseExpression();
  this.popCx();
  this.expect(_acornDistAcorn.tokTypes.parenR);
  node.body = this.parseStatement();
  return this.finishNode(node, "ForStatement");
};

lp.parseForIn = function (node, init) {
  var type = this.tok.type === _acornDistAcorn.tokTypes._in ? "ForInStatement" : "ForOfStatement";
  this.next();
  node.left = init;
  node.right = this.parseExpression();
  this.popCx();
  this.expect(_acornDistAcorn.tokTypes.parenR);
  node.body = this.parseStatement();
  return this.finishNode(node, type);
};

lp.parseVar = function (noIn) {
  var node = this.startNode();
  node.kind = this.tok.type.keyword;
  this.next();
  node.declarations = [];
  do {
    var decl = this.startNode();
    decl.id = this.options.ecmaVersion >= 6 ? this.toAssignable(this.parseExprAtom(), true) : this.parseIdent();
    if (_parseutil.isDummy(decl.id)) {
      decl.id.error.message = "Missing identifier";
    }
    decl.init = this.eat(_acornDistAcorn.tokTypes.eq) ? this.parseMaybeAssign(noIn) : null;
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
  } while (this.eat(_acornDistAcorn.tokTypes.comma));
  if (!node.declarations.length) {
    var decl = this.startNode();
    decl.id = this.dummyIdent("Missing identifier");
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
  }
  if (!noIn) this.semicolon();
  return this.finishNode(node, "VariableDeclaration");
};

lp.parseClass = function (isStatement) {
  var node = this.startNode();
  this.next();
  if (this.tok.type === _acornDistAcorn.tokTypes.name) node.id = this.parseIdent();else if (isStatement) node.id = this.dummyIdent("Missing class name");else node.id = null;
  node.superClass = this.eat(_acornDistAcorn.tokTypes._extends) ? this.parseExprSubscripts() : null;
  var classBody = node.body = this.startNode();
  classBody.body = [];
  var hadConstructor = false;
  var startToken = this.tok;
  this.expect(_acornDistAcorn.tokTypes.braceL);
  while (!this.closes(_acornDistAcorn.tokTypes.braceR)) {
    if (this.eat(_acornDistAcorn.tokTypes.semi)) continue;
    var method = this.startNode();
    var isGenerator = this.eat(_acornDistAcorn.tokTypes.star);
    var isMaybeStatic = this.tok.type === _acornDistAcorn.tokTypes.name && this.tok.value === "static";
    this.parsePropertyName(method);
    if (_parseutil.isDummy(method.key)) {
      this.reportError("Enexpected token: " + this.tok.type.label, this.tok.start, this.tok.end);
      if (_parseutil.isDummy(this.parseMaybeAssign())) this.next();this.eat(_acornDistAcorn.tokTypes.comma);continue;
    }

    method["static"] = isMaybeStatic && this.tok.type !== _acornDistAcorn.tokTypes.parenL && this.tok.type != _acornDistAcorn.tokTypes.braceL;
    if (method["static"]) {
      if (isGenerator) {
        this.reportError("Identifier was not expected at this point.", start, end);
      }
      isGenerator = this.eat(_acornDistAcorn.tokTypes.star);
      this.parsePropertyName(method);
    }

    method.kind = "method";

    var isGetSet = false;
    if (!method.computed) {
      var key = method.key;

      if (!isGenerator && key.type === "Identifier" && this.tok.type !== _acornDistAcorn.tokTypes.parenL && (key.name === "get" || key.name === "set")) {
        isGetSet = true;
        method.kind = key.name;
        key = this.parsePropertyName(method);
      }

      if (key != null && !method["static"] && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
        if (hadConstructor) this.reportError("Duplicate constructor in the same class", key.start, key.end);
        if (isGetSet) this.reportError("Constructor can't have get/set modifier", key.start, key.end);
        if (isGenerator) this.reportError("Constructor can't be a generator", key.start, key.end);
        method.kind = "constructor";
        hadConstructor = true;
      }
    }

    method.value = this.parseMethod(isGenerator);
    classBody.body.push(this.finishNode(method, "MethodDefinition"));

    if (isGetSet && !_parseutil.isDummy(method.value.params)) {
      var paramCount = method.kind === "get" ? 0 : 1;
      if (method.value.params.length !== paramCount) {
        var _start = method.value.start;
        var _end = method.value.body ? method.value.body.start : method.value.end;
        if (method.kind === "get") this.reportError("getter should have no params", _start, _end);else this.reportError("setter should have exactly one param", _start, _end);
      }
    }
  }
  if (!this.eat(_acornDistAcorn.tokTypes.braceR)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start;
    if (this.options.locations) this.last.loc.end = this.tok.loc.start;
    this.reportError("Missing closing '}'", startToken.start, startToken.end);
  }
  this.semicolon();
  this.finishNode(node.body, "ClassBody");
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression");
};

lp.parseFunction = function (node, isStatement) {
  this.initFunction(node);
  if (this.options.ecmaVersion >= 6) {
    node.generator = this.eat(_acornDistAcorn.tokTypes.star);
  }
  if (this.tok.type === _acornDistAcorn.tokTypes.name) node.id = this.parseIdent();else if (isStatement) node.id = this.dummyIdent("Missing function name");
  node.params = this.parseFunctionParams();
  node.body = this.parseBlock();
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
};

lp.parseExport = function () {
  var node = this.startNode();
  this.next();
  if (this.eat(_acornDistAcorn.tokTypes.star)) {
    node.source = this.eatContextual("from") ? this.parseExprAtom() : null;
    return this.finishNode(node, "ExportAllDeclaration");
  }
  if (this.eat(_acornDistAcorn.tokTypes._default)) {
    var expr = this.parseMaybeAssign();
    if (expr.id) {
      switch (expr.type) {
        case "FunctionExpression":
          expr.type = "FunctionDeclaration";break;
        case "ClassExpression":
          expr.type = "ClassDeclaration";break;
      }
    }
    node.declaration = expr;
    this.semicolon();
    return this.finishNode(node, "ExportDefaultDeclaration");
  }
  if (this.tok.type.keyword) {
    node.declaration = this.parseStatement();
    node.specifiers = [];
    node.source = null;
  } else {
    node.declaration = null;
    node.specifiers = this.parseExportSpecifierList();
    node.source = this.eatContextual("from") ? this.parseExprAtom() : null;
    this.semicolon();
  }
  return this.finishNode(node, "ExportNamedDeclaration");
};

lp.parseImport = function () {
  var node = this.startNode();
  this.next();
  if (this.tok.type === _acornDistAcorn.tokTypes.string) {
    node.specifiers = [];
    node.source = this.parseExprAtom();
    node.kind = '';
  } else {
    var elt = undefined;
    if (this.tok.type === _acornDistAcorn.tokTypes.name && this.tok.value !== "from") {
      elt = this.startNode();
      elt.local = this.parseIdent();
      this.finishNode(elt, "ImportDefaultSpecifier");
      this.eat(_acornDistAcorn.tokTypes.comma);
    }
    node.specifiers = this.parseImportSpecifierList();
    node.source = this.eatContextual("from") ? this.parseExprAtom() : this.dummyString("Malformed import declaration");
    if (elt) node.specifiers.unshift(elt);
  }
  this.semicolon();
  return this.finishNode(node, "ImportDeclaration");
};

lp.parseImportSpecifierList = function () {
  var elts = [];
  if (this.tok.type === _acornDistAcorn.tokTypes.star) {
    var elt = this.startNode();
    this.next();
    if (this.eatContextual("as")) elt.local = this.parseIdent();
    elts.push(this.finishNode(elt, "ImportNamespaceSpecifier"));
  } else {
    this.pushCx();
    this.eat(_acornDistAcorn.tokTypes.braceL);
    while (!this.closes(_acornDistAcorn.tokTypes.braceR)) {
      var elt = this.startNode();
      if (this.eat(_acornDistAcorn.tokTypes.star)) {
        if (this.eatContextual("as")) elt.local = this.parseIdent();
        this.finishNode(elt, "ImportNamespaceSpecifier");
      } else {
        if (this.isContextual("from")) break;
        elt.imported = this.parseIdent();
        if (_parseutil.isDummy(elt.imported)) break;
        elt.local = this.eatContextual("as") ? this.parseIdent() : elt.imported;
        this.finishNode(elt, "ImportSpecifier");
      }
      elts.push(elt);
      this.eat(_acornDistAcorn.tokTypes.comma);
    }
    this.eat(_acornDistAcorn.tokTypes.braceR);
    this.popCx();
  }
  return elts;
};

lp.parseExportSpecifierList = function () {
  var elts = [];
  this.pushCx();
  this.eat(_acornDistAcorn.tokTypes.braceL);
  while (!this.closes(_acornDistAcorn.tokTypes.braceR)) {
    if (this.isContextual("from")) break;
    var elt = this.startNode();
    elt.local = this.parseIdent();
    if (_parseutil.isDummy(elt.local)) break;
    elt.exported = this.eatContextual("as") ? this.parseIdent() : elt.local;
    this.finishNode(elt, "ExportSpecifier");
    elts.push(elt);
    this.eat(_acornDistAcorn.tokTypes.comma);
  }
  this.eat(_acornDistAcorn.tokTypes.braceR);
  this.popCx();
  return elts;
};

},{"./parseutil":3,"./state":4,"acorn/dist/acorn":undefined}],6:[function(_dereq_,module,exports){
"use strict";

var _acornDistAcorn = _dereq_("acorn/dist/acorn");

var _state = _dereq_("./state");

var lp = _state.SyntaxValidator.prototype;

function isSpace(ch) {
  return ch < 14 && ch > 8 || ch === 32 || ch === 160 || _acornDistAcorn.isNewLine(ch);
}

lp.next = function () {
  this.last = this.tok;
  if (this.ahead.length) this.tok = this.ahead.shift();else this.tok = this.readToken();
};

lp.readToken = function () {
  for (;;) {
    try {
      this.toks.next();
      if (this.toks.type === _acornDistAcorn.tokTypes.dot && this.input.substr(this.toks.end, 1) === "." && this.options.ecmaVersion >= 6) {
        this.toks.end++;
        this.toks.type = _acornDistAcorn.tokTypes.ellipsis;
      }
      return new _acornDistAcorn.Token(this.toks);
    } catch (e) {
      if (!(e instanceof SyntaxError)) throw e;

      this.reportError(e.message.replace(/\(\d*\:\d*\)$/, ""), e.pos, e.raisedAt);

      // Try to skip some text, based on the error message, and then continue
      var msg = e.message,
          pos = e.raisedAt,
          replace = true;
      if (/unterminated/i.test(msg)) {
        pos = this.lineEnd(e.pos + 1);
        if (/string/.test(msg)) {
          replace = { start: e.pos, end: pos, type: _acornDistAcorn.tokTypes.string, value: this.input.slice(e.pos + 1, pos) };
        } else if (/regular expr/i.test(msg)) {
          var re = this.input.slice(e.pos, pos);
          try {
            re = new RegExp(re);
          } catch (e) {}
          replace = { start: e.pos, end: pos, type: _acornDistAcorn.tokTypes.regexp, value: re };
        } else if (/template/.test(msg)) {
          replace = { start: e.pos, end: pos,
            type: _acornDistAcorn.tokTypes.template,
            value: this.input.slice(e.pos, pos) };
        } else {
          replace = false;
        }
      } else if (/invalid (unicode|regexp|number)|expecting unicode|octal literal|is reserved|directly after number|expected number in radix/i.test(msg)) {
        while (pos < this.input.length && !isSpace(this.input.charCodeAt(pos))) ++pos;
      } else if (/character escape|expected hexadecimal/i.test(msg)) {
        while (pos < this.input.length) {
          var ch = this.input.charCodeAt(pos++);
          if (ch === 34 || ch === 39 || _acornDistAcorn.isNewLine(ch)) break;
        }
      } else if (/unexpected character/i.test(msg)) {
        pos++;
        replace = false;
      } else if (/regular expression/i.test(msg)) {
        replace = true;
      } else {
        throw e;
      }
      this.resetTo(pos);
      if (replace === true) replace = { start: pos, end: pos, type: _acornDistAcorn.tokTypes.name, value: "✖" };
      if (replace) {
        if (this.options.locations) replace.loc = new _acornDistAcorn.SourceLocation(this.toks, _acornDistAcorn.getLineInfo(this.input, replace.start), _acornDistAcorn.getLineInfo(this.input, replace.end));
        return replace;
      }
    }
  }
};

lp.resetTo = function (pos) {
  this.toks.pos = pos;
  var ch = this.input.charAt(pos - 1);
  this.toks.exprAllowed = !ch || /[\[\{\(,;:?\/*=+\-~!|&%^<>]/.test(ch) || /[enwfd]/.test(ch) && /\b(keywords|case|else|return|throw|new|in|(instance|type)of|delete|void)$/.test(this.input.slice(pos - 10, pos));

  if (this.options.locations) {
    this.toks.curLine = 1;
    this.toks.lineStart = _acornDistAcorn.lineBreakG.lastIndex = 0;
    var match = undefined;
    while ((match = _acornDistAcorn.lineBreakG.exec(this.input)) && match.index < pos) {
      ++this.toks.curLine;
      this.toks.lineStart = match.index + match[0].length;
    }
  }
};

lp.lookAhead = function (n) {
  while (n > this.ahead.length) this.ahead.push(this.readToken());
  return this.ahead[n - 1];
};

},{"./state":4,"acorn/dist/acorn":undefined}],7:[function(_dereq_,module,exports){
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

},{"acorn/dist/walk":undefined,"tern/lib/infer":undefined,"tern/lib/tern":undefined}],8:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.computeCodeFolding = computeCodeFolding;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _acornDistWalk = _dereq_("acorn/dist/walk");

var walk = _interopRequireWildcard(_acornDistWalk);

function computeCodeFolding(ast) {
	var elements = [];
	walk.simple(ast, {
		VariableDeclaration: function VariableDeclaration(node) {
			elements.push({ type: "field", start: node.start, end: node.end });
		},
		MethodDefinition: function MethodDefinition(node) {
			elements.push({ type: "method", start: node.start, end: node.end });
		},
		Function: function Function(node) {
			elements.push({ type: "function", start: node.start, end: node.end });
		},
		ClassDeclaration: function ClassDeclaration(node) {
			elements.push({ type: "class", start: node.start, end: node.end });
		},
		ImportDeclaration: function ImportDeclaration(node) {
			elements.push({ type: "import", start: node.start, end: node.end });
		},
		ExportNamedDeclaration: function ExportNamedDeclaration(node) {
			elements.push({ type: "export", start: node.start, end: node.end });
		},
		ExpressionStatement: function ExpressionStatement(node) {
			elements.push({ type: "expression_statement", start: node.start, end: node.end });
		}
	});
	return {
		"elements": elements
	};
}

},{"acorn/dist/walk":undefined}],9:[function(_dereq_,module,exports){
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

},{"tern/lib/tern":undefined}],10:[function(_dereq_,module,exports){
"use strict";

exports.__esModule = true;
exports.calculate = calculate;

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _acornDistWalk = _dereq_("acorn/dist/walk");

var walk = _interopRequireWildcard(_acornDistWalk);

function calculate(ast) {
	var highlights = [];
	walk.simple(ast, {
		MethodDefinition: function MethodDefinition(node) {
			var start = node.start;
			//constructor
			if (node.kind == "constructor") {
				highlights.push({ type: "semantic-keyword", start: node.key.start, end: node.key.end });
			} else if (node.kind == "set") {
				//setter
				if (node.sourceFile.text.slice(start, start + 3) == "set") {
					highlights.push({ type: "semantic-keyword", start: start, end: start + 3 });
				}
			} else if (node.kind == "get") {
				//getter
				if (node.sourceFile.text.slice(start, start + 3) == "get") {
					highlights.push({ type: "semantic-keyword", start: start, end: start + 3 });
				}
			} else if (node.value && node.value.generator) {
				//generator
				if (node.sourceFile.text.slice(start, start + 1) == "*") {
					highlights.push({ type: "semantic-keyword", start: start, end: start + 1 });
				}
			}
		},
		FunctionDeclaration: function FunctionDeclaration(node) {
			if (node.generator) {
				//generator
				if (node.sourceFile.text.slice(node.start + 8, node.id.start).trim() == "*") {
					highlights.push({ type: "semantic-keyword", start: node.start + 8, end: node.id.start });
				}
			}
		}
	});
	return {
		"highlights": highlights
	};
}

},{"acorn/dist/walk":undefined}],11:[function(_dereq_,module,exports){
"use strict";

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj["default"] = obj; return newObj; } }

var _acornVal = _dereq_("./acorn-val");

var _ternLibTern = _dereq_("tern/lib/tern");

var tern = _interopRequireWildcard(_ternLibTern);

var _semantic_highlightJs = _dereq_("./semantic_highlight.js");

var semantic_highlight = _interopRequireWildcard(_semantic_highlightJs);

var _code_foldingJs = _dereq_("./code_folding.js");

var code_folding = _interopRequireWildcard(_code_foldingJs);

var _call_hierarchyJs = _dereq_("./call_hierarchy.js");

var call_hierarchy = _interopRequireWildcard(_call_hierarchyJs);

var _outlineJs = _dereq_("./outline.js");

var outline = _interopRequireWildcard(_outlineJs);

var _ternPushPushJs = _dereq_("tern-push/push.js");

var push = _interopRequireWildcard(_ternPushPushJs);

tern.defineQueryType("syntax-val", {
  takesFile: true,
  noInfer: true,
  run: function run(server, query, file) {
    return _acornVal.validateFile(server, query, file);
  }
});

tern.defineQueryType("semantic-highlight", {
  takesFile: true,
  noInfer: true,
  run: function run(server, query, file) {
    return semantic_highlight.calculate(file.ast);
  }
});

tern.defineQueryType("code-folding", {
  takesFile: true,
  run: function run(server, query, file) {
    return code_folding.computeCodeFolding(file.ast);
  }
});

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
  server.on("postParse", function postParse(ast, scope) {
    if (server.sendToClient) {
      var data = {};
      server.sendToClient("webclipse:astChanged", data);
    }
  });
});

},{"./acorn-val":2,"./call_hierarchy.js":7,"./code_folding.js":8,"./outline.js":9,"./semantic_highlight.js":10,"tern-push/push.js":undefined,"tern/lib/tern":undefined}]},{},[11])(11)
});