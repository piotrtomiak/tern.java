import * as walk from "acorn/dist/walk"

export function computeCodeFolding(ast, comments) {
	var elements = [];
	if (comments) { 
		for (var i in comments) {
			var comment = comments[i]; 
			if (comment.type == "Block") {
				elements.push({type: "comment", start: comment.start, end: comment.end});
			}
		}
	}
	walk.simple(ast, {
		VariableDeclaration: function (node) {
			elements.push({type: "field", start: node.start, end: node.end});
		},
		MethodDefinition: function (node) {
			elements.push({type: "method", start: node.start, end: node.end});
		},
		Function: function (node) {
			elements.push({type: "function", start: node.start, end: node.end});
		},
		ClassDeclaration: function (node) {
			elements.push({type: "class", start: node.start, end: node.end});
		},
		ImportDeclaration: function (node) {
			elements.push({type: "import", start: node.start, end: node.end});
		},
		ExportNamedDeclaration: function (node) {
			elements.push({type: "export", start: node.start, end: node.end});
		},
		ExpressionStatement: function (node) {
			elements.push({type: "expression_statement", start: node.start, end: node.end});
		}
	})
	return {
		"elements": elements
	}	
}

