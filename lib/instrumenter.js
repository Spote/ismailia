"use strict";
Object.defineProperties(exports, {
  Instrumenter: {get: function() {
      return Instrumenter;
    }},
  __esModule: {value: true}
});
var $__istanbul__,
    $__traceur_64_0_46_0_46_58__,
    $__esprima__,
    $__escodegen__,
    $__source_45_map__,
    $__fs__,
    $__path__;
var istanbul = ($__istanbul__ = require("istanbul"), $__istanbul__ && $__istanbul__.__esModule && $__istanbul__ || {default: $__istanbul__}).default;
var traceur = ($__traceur_64_0_46_0_46_58__ = require("traceur"), $__traceur_64_0_46_0_46_58__ && $__traceur_64_0_46_0_46_58__.__esModule && $__traceur_64_0_46_0_46_58__ || {default: $__traceur_64_0_46_0_46_58__}).default;
var esprima = ($__esprima__ = require("esprima"), $__esprima__ && $__esprima__.__esModule && $__esprima__ || {default: $__esprima__}).default;
var escodegen = ($__escodegen__ = require("escodegen"), $__escodegen__ && $__escodegen__.__esModule && $__escodegen__ || {default: $__escodegen__}).default;
var SourceMap = ($__source_45_map__ = require("source-map"), $__source_45_map__ && $__source_45_map__.__esModule && $__source_45_map__ || {default: $__source_45_map__}).default;
var fs = ($__fs__ = require("fs"), $__fs__ && $__fs__.__esModule && $__fs__ || {default: $__fs__}).default;
var path = ($__path__ = require("path"), $__path__ && $__path__.__esModule && $__path__ || {default: $__path__}).default;
var existsSync = fs.existsSync || path.existsSync,
    SourceFile = traceur.syntax.SourceFile,
    Parser = traceur.syntax.Parser,
    ErrorReporter = traceur.util.ErrorReporter,
    FromOptionsTransformer = traceur.codegeneration.FromOptionsTransformer,
    SourceMapGenerator = traceur.outputgeneration.SourceMapGenerator,
    ParseTreeMapWriter = traceur.outputgeneration.ParseTreeMapWriter,
    SourceMapConsumer = SourceMap.SourceMapConsumer;
var Instrumenter = function Instrumenter() {
  var options = arguments[0] !== (void 0) ? arguments[0] : {};
  options.noAutoWrap = true;
  options.codeGenerationOptions = {format: {indent: {style: '  '}}};
  istanbul.Instrumenter.call(this, options);
};
var $Instrumenter = Instrumenter;
($traceurRuntime.createClass)(Instrumenter, {
  _setTraceurOptions: function() {
    var traceurOptions = Object.assign({
      modules: 'amd',
      experimental: true
    }, this.opts.traceur && this.opts.traceur.options || {});
    Object.assign(traceur.options, traceurOptions);
  },
  _createSourceMapConsumer: function(sourceMap) {
    if (typeof sourceMap === 'string') {
      sourceMap = JSON.parse(sourceMap);
    }
    return new SourceMapConsumer(sourceMap);
  },
  _compile: function(code, fileName) {
    var sourceFile = new SourceFile(fileName, code);
    var parser = new Parser(sourceFile);
    var harmonyTree = parser.parseModule();
    var reporter = new ErrorReporter();
    var transformer = new FromOptionsTransformer(reporter);
    var tree = transformer.transform(harmonyTree);
    if (reporter.hadError()) {
      throw new Error('Error transforming');
    }
    var sourceMapGenerator = new SourceMapGenerator({file: fileName});
    var writer = new ParseTreeMapWriter(sourceMapGenerator, {});
    writer.visitAny(tree);
    var compiled = writer.toString(tree);
    var sourceMap = sourceMapGenerator.toString();
    return {
      code: compiled,
      map: sourceMap
    };
  },
  _parse: function(code) {
    var program = esprima.parse(code, {
      loc: true,
      range: true,
      tokens: this.opts.preserveComments,
      comment: true
    });
    if (this.opts.preserveComments) {
      program = escodegen.attachComments(program, program.comments, program.tokens);
    }
    return program;
  },
  _generate: function(program, code, fileName) {
    var options = this.opts.codeGenerationOptions || {};
    options.sourceMap = fileName;
    options.sourceMapWithCode = true;
    options.sourceContent = code;
    options.comment = this.opts.preserveComments;
    return escodegen.generate(program, options);
  },
  instrumentSync: function(code, fileName) {
    this._setTraceurOptions();
    var compiled = this._compile(code, fileName);
    this._traceurMap = this._createSourceMapConsumer(compiled.map);
    var program = this._parse(compiled.code);
    var generator = this._generate(program, compiled.code, fileName).map;
    generator.applySourceMap(this._traceurMap);
    this._sourceMap = this._createSourceMapConsumer(generator.toString());
    return this.instrumentASTSync(program, fileName, code);
  },
  _fixLocation: function(location) {
    location.start = this._sourceMap.originalPositionFor(location.start);
    location.end = this._sourceMap.originalPositionFor(location.end);
  },
  _checkLocation: function(location) {
    var filePath = path.resolve(location.start.source);
    if (!existsSync(filePath)) {
      location.start = {
        line: 0,
        column: 0
      };
      location.end = {
        line: 0,
        column: 0
      };
      location.skip = true;
    }
  },
  getPreamble: function(sourceCode, emitUseStrict) {
    if (this._sourceMap) {
      var statementMap = this.coverState.statementMap,
          functionMap = this.coverState.fnMap,
          branchMap = this.coverState.branchMap,
          key = null,
          map = null;
      for (key in statementMap) {
        if (statementMap.hasOwnProperty(key)) {
          map = statementMap[$traceurRuntime.toProperty(key)];
          this._fixLocation(map);
          this._checkLocation(map);
        }
      }
      for (key in functionMap) {
        if (functionMap.hasOwnProperty(key)) {
          map = functionMap[$traceurRuntime.toProperty(key)];
          this._fixLocation(map.loc);
          this._checkLocation(map.loc);
        }
      }
      for (key in branchMap) {
        if (branchMap.hasOwnProperty(key)) {
          var locations = branchMap[$traceurRuntime.toProperty(key)].locations;
          for (var i = 0; i < locations.length; i++) {
            this._fixLocation(locations[$traceurRuntime.toProperty(i)]);
            this._checkLocation(locations[$traceurRuntime.toProperty(i)]);
          }
        }
      }
    }
    return $traceurRuntime.superCall(this, $Instrumenter.prototype, "getPreamble", [sourceCode, emitUseStrict]);
  }
}, {}, istanbul.Instrumenter);
