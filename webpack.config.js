const webpack = require("webpack");
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");


const config = {
    mode: 'development',
    entry: {
        core: './src/core/js/capcode-core.js',
        sql: './src/sql/js/capcode-sql.js',
        html: './src/html/js/capcode-html.js'
    },
    output: {
        filename: 'js/capcode-[name].min.js',
        path: path.resolve(__dirname, 'dist'),
        library: ['capcode', '[name]']
    },
    devtool: 'source-map',
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /(node_modules)/,
                use: {
                    loader: 'babel-loader'
                }
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true,
                            sourceMapContents: false
                        }
                    }
                ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/,
                use: {
                    loader: 'file-loader',
                    options: {
                        outputPath: './fonts/',
                        publicPath: '../../fonts/',
                        name: '[name].[ext]'
                    }
                }
            }
        ]
    },
    externals: {
        showdown: 'showdown',
        codemirror: 'CodeMirror',
        prismjs: 'Prism',
        'perfect-scrollbar': 'PerfectScrollbar',
        alertify: 'alertify',
        sql: 'SQL',
        capcode: 'capcode'
    },
    plugins: [
        // new CleanWebpackPlugin(['dist']),
        new MiniCssExtractPlugin({
            filename: "./style/capcode-[name].css"
        }),
        new CopyWebpackPlugin([{
                from: './src/lib/',
                to: './lib/'
            }, {
                from: './src/*/*.html',
                to: './[name].html',
                totype: 'template'
            },
            {
                from: './src/md/',
                to: './md/[name].[ext]',
                totype: 'template'
            },
            {
                from: './src/sql/assets/',
                to: './assets/sql/[name].[ext]',
                totype: 'template'
            },
            {
                from: './src/html/assets/',
                to: './assets/html/[name].[ext]',
                totype: 'template'
            },
            {
                from: './src/doc/',
                to: './doc/'
            }
        ])
    ],
    devServer: {
        contentBase: `${__dirname}/dist`,
        publicPath: '/',
    }
};
module.exports = config;
