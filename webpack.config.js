/* eslint-disable @typescript-eslint/no-var-requires */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

'use strict';

// See https://github.com/Microsoft/vscode-azuretools/wiki/webpack for guidance

const process = require('process');
const dev = require("@microsoft/vscode-azext-dev");

let DEBUG_WEBPACK = !/^(false|0)?$/i.test(process.env.DEBUG_WEBPACK || '');

let config = dev.getDefaultWebpackConfig({
    projectRoot: __dirname,
    verbosity: DEBUG_WEBPACK ? 'debug' : 'normal',
    externals:
    {
        // Fix "Module not found" errors in ./node_modules/websocket/lib/{BufferUtil,Validation}.js
        // These files are not in node_modules and so will fail normally at runtime and instead use fallbacks.
        // Make them as external so webpack doesn't try to process them, and they'll simply fail at runtime as before.
        '../build/Release/validation': 'commonjs ../build/Release/validation',
        '../build/default/validation': 'commonjs ../build/default/validation',
        '../build/Release/bufferutil': 'commonjs ../build/Release/bufferutil',
        '../build/default/bufferutil': 'commonjs ../build/default/bufferutil',
        // Fix: Module not found
        'applicationinsights-native-metrics': 'commonjs applicationinsights-native-metrics',
        'diagnostic-channel-publishers': 'commonjs diagnostic-channel-publishers',
    },
});

if (DEBUG_WEBPACK) {
    console.log('Config:', config);
}

module.exports = config;
