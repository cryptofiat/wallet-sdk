var path = require('path');
module.exports = {
    entry: "./src/index.js",
    output: {
        path: __dirname,
        filename: "bundle.js"
    },
    resolve: {
        modules: [
            path.resolve('./src'),
            path.resolve('./node_modules')
        ]
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel',
                query: {
                    presets: ['es2015']
                }
            }
        ]
    }
};