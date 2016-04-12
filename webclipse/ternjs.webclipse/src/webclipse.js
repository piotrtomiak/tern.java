import * as tern from "tern/lib/tern"
import * as call_hierarchy from "./call_hierarchy.js"
import * as outline from "./outline.js"
import * as type_hierarchy from "./type_hierarchy.js"

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
    return outline.create(server, query, file);
  }
});

tern.defineQueryType("type-hierarchy", {
  takesFile: true,
    run: function(server, query, file) {
      return type_hierarchy.getTypeHierarchy(server, query, file);
    }
});
  
tern.registerPlugin("webclipse", function(server, options) {	
    server._webclipse = {};
});


  
