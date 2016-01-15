var fs = require("fs"), path = require("path")
var stream = require("stream")

var browserify = require("browserify")
var babel = require('babel-core')
var babelify = require("babelify").configure({loose: "all"})

process.chdir(path.resolve(__dirname, ".."))

console.log("Compiling webclipse.js with browserify")

browserify({standalone: "tern.webclipse", bundleExternal: false})
  .plugin(require('browserify-derequire'))
  .transform(babelify)
  .require("./src/webclipse.js", {entry: true})
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message) })
  .pipe(fs.createWriteStream("dist/webclipse.js"))

console.log("Done")
