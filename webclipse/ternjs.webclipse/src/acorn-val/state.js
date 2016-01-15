import {tokenizer, SourceLocation, tokTypes as tt, Node, lineBreak, isNewLine} from "acorn/dist/acorn"
import {base} from "acorn/dist/walk"

// Registered plugins
export const pluginsSyntaxVal = {}

export class SyntaxValidator {
  constructor(input, options, messages) {
    this.messages = messages
    this.toks = tokenizer(input, options)
    this.options = this.toks.options
    this.input = this.toks.input
    this.tok = this.last = {type: tt.eof, start: 0, end: 0}
    if (this.options.locations) {
      let here = this.toks.curPosition()
      this.tok.loc = new SourceLocation(this.toks, here, here)
    }
    this.ahead = []; // Tokens ahead
    // Load plugins
    this.options.pluginsSyntaxVal = options.pluginsSyntaxVal || {}
    this.loadPlugins(this.options.pluginsSyntaxVal)
  }

  reportError(message, start, end) {   
    start = start || this.tok.start
    end = end || this.tok.end
    if (end < start) {
      var tmp = end
      end = start
      start = tmp
    }
    this.messages[start] = {
      message: message,
      start: start,
      end: end
    };
  }
  
  startNode() {
    return new Node(this.toks, this.tok.start, this.options.locations ? this.tok.loc.start : null)
  }

  storeCurrentPos() {
    return this.options.locations ? [this.tok.start, this.tok.loc.start] : this.tok.start
  }

  startNodeAt(pos) {
    if (this.options.locations) {
      return new Node(this.toks, pos[0], pos[1])
    } else {
      return new Node(this.toks, pos)
    }
  }

  finishNode(node, type) {
    node.type = type
    node.end = this.last.end
    if (this.options.locations)
      node.loc.end = this.last.loc.end
    if (this.options.ranges)
      node.range[1] = this.last.end
    return node
  }

  dummyIdent(message) {
    if (!message) {
      throw new Error("No message!")
    }
    let dummy = this.startNode()
    dummy.name = "✖"
    dummy.error = {
      message: message,
      start: this.tok.start,
      end: this.tok.end
    }
    return this.finishNode(dummy, "Identifier")
  }

  dummyString(message) {
    if (!message) {
      throw new Error("No message!")
    } 
    let dummy = this.startNode()
    dummy.value = dummy.raw = "✖"
    dummy.error = {
      message: message,
      start: this.tok.start,
      end: this.tok.end
    }
    return this.finishNode(dummy, "Literal")
  }
  
  isUseStrict(stmt) {
    return this.options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" && stmt.expression.type === "Literal" && stmt.expression.raw.slice(1, -1) === "use strict"
  }
  
  canEat(type) {
    return this.tok.type === type;
  }
  
  eat(type) {
    if (this.tok.type === type) {
      this.next()
      return true
    } else {
      return false
    }
  }

  isContextual(name) {
    return this.tok.type === tt.name && this.tok.value === name
  }

  eatContextual(name) {
    return this.tok.value === name && this.eat(tt.name)
  }

  expectContextual(name) {
    if (this.eatContextual(name)) return true
    this.reportError("Expected name '" + name + "'")
    for (let i = 1; i <= 2; i++) {
      let ahead = this.lookAhead(i);
      if (ahead.type === tt.name && ahead.value === name) {
        for (let j = 0; j < i; j++) this.next()
        return true
      }
    }
  }
  
  canInsertSemicolon() {
    return this.tok.type === tt.eof || this.tok.type === tt.braceR ||
      lineBreak.test(this.input.slice(this.last.end, this.tok.start))
  }


  insertSemicolon() {
    if (this.canInsertSemicolon()) {
      if (this.options.onInsertedSemicolon) this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc)
      return true;
    }
  }
  
  semicolon() {
    let isOk = this.eat(tt.semi) || this.insertSemicolon();
    if (!isOk) {
      this.reportError("Expected end of statement or expression.", this.tok.start, this.tok.end);
    }
    return isOk;
  }

  expect(type) {
    if (this.eat(type)) return true
    this.reportError("Expected '" + type.label + "', but found '" + this.tok.type.label + "' instead");
    for (let i = 1; i <= 2; i++) {
      if (this.lookAhead(i).type == type) {
        for (let j = 0; j < i; j++) this.next()
        return true
      }
    }
  }

  pushCx() {
  }

  popCx() {
  }

  lineEnd(pos) {
    while (pos < this.input.length && !isNewLine(this.input.charCodeAt(pos))) ++pos
    return pos
  }

  closes(closeTok) {
    if (this.tok.type === closeTok || this.tok.type === tt.eof) return true
    return false;
  }
  
  visitErrorNodes(program) {
    var parser = this;
    
    (function c(node, st, override) {
        var type = override || node.type;
        if (node.name == "✖" || node.value == "✖") {
          if (node.error) {
            parser.reportError(node.error.message, node.start, node.end);
          }
        } else {
          base[type](node, st, c);
        }
    })(program, null, null);
  }

  extend(name, f) {
    this[name] = f(this[name])
  }

  loadPlugins(pluginConfigs) {
    for (let name in pluginConfigs) {
      let plugin = pluginsSyntaxVal[name]
      if (!plugin) throw new Error("Plugin '" + name + "' not found")
      plugin(this, pluginConfigs[name])
    }
  }
}
