"use strict";
Object.defineProperties(exports, {
  Instrumenter: {get: function() {
      return Instrumenter;
    }},
  __esModule: {value: true}
});
var $__istanbul__,
    $__traceur_64_0_46_0_46_74__,
    $__esprima__,
    $__escodegen__,
    $__source_45_map__,
    $__fs__,
    $__path__;
var istanbul = ($__istanbul__ = require("istanbul"), $__istanbul__ && $__istanbul__.__esModule && $__istanbul__ || {default: $__istanbul__}).default;
var traceur = ($__traceur_64_0_46_0_46_74__ = require("traceur"), $__traceur_64_0_46_0_46_74__ && $__traceur_64_0_46_0_46_74__.__esModule && $__traceur_64_0_46_0_46_74__ || {default: $__traceur_64_0_46_0_46_74__}).default;
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
  _createSourceMapConsumer: function(sourceMap) {
    if (typeof sourceMap === 'string') {
      sourceMap = JSON.parse(sourceMap);
    }
    return new SourceMapConsumer(sourceMap);
  },
  _compile: function(code, fileName) {
    var sourceMap = '',
        compiler,
        result;
    ;
    compiler = new traceur.NodeCompiler({
      modules: 'amd',
      sourceMaps: true
    });
    try {
      result = compiler.compile(code, fileName, fileName, '.');
      sourceMap = compiler.getSourceMap();
    } catch (e) {
      throw new Error(e);
    }
    return {
      code: result,
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
  instrumentSync: function(code, fileName) {
    var compiled = this._compile(code, fileName);
    var program = this._parse(compiled.code);
    this._sourceMap = this._createSourceMapConsumer(compiled.map);
    return this.instrumentASTSync(program, fileName, code);
  },
  _fixLocation: function(location) {
    location.start = this._sourceMap.originalPositionFor(location.start);
    location.end = this._sourceMap.originalPositionFor(location.end);
  },
  _checkLocation: function(location) {
    var filePath = location.start.source && path.resolve(location.start.source);
    if (filePath && !existsSync(filePath) || location.start.line === null) {
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
          map = statementMap[key];
          this._fixLocation(map);
          this._checkLocation(map);
        }
      }
      for (key in functionMap) {
        if (functionMap.hasOwnProperty(key)) {
          map = functionMap[key];
          this._fixLocation(map.loc);
          this._checkLocation(map.loc);
        }
      }
      for (key in branchMap) {
        if (branchMap.hasOwnProperty(key)) {
          var locations = branchMap[key].locations;
          for (var i = 0; i < locations.length; i++) {
            this._fixLocation(locations[i]);
            this._checkLocation(locations[i]);
          }
        }
      }
    }
    return $traceurRuntime.superGet(this, $Instrumenter.prototype, "getPreamble").call(this, sourceCode, emitUseStrict);
  }
}, {}, istanbul.Instrumenter);
