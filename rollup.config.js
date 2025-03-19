import typescript from 'rollup-plugin-typescript2';
import terser from '@rollup/plugin-terser';

export default {
    input: 'src/main.ts',
    output: {
        dir: 'dist',
        format: 'esm',
        entryFileNames: '[name].mjs'
    },
    plugins: [
        typescript(),
        terser({
            format: {
                comments: 'some',
                beautify: true,
                ecma: 'esnext',
            },
            compress: false,
            mangle: false,
            module: true,
        }),
    ]
};