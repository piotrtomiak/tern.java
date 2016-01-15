import {SyntaxValidator} from "./state"
import {isDummy} from "./parseutil"
import {getLineInfo, tokTypes as tt} from "acorn/dist/acorn"

const lp = SyntaxValidator.prototype

lp.validateTopLevel = function() {
  let first = true
  let node = this.startNodeAt(this.options.locations ? [0, getLineInfo(this.input, 0)] : 0)
  node.body = []
  while (this.tok.type !== tt.eof) {
    let stmt = this.parseStatement(true, true)
    node.body.push(stmt)
    if (first) {
//      if (this.isUseStrict(stmt)) this.setStrict(true)
      first = false
    }
  }
  this.last = this.tok
  if (this.options.ecmaVersion >= 6) {
    node.sourceType = this.options.sourceType
  }
  this.visitErrorNodes(this.finishNode(node, "Program"))
}

lp.parseStatement = function(declaration, topLevel) {
  let starttype = this.tok.type, node = this.startNode()

  switch (starttype) {
  case tt._break: case tt._continue:
    this.next()
    let isBreak = starttype === tt._break
    if (this.eat(tt.semi) || this.canInsertSemicolon()) {
      node.label = null
    } else {
      node.label = this.tok.type === tt.name ? this.parseIdent() : null
      if (node.label == null) {
        this.reportError("Label expected")
      } else {
        this.semicolon()
      }
    }
    return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")

  case tt._debugger:
    this.next()
    this.semicolon()
    return this.finishNode(node, "DebuggerStatement")

  case tt._do:
    this.next()
    node.body = this.parseStatement()
    node.test = this.eat(tt._while) ? this.parseParenExpression() : this.dummyIdent("missing while statement")
    this.semicolon()
    return this.finishNode(node, "DoWhileStatement")

  case tt._for:
    this.next()
    this.pushCx()
    this.expect(tt.parenL)
    if (this.tok.type === tt.semi) return this.parseFor(node, null)
    if (this.tok.type === tt._var || this.tok.type === tt._let || this.tok.type === tt._const) {
      let init = this.parseVar(true)
      if (init.declarations.length === 1 && (this.tok.type === tt._in || this.isContextual("of"))) {
        return this.parseForIn(node, init)
      }
      return this.parseFor(node, init)
    }
    let init = this.parseExpression(true)
    if (this.tok.type === tt._in || this.isContextual("of"))
      return this.parseForIn(node, this.toAssignable(init))
    return this.parseFor(node, init)

  case tt._function:
    this.next()
    return this.parseFunction(node, true)

  case tt._if:
    this.next()
    node.test = this.parseParenExpression()
    node.consequent = this.parseStatement()
    node.alternate = this.eat(tt._else) ? this.parseStatement() : null
    return this.finishNode(node, "IfStatement")

  case tt._return:
    this.next()
    if (this.eat(tt.semi) || this.canInsertSemicolon()) node.argument = null
    else { node.argument = this.parseExpression(); this.semicolon() }
    return this.finishNode(node, "ReturnStatement")

  case tt._switch:
    this.next()
    node.discriminant = this.parseParenExpression()
    node.cases = []
    this.pushCx()
    this.expect(tt.braceL)

    let cur
    while (!this.closes(tt.braceR)) {
      if (this.tok.type === tt._case || this.tok.type === tt._default) {
        let isCase = this.tok.type === tt._case
        if (cur) this.finishNode(cur, "SwitchCase")
        node.cases.push(cur = this.startNode())
        cur.consequent = []
        this.next()
        if (isCase) cur.test = this.parseExpression()
        else cur.test = null
        this.expect(tt.colon)
      } else {
        if (!cur) {
          node.cases.push(cur = this.startNode())
          cur.consequent = []
          cur.test = null
        }
        cur.consequent.push(this.parseStatement())
      }
    }
    if (cur) this.finishNode(cur, "SwitchCase")
    this.popCx()
    this.eat(tt.braceR)
    return this.finishNode(node, "SwitchStatement")

  case tt._throw:
    this.next()
    node.argument = this.parseExpression()
    this.semicolon()
    return this.finishNode(node, "ThrowStatement")

  case tt._try:
    this.next()
    node.block = this.parseBlock()
    node.handler = null
    if (this.tok.type === tt._catch) {
      let clause = this.startNode()
      this.next()
      this.expect(tt.parenL)
      clause.param = this.toAssignable(this.parseExprAtom(), true)
      this.expect(tt.parenR)
      clause.guard = null
      clause.body = this.parseBlock()
      node.handler = this.finishNode(clause, "CatchClause")
    }
    node.finalizer = this.eat(tt._finally) ? this.parseBlock() : null
    if (!node.handler && !node.finalizer) return node.block
    return this.finishNode(node, "TryStatement")

  case tt._let:
    if (this.options.ecmaVersion < 6) {
      this.reportError("'let' keyword is not allowed if ECMAScript version is lower than 6", this.tok.start, this.tok.end)
    }
  case tt._var:
  case tt._const:
    return this.parseVar()

  case tt._while:
    this.next()
    node.test = this.parseParenExpression()
    node.body = this.parseStatement()
    return this.finishNode(node, "WhileStatement")

  case tt._with:
    this.next()
    node.object = this.parseParenExpression()
    node.body = this.parseStatement()
    return this.finishNode(node, "WithStatement")

  case tt.braceL:
    return this.parseBlock()

  case tt.semi:
    this.next()
    return this.finishNode(node, "EmptyStatement")

  case tt._class:
    return this.parseClass(true)

  case tt._import:
    return this.parseImport()

  case tt._export:
    return this.parseExport()

  case tt.braceR:
    this.reportError("Closing brace without opening brace.", this.tok.start, this.tok.end)
    this.next()
    if (this.tok.type === tt.eof) return this.finishNode(node, "EmptyStatement")
    return this.parseStatement()
  
  case tt.parenR:
    this.reportError("Closing parenthesis without opening parenthesis.", this.tok.start, this.tok.end)
    this.next()
    if (this.tok.type === tt.eof) return this.finishNode(node, "EmptyStatement")
    return this.parseStatement()

  case tt.bracketR:
    this.reportError("Closing bracket without opening bracket.", this.tok.start, this.tok.end)
    this.next()
    if (this.tok.type === tt.eof) return this.finishNode(node, "EmptyStatement")
    return this.parseStatement()
    
  default:
    let expr = this.parseExpression()
    if (isDummy(expr)) {
      this.next()
      if (this.tok.type === tt.eof) return this.finishNode(node, "EmptyStatement")
      return this.parseStatement()
    } else if (starttype === tt.name && expr.type === "Identifier" && this.eat(tt.colon)) {
      node.body = this.parseStatement()
      node.label = expr
      return this.finishNode(node, "LabeledStatement")
    } else {
      node.expression = expr
      this.semicolon()
      return this.finishNode(node, "ExpressionStatement")
    }
  }
}

