import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
	input: 'src/index.js',
	output: {
		format: 'umd',
		name: 'modapp-resource',
		exports: 'named',
		globals: {
			modapp: 'modapp'
		}
	},
	external: [ 'modapp' ],
	plugins: [
		resolve({
			mainFields: [ 'jsnext:main', 'main', 'browser' ]
		}),
		babel({
			exclude: 'node_modules/**'
		}),
		commonjs(),
		(process.env.NODE_ENV === 'production' && terser({
			mangle: {
				properties: { regex: /^_/ },
			}
		})),
	],
};
