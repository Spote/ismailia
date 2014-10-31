# ismailia ![](http://img.shields.io/david/Spote/ismailia.svg?style=flat-square) ![](http://img.shields.io/david/dev/Spote/ismailia.svg?style=flat-square)

Ismailia is a code coverage tool for ES6 using the [Traceur](https://github.com/google/traceur-compiler) transpiler.

It's intention is to be used with [karma](http://karma-runner.github.io/) and [karma-coverage](https://github.com/karma-runner/karma-coverage), which provides code coverage reports using [istanbul](https://github.com/gotwarlost/istanbul).

## Installation

For the moment, a custom fork of karma-coverage needs to be installed which supports ismailia is an instrumenter.

```sh
$ npm install --save-dev Spote/karma-coverage
```

Ismailia can be installed using

```sh
$ npm install --save-dev ismailia
```

## Usage

To use ismailia, set the [instrumenter](https://github.com/karma-runner/karma-coverage/blob/master/README.md#instrumenter) for the JavaScript file type to `ismailia`.

```js
coverageReporter: {
  instrumenter: {
    '**/*.js': 'ismailia'
  }
}
```

The scripts are compiled as [RequiredJS](http://requirejs.org/) modules by default. See the [example](https://github.com/Spote/ismailia/blob/master/example) directory for an example on how to setup tests. The example utilises the [karma-traceur-preprocessor](https://github.com/karma-runner/karma-traceur-preprocessor) to compile the tests.

But can customize the traceur options

```js
coverageReporter: {
  instrumenter: {
    '**/*.js': 'ismailia'
  },
  instrumenterOptions: {
    ismailia: {
      traceur: {
        options: {
          modules: 'instantiate'
        }
      }
    }
  }
}
```

## License

> Copyright 2014 Jack Wakefield
>
> Licensed under the Apache License, Version 2.0 (the "License");
> you may not use this file except in compliance with the License.
> You may obtain a copy of the License at
>
>     http://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
> See the License for the specific language governing permissions and
> limitations under the License.