lp.parseBlock = function() {
  let node = this.startNode()
  this.pushCx()
  this.expect(tt.braceL)
  node.body = []
  while (!this.closes(tt.braceR))
    node.body.push(this.parseStatement())
  this.popCx()
  this.eat(tt.braceR)
  return this.finishNode(node, "BlockStatement")
}

lp.parseFor = function(node, init) {
  node.init = init
  node.test = node.update = null
  if (this.eat(tt.semi) && this.tok.type !== tt.semi) node.test = this.parseExpression()
  if (this.eat(tt.semi) && this.tok.type !== tt.parenR) node.update = this.parseExpression()
  this.popCx()
  this.expect(tt.parenR)
  node.body = this.parseStatement()
  return this.finishNode(node, "ForStatement")
}

lp.parseForIn = function(node, init) {
  let type = this.tok.type === tt._in ? "ForInStatement" : "ForOfStatement"
  this.next()
  node.left = init
  node.right = this.parseExpression()
  this.popCx()
  this.expect(tt.parenR)
  node.body = this.parseStatement()
  return this.finishNode(node, type)
}

lp.parseVar = function(noIn) {
  let node = this.startNode()
  node.kind = this.tok.type.keyword
  this.next()
  node.declarations = []
  do {
    let decl = this.startNode()
    decl.id = this.options.ecmaVersion >= 6 ? this.toAssignable(this.parseExprAtom(), true) : this.parseIdent()
    if (isDummy(decl.id)) {
      decl.id.error.message = "Missing identifier"
    }
    decl.init = this.eat(tt.eq) ? this.parseMaybeAssign(noIn) : null
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"))
  } while (this.eat(tt.comma))
  if (!node.declarations.length) {
    let decl = this.startNode()
    decl.id = this.dummyIdent("Missing identifier")
    node.declarations.push(this.finishNode(decl, "VariableDeclarator"))
  }
  if (!noIn) this.semicolon()
  return this.finishNode(node, "VariableDeclaration")
}

