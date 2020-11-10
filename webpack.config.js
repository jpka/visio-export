const path = require('path');

module.exports = {
	entry: './src/index.ts',
	module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
			},
			{
        test: /\.xml?$/,
        use: 'raw-loader',
        exclude: /node_modules/,
			},
    ],
	},
	resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
		filename: 'visio-export.js',
		library: 'visioExport',
		libraryTarget: 'umd'
  },
};