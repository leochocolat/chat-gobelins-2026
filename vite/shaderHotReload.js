import path from 'path';
import fs from 'fs';

const SHADER_EXTENSIONS = /\.(glsl|vs|fs|vertex|fragment)$/;

export default function shaderHotReload() {
    return {
        name: 'vite-plugin-shader-hot-reload',
        // Only runs during development (serve mode)
        apply: 'serve',
        handleHotUpdate({ file, server }) {
            if (!SHADER_EXTENSIONS.test(file)) return;

            const shaderCode = fs.readFileSync(file, 'utf-8');

            // The shader folder name matches the HotProgram name
            const folder = path.basename(path.dirname(file));

            server.hot.send({
                type: 'custom',
                event: 'shader-update',
                data: {
                    folder,
                    file: path.basename(file),
                    code: shaderCode,
                },
            });

            return [];
        },
    };
}
