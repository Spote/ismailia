/* Copyright 2014 Jack Wakefield
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import istanbul from 'istanbul';
import traceur from 'traceur';
import esprima from 'esprima';
import escodegen from 'escodegen';
import SourceMap from 'source-map';
import fs from 'fs';
import path from 'path';

var existsSync = fs.existsSync || path.existsSync,
    SourceFile = traceur.syntax.SourceFile,
    Parser = traceur.syntax.Parser,
    ErrorReporter = traceur.util.ErrorReporter,
    FromOptionsTransformer = traceur.codegeneration.FromOptionsTransformer,
    SourceMapGenerator = traceur.outputgeneration.SourceMapGenerator,
    ParseTreeMapWriter = traceur.outputgeneration.ParseTreeMapWriter,
    SourceMapConsumer = SourceMap.SourceMapConsumer;

export class Instrumenter extends istanbul.Instrumenter {
    /**
     * Initialise the instrumenter.
     * @param {Object?} options The instrumenter options.
     */
    constructor(options = {}) {
        options.noAutoWrap = true;

        // set the indentation to match Traceur's output
        options.codeGenerationOptions = {
            format: {
                indent: {
                    style: '  ',
                }
            }
        };

        istanbul.Instrumenter.call(this, options);
    }

    /**
     * Set the options for the Traceur transpiler.
     */
    _setTraceurOptions() {
        let traceurOptions = Object.assign(
          // default traceurOptions
          {
              modules: 'amd',
              experimental: true
          },
          this.opts.traceur && this.opts.traceur.options || {}
        );

        Object.assign(traceur.options, traceurOptions);
    }

    /**
     * Create a soruce map consumer for the specified source map.
     * @param  {String|Object} sourceMap The source map as either a JSON string
     *  or object.
     * @return {SourceMap.SourceMapConsumer} A consumer for the source map.
     */
    _createSourceMapConsumer(sourceMap) {
        // parse the JSON string if required
        if (typeof sourceMap === 'string') {
            sourceMap = JSON.parse(sourceMap);
        }

        return new SourceMapConsumer(sourceMap);
    }

    /**
     * Compile the specified code with Traceur.
     * @param  {String} code The code to compile.
     * @param  {String} fileName The file name of the code.
     * @return {Object} The compiled code and source map.
     */
    _compile(code, fileName) {
        // parse the source code and create an ES6 tree
        var sourceFile = new SourceFile(fileName, code);
        var parser = new Parser(sourceFile);
        var harmonyTree = parser.parseModule();

        // transform the ES6 tree into a Mozilla Parser AST compatible tree
        var reporter = new ErrorReporter();
        var transformer = new FromOptionsTransformer(reporter);
        var tree = transformer.transform(harmonyTree);
        
        // throw an exception if there was an error parsing the tree
        if (reporter.hadError()) {
            throw new Error('Error transforming');
        }

        // generate the source map
        var sourceMapGenerator = new SourceMapGenerator({ file: fileName });
        var writer = new ParseTreeMapWriter(sourceMapGenerator, {});
        writer.visitAny(tree);

        // retrieve the compiled code and source map
        var compiled = writer.toString(tree);
        var sourceMap = sourceMapGenerator.toString();

        return {
            code: compiled,
            map: sourceMap
        };
    }

    /**
     * Parse the specified code using Esprima.
     * @param  {String} code The code to parse.
     * @return {Object} The parsed program object.
     */
    _parse(code) {
        var program = esprima.parse(code, {
            loc: true,
            range: true,
            tokens: this.opts.preserveComments,
            comment: true
        });

        if (this.opts.preserveComments) {
            program = escodegen.attachComments(program, program.comments,
                program.tokens);
        }

        return program;
    }

    /**
     * Generate code from the specified program object.
     * @param  {Object} program The Esprima program object to compile into code.
     * @param  {String} code The code used to create the Esprima program object.
     * @param  {String} fileName The name of the original file.
     * @return {String} The generated code.
     */
    _generate(program, code, fileName) {
        var options = this.opts.codeGenerationOptions || {};
        options.sourceMap = fileName;
        options.sourceMapWithCode = true;
        options.sourceContent = code;
        options.comment = this.opts.preserveComments;

        return escodegen.generate(program, options);
    }

    instrumentSync(code, fileName) {
        this._setTraceurOptions();

        // compile the code with Traceur and create the source map
        var compiled = this._compile(code, fileName);
        this._traceurMap = this._createSourceMapConsumer(compiled.map);

        // parse the compiled code using Esprima and generate the source code
        // to use the source map as a link between the original code and the
        // code Istanbul will generate
        var program = this._parse(compiled.code);
        var generator = this._generate(program, compiled.code, fileName).map;
        generator.applySourceMap(this._traceurMap);

        this._sourceMap = this._createSourceMapConsumer(generator.toString());

        return this.instrumentASTSync(program, fileName, code);
    }

    /**
     * Fix the location using the source maps used to compile and generate the
     *  code.
     * @param {Object} location The location to fix.
     */
    _fixLocation(location) {
        location.start = this._sourceMap.originalPositionFor(
            location.start);
        location.end = this._sourceMap.originalPositionFor(location.end);
    }

    /**
     * Check whether the location is an external non-existent file and therefore
     *  skip the map (most likely a '@traceur' template file).
     * @param {Object} location The map location
     */
    _checkLocation(location) {
        var filePath = path.resolve(location.start.source);

        // determine whether the original file for the location exists
        if (!existsSync(filePath)) {
            // change the location to nothing to prevent the issues from
            // appearing (despite them being greyed out anyway)
            location.start = { line: 0, column: 0 };
            location.end = { line: 0, column: 0 };
            location.skip = true;
        }
    }

    getPreamble(sourceCode, emitUseStrict) {
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

        return super.getPreamble(sourceCode, emitUseStrict);
    }
}
