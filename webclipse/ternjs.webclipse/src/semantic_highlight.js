import * as walk from "acorn/dist/walk";

export function calculate(ast) {
	var highlights = [];
	walk.simple(ast, {
		MethodDefinition: function (node) {
			var start = node.start;
			//constructor
			if (node.kind == "constructor") {
				highlights.push({type:"semantic-keyword", start: node.key.start, end: node.key.end});
			} else if (node.kind == "set") {
				//setter
				if (node.sourceFile.text.slice(start,start + 3) == "set") {
					highlights.push({type:"semantic-keyword", start: start, end: start + 3});
				}
			} else if (node.kind == "get") {
				//getter
				if (node.sourceFile.text.slice(start,start + 3) == "get") {
					highlights.push({type:"semantic-keyword", start: start, end: start + 3});
				}
			} else if (node.value && node.value.generator) {
				//generator
				if (node.sourceFile.text.slice(start,start + 1) == "*") {
					highlights.push({type:"semantic-keyword", start: start, end: start + 1});
				}
			}
		},
		FunctionDeclaration: function (node) {
			if (node.generator) {
				//generator
				if (node.sourceFile.text.slice(node.start+8, node.id.start).trim() == "*") {
					highlights.push({type:"semantic-keyword", start: node.start+8, end: node.id.start});
				}
			}
		}
	})
	return {
		"highlights": highlights
	}
}