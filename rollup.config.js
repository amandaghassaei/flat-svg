import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from "rollup-plugin-terser";
import nodePolyfills from 'rollup-plugin-polyfill-node';
import dts from "rollup-plugin-dts";
import del from "rollup-plugin-delete";

export default [
	{
		input: 'src/index.ts',
		output: [
			{
				file: 'bundle/flat-svg.js',
				sourcemap: true,
				format: 'umd',
				name: 'FlatSVGLib',
			},
			{
				file: 'bundle/flat-svg.min.js',
				sourcemap: true,
				format: 'umd',
				name: 'FlatSVGLib',
				plugins: [terser()],
			}
		],
		plugins: [
			commonjs(),
			nodePolyfills(),
			resolve(),
			typescript({
				sourceMap: true,
				inlineSources: true,
			}),
		],
	},
	{
		input: "./bundle/index.d.ts",
		output: [{ file: "bundle/flat-svg.d.ts", format: "es" }],
		plugins: [
			dts(),
			del({ hook: "buildEnd", targets: "./bundle/*.d.ts" }),
		],
	},
];