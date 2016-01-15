var fs = require("fs"), path = require("path")
var stream = require("stream")

var browserify = require("browserify")
var babel = require('babel-core')
var babelify = require("babelify").configure({loose: "all"})

process.chdir(path.resolve(__dirname, ".."))
/*
browserify({standalone: "acorn.val"})
  .plugin(require('browserify-derequire'))
  .transform(babelify)
  .require("./src/acorn-val/index.js", {entry: true})
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message) })
  .pipe(fs.createWriteStream("dist/acorn-val.js"))
*/
var ACORN_PLACEHOLDER = "this_function_call_should_be_replaced_with_a_call_to_load_acorn()";
var WALK_PLACEHOLDER = "this_function_call_should_be_replaced_with_a_call_to_load_walk()";

var ACORN_FILE = path.resolve(__dirname, "../src/acorn-val/deps/acorn.js");
var WALK_FILE = path.resolve(__dirname, "../src/acorn-val/deps/walk.js")

function acornShimPrepare(file) {
  var tr = new stream.Transform
  if (file == ACORN_FILE || file == WALK_FILE) {
    var sent = false
    tr._transform = function(chunk, _, callback) {
      if (!sent) {
        sent = true
        callback(null, (file == ACORN_FILE) ? ACORN_PLACEHOLDER : WALK_PLACEHOLDER);
      } else {
        callback()
      }
    }
  } else {
    tr._transform = function(chunk, _, callback) { callback(null, chunk) }
  }
  return tr
}
function acornShimComplete() {
  var tr = new stream.Transform
  var buffer = "";
  tr._transform = function(chunk, _, callback) {
    buffer += chunk.toString("utf8");
    callback();
  };
  tr._flush = function (callback) {
    tr.push(buffer
        .replace(ACORN_PLACEHOLDER, "module.exports = typeof acorn != 'undefined' ? acorn : require(\"acorn/dist/acorn\")")
        .replace(WALK_PLACEHOLDER, "module.exports = typeof walk != 'undefined' ? walk : require(\"acorn/dist/walk\")"));
    callback(null);
  };
  return tr;
}

browserify({standalone: "tern.webclipse", bundleExternal: false})
  .plugin(require('browserify-derequire'))
  //.transform(acornShimPrepare)
  .transform(babelify)
  .require("./src/webclipse.js", {entry: true})
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message) })
  //.pipe(acornShimComplete())
  .pipe(fs.createWriteStream("dist/webclipse.js"))

/*
browserify({standalone: "acorn.val", bundleExternal: false})
  .plugin(require('browserify-derequire'))
  //.transform(acornShimPrepare)
  .transform(babelify)
  .require("./src/acorn-val/index.js", {entry: true})
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message) })
  //.pipe(acornShimComplete())
  .pipe(fs.createWriteStream("dist/acorn_val.js"))
*/
  /*
browserify({standalone: "acorn.walk"})
  .plugin(require('browserify-derequire'))
  .transform(acornShimPrepare)
  .transform(babelify)
  .require("./src/walk/index.js", {entry: true})
  .bundle()
  .on("error", function (err) { console.log("Error: " + err.message) })
  .pipe(acornShimComplete())
  .pipe(fs.createWriteStream("dist/walk.js"))

babel.transformFile("./src/bin/acorn.js", function (err, result) {
  if (err) return console.log("Error: " + err.message)
  fs.writeFile("bin/acorn", result.code, function (err) {
    if (err) return console.log("Error: " + err.message)

    // Make bin/acorn executable
    if (process.platform === 'win32')
      return
    var stat = fs.statSync("bin/acorn")
    var newPerm = stat.mode | parseInt('111', 8)
    fs.chmodSync("bin/acorn", newPerm)
  })
})*/
