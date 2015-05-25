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
        var sourceMap = '',
            compiler, result
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

    instrumentSync(code, fileName) {
        // compile the code with Traceur and create the source map
        var compiled = this._compile(code, fileName);

        // parse the compiled code using Esprima
        var program = this._parse(compiled.code);
        
        this._sourceMap = this._createSourceMapConsumer(compiled.map);

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
        var filePath = location.start.source && path.resolve(location.start.source);

        // determine whether the original file for the location exists
        if (filePath && !existsSync(filePath) || location.start.line === null) {
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