lp.parseClass = function(isStatement) {
  let node = this.startNode()
  this.next()
  if (this.tok.type === tt.name) node.id = this.parseIdent()
  else if (isStatement) node.id = this.dummyIdent("Missing class name")
  else node.id = null
  node.superClass = this.eat(tt._extends) ? this.parseExprSubscripts() : null
  let classBody = node.body = this.startNode()
  classBody.body = []
  let hadConstructor = false
  let startToken = this.tok
  this.expect(tt.braceL)
  while (!this.closes(tt.braceR)) {
    if (this.eat(tt.semi)) continue
    let method = this.startNode()
    let isGenerator = this.eat(tt.star)
    let isMaybeStatic = this.tok.type === tt.name && this.tok.value === "static"
    this.parsePropertyName(method)
    if (isDummy(method.key)) {
      this.reportError("Enexpected token: " + this.tok.type.label, this.tok.start, this.tok.end)
      if (isDummy(this.parseMaybeAssign())) this.next();this.eat(tt.comma);continue
    }
    
    method.static = isMaybeStatic && this.tok.type !== tt.parenL && this.tok.type != tt.braceL
    if (method.static) {
        if (isGenerator) {
          this.reportError("Identifier was not expected at this point.", start, end)
        }
        isGenerator = this.eat(tt.star)
        this.parsePropertyName(method)
    }
    
    method.kind = "method"
    
    let isGetSet = false
    if (!method.computed) {
      let key = method.key
      
        if (!isGenerator && key.type === "Identifier" && this.tok.type !== tt.parenL && (key.name === "get" || key.name === "set")) {
            isGetSet = true
            method.kind = key.name
            key = this.parsePropertyName(method)
        }
        
        if (key != null && !method.static && (key.type === "Identifier" && key.name === "constructor" || key.type === "Literal" && key.value === "constructor")) {
            if (hadConstructor) this.reportError("Duplicate constructor in the same class", key.start, key.end)
            if (isGetSet) this.reportError("Constructor can't have get/set modifier", key.start, key.end)
            if (isGenerator) this.reportError("Constructor can't be a generator", key.start, key.end)
            method.kind = "constructor"
            hadConstructor = true
        }
        
    }
    
    method.value = this.parseMethod(isGenerator)
    classBody.body.push(this.finishNode(method, "MethodDefinition"))    
    
    if (isGetSet && !isDummy(method.value.params)) {
        let paramCount = method.kind === "get" ? 0 : 1
        if (method.value.params.length !== paramCount) {
          let start = method.value.start
          let end = method.value.body ? method.value.body.start : method.value.end
          if (method.kind === "get") 
            this.reportError("getter should have no params", start, end)
          else 
            this.reportError("setter should have exactly one param", start, end)
        }
    }
    
  }
  if (!this.eat(tt.braceR)) {
    // If there is no closing brace, make the node span to the start
    // of the next token (this is useful for Tern)
    this.last.end = this.tok.start
    if (this.options.locations) this.last.loc.end = this.tok.loc.start
    this.reportError("Missing closing '}'", startToken.start, startToken.end)
  }
  this.semicolon()
  this.finishNode(node.body, "ClassBody")
  return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
}

