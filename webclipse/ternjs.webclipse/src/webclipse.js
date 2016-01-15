import {validateFile} from "./acorn-val"
import * as tern from "tern/lib/tern"
import * as semantic_highlight from "./semantic_highlight.js"
import * as code_folding from "./code_folding.js"
import * as call_hierarchy from "./call_hierarchy.js"
import * as outline from "./outline.js"
import * as push from "tern-push/push.js"

tern.defineQueryType("syntax-val", {
  takesFile: true,
  noInfer: true,
  run: function(server, query, file) {
    return validateFile(server, query, file);  
  }
});

tern.defineQueryType("semantic-highlight", {
  takesFile: true,
  noInfer: true,
  run: function(server, query, file) {
    return semantic_highlight.calculate(file.ast);
  }
});

tern.defineQueryType("code-folding", {
  takesFile: true,
    run: function(server, query, file) {
      return code_folding.computeCodeFolding(file.ast);
    }
});

tern.defineQueryType("call-hierarchy-roots", {
	takesFile: true,
    run: function(server, query, file) {
      return call_hierarchy.findRoots(server, query, file);
    }
});

tern.defineQueryType("call-hierarchy-callers", {
	takesFile: true,
    run: function(server, query, file) {
      return call_hierarchy.findCallers(server, query, file);
    }
});

tern.defineQueryType("call-hierarchy-callees", {
  takesFile: true,
  run: function(server, query, file) {
    return call_hierarchy.findCallees(server, query, file);
  }
});

tern.defineQueryType("webclipse-outline", {
  takesFile: true,
  run: function(server, query, file) {
    return outline.create(query, file);
  }
});
  
tern.registerPlugin("webclipse", function(server, options) {	
    server._webclipse = {};
    server.on("postParse", function postParse(ast, scope) {
      if (server.sendToClient) {
        var data = {};
        server.sendToClient("webclipse:astChanged", data);
      }
    })
});


  