// Acorn: Syntax Validator
//
// This module is based on an alternative parser (`parse_dammit`) and
// performs syntax validation

import * as acorn from "acorn/dist/acorn"
import {SyntaxValidator, pluginsSyntaxVal} from "./state"
import * as tern from "tern/lib/tern"
import "./tokenize"
import "./statement"
import "./expression"

export {SyntaxValidator, pluginsSyntaxVal} from "./state"

acorn.defaultOptions.tabSize = 4

export function validate_syntax(input, options) {
  let messages = {}
  let p = new SyntaxValidator(input, options, messages)
  p.next()
  p.validateTopLevel()
  return messages
}

//Validator
function validate(server, query, file, messages, strictParserError) {
  function makeError(msg, start, end) {
    if (start > end) {
      var tmp = start;
      start = end
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
      error.lineNumber = 1 + query.lineCharPositions ? error.from.line : tern.outputPos({lineCharPositions: true}, file, start).line; 
    }
    if (!query.groupByFiles) error.file = file.name;
    return error;
  }
  
  var options = {
      directSourceFile: file,
      allowReturnOutsideFunction: true,
      allowImportExportEverywhere: true,
      ecmaVersion: server.options.ecmaVersion
  }
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
    messages.push(makeError(strictParserError.message.replace(/\(\d*\:\d*\)$/, "[Strict]"), 
            strictParserError.pos, strictParserError.raisedAt))
  }
}
  
  // Validate one file
export function validateFile(server, query, file) {
  try {
    var messages = [], ast = file.ast, state = file.scope;
// if (ast.error) {
    validate(server, query, file, messages, ast.error);
// }
    return {messages: messages};
  } catch(err) {
    console.error(err.stack);
    return {messages: []};
  }
}


acorn.validate_syntax = validate_syntax
acorn.SyntaxValidator = SyntaxValidator
acorn.pluginsSyntaxVal = pluginsSyntaxVal
