const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const outputDir = path.join(path.dirname(__dirname), "build", "client");
console.log("Webpack output directory " + outputDir);
const staticAssets = path.join(__dirname, "public");
console.log("Serving public assets from " + staticAssets);

module.exports = {
    entry: "./src/index.tsx",
    output: {
        filename: "bundle.js",
        path: outputDir,
    },

    mode: "development",

    // Enable sourcemaps for debugging webpack's output.
    devtool: "source-map",

    devServer: {
        contentBase: [
            outputDir,
            staticAssets,
        ],
        hotOnly: true,

        // https://medium.com/@drgenejones/proxying-an-external-api-with-webpack-serve-code-and-a-restful-data-from-separate-endpoints-4da9b8daf430
        proxy: {
            '/api': {
                target: 'http://web:80',
                secure: false
            }
        },
    },

    watchOptions: {
        poll: true
    },    

    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        extensions: [".ts", ".tsx", ".js", ".json"]
    },

    module: {
        rules: [
            // All files with a '.ts' or '.tsx' extension will be handled by 'awesome-typescript-loader'.
            { test: /\.tsx?$/, loader: "awesome-typescript-loader" },

            // All output '.js' files will have any sourcemaps re-processed by 'source-map-loader'.
            { enforce: "pre", test: /\.js$/, loader: "source-map-loader" }
        ]
    },

    // When importing a module whose path matches one of the following, just
    // assume a corresponding global variable exists and use that instead.
    // This is important because it allows us to avoid bundling all of our
    // dependencies, which allows browsers to cache those libraries between builds.
    /*
    externals: {
        "react": "React",
        "react-dom": "ReactDOM"
    }
    */

    plugins: [
        new CopyWebpackPlugin([
            // Copy index.html to output.
            {
                from: "./src/index.html",
                to: outputDir,
            },

            // Copy external CSS files.
            {
                from: "./node_modules/tailwindcss/dist/tailwind.css",
                to: path.join(outputDir, "styles", "tailwind.css"),
            },
            {
                from: "./node_modules/@blueprintjs/core/lib/css/blueprint.css",
                to: path.join(outputDir, "styles", "blueprint.css"),
            },
            {
                from: "./node_modules/@blueprintjs/icons/lib/css/blueprint-icons.css",
                to: path.join(outputDir, "styles", "blueprint-icons.css"),
            },
            {
                from: "./src/index.css",
                to: path.join(outputDir, "styles", "index.css"),
            },
            
        ]),

        // https://hackernoon.com/react-with-typescript-and-webpack-654f93f34db6
        new webpack.HotModuleReplacementPlugin(),
    ],
};