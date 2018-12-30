const fs = require("fs")
const path = require("path")
const { minify } = require("html-minifier")
const { minify: minifyJS } = require("uglify-es")

const jsSrcPaths = ["ResizeObserver.js"]

const result = minify(fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8"), {
  // minifyJS: code => code != "" ? minifyJS([
  //   // ...jsSrcPaths.map(file => fs.readFileSync(path.resolve(__dirname, file), "utf-8")),
  //   code
  // ]).code : "",
  minifyJS: code => minifyJS(code).code,
  minifyCSS: true,
  collapseWhitespace: true,
  // removeEmptyElements: true,
  // removeEmptyAttributes: (attr, tag) => attr == "src" && tag == "script",
  // minifyURLs: text => jsSrcPaths.includes(text) ? "" : text
})

try {
  fs.mkdirSync(path.resolve(__dirname, "dist"))
} catch (e) { }
fs.writeFileSync(path.resolve(__dirname, "./dist/index.html"), result)