lp.parseFunction = function(node, isStatement) {
  this.initFunction(node)
  if (this.options.ecmaVersion >= 6) {
    node.generator = this.eat(tt.star)
  }
  if (this.tok.type === tt.name) node.id = this.parseIdent()
  else if (isStatement) node.id = this.dummyIdent("Missing function name")
  node.params = this.parseFunctionParams()
  node.body = this.parseBlock()
  return this.finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression")
}

lp.parseExport = function() {
  let node = this.startNode()
  this.next()
  if (this.eat(tt.star)) {
    node.source = this.eatContextual("from") ? this.parseExprAtom() : null
    return this.finishNode(node, "ExportAllDeclaration")
  }
  if (this.eat(tt._default)) {
    let expr = this.parseMaybeAssign()
    if (expr.id) {
      switch (expr.type) {
      case "FunctionExpression": expr.type = "FunctionDeclaration"; break
      case "ClassExpression": expr.type = "ClassDeclaration"; break
      }
    }
    node.declaration = expr
    this.semicolon()
    return this.finishNode(node, "ExportDefaultDeclaration")
  }
  if (this.tok.type.keyword) {
    node.declaration = this.parseStatement()
    node.specifiers = []
    node.source = null
  } else {
    node.declaration = null
    node.specifiers = this.parseExportSpecifierList()
    node.source = this.eatContextual("from") ? this.parseExprAtom() : null
    this.semicolon()
  }
  return this.finishNode(node, "ExportNamedDeclaration")
}

lp.parseImport = function() {
  let node = this.startNode()
  this.next()
  if (this.tok.type === tt.string) {
    node.specifiers = []
    node.source = this.parseExprAtom()
    node.kind = ''
  } else {
    let elt
    if (this.tok.type === tt.name && this.tok.value !== "from") {
      elt = this.startNode()
      elt.local = this.parseIdent()
      this.finishNode(elt, "ImportDefaultSpecifier")
      this.eat(tt.comma)
    }
    node.specifiers = this.parseImportSpecifierList()
    node.source = this.eatContextual("from") ? this.parseExprAtom() : this.dummyString("Malformed import declaration")
    if (elt) node.specifiers.unshift(elt)
  }
  this.semicolon()
  return this.finishNode(node, "ImportDeclaration")
}

lp.parseImportSpecifierList = function () {
  let elts = []
  if (this.tok.type === tt.star) {
    let elt = this.startNode()
    this.next()
    if (this.eatContextual("as")) elt.local = this.parseIdent()
    elts.push(this.finishNode(elt, "ImportNamespaceSpecifier"))
  } else {
    this.pushCx()
    this.eat(tt.braceL)
    while (!this.closes(tt.braceR)) {
      let elt = this.startNode()
      if (this.eat(tt.star)) {
        if (this.eatContextual("as")) elt.local = this.parseIdent()
        this.finishNode(elt, "ImportNamespaceSpecifier")
      } else {
        if (this.isContextual("from")) break
        elt.imported = this.parseIdent()
        if (isDummy(elt.imported)) break
        elt.local = this.eatContextual("as") ? this.parseIdent() : elt.imported
        this.finishNode(elt, "ImportSpecifier")
      }
      elts.push(elt)
      this.eat(tt.comma)
    }
    this.eat(tt.braceR)
    this.popCx()
  }
  return elts
}

lp.parseExportSpecifierList = function() {
  let elts = []
  this.pushCx()
  this.eat(tt.braceL)
  while (!this.closes(tt.braceR)) {
    if (this.isContextual("from")) break
    let elt = this.startNode()
    elt.local = this.parseIdent()
    if (isDummy(elt.local)) break
    elt.exported = this.eatContextual("as") ? this.parseIdent() : elt.local
    this.finishNode(elt, "ExportSpecifier")
    elts.push(elt)
    this.eat(tt.comma)
  }
  this.eat(tt.braceR)
  this.popCx()
  return elts
}
