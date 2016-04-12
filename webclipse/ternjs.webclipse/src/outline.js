import * as tern from "tern/lib/tern";

function processProperty(server, file, prop, parent, level) {
  if (prop.origin) {
    var propFile = server.fileMap[prop.origin];
    if (propFile) {
      var child = {
        name: prop.propertyName,
        file: propFile.name,
        value: propFile.name != file.name,
        type: prop.types.length > 0 ? prop.types.join('|') : "?",
        start: prop.originNode ? prop.originNode.start : -1,
        end: prop.originNode ? prop.originNode.end : -1
      };
      for (var typeNr in prop.types) {
        var type = prop.types[typeNr];
        gather(server, file, type, child, level);
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
}

function gather(server, file, node, parent, level) {
  if (level ++ > 10) return;
  for (var propName in node.props) {
    processProperty(server, file, node.props[propName], parent, level);
  }
  for (var propName in node.maybeProps) {
    processProperty(server, file, node.maybeProps[propName], parent, level);
  }
}

export function create(server, query, file) {
  try {
    var outline = [], scope = file.scope;
    gather(server, file, scope, outline, 0);
    return {outline: outline};
  } catch(err) {
    console.error(err, err.stack);
    return {outline: []};
  }
}