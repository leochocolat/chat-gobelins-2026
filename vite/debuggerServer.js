import path from 'path';
import fs from 'fs';
import util from 'util';
import { exec } from 'child_process';

// Same endpoints as cosmic's scripts/debugger-server.js, served by the Vite dev server
export default function debuggerServer() {
    return {
        name: 'vite-plugin-debugger-server',
        // Only runs during development (serve mode)
        apply: 'serve',
        configureServer(server) {
            const root = server.config.root;

            server.middlewares.use('/__debugger/check', (req, res) => {
                res.end('check');
            });

            server.middlewares.use('/__debugger/save', (req, res) => {
                if (req.method !== 'POST') {
                    res.statusCode = 405;
                    res.end();
                    return;
                }

                let body = '';

                req.on('data', (chunk) => {
                    body += chunk;
                });

                req.on('end', () => {
                    const { data, file } = JSON.parse(body);
                    const filePath = path.resolve(root, file);

                    // Only settings files inside the project can be written
                    if (!filePath.startsWith(`${ root }${ path.sep }`) || !filePath.endsWith('.js')) {
                        res.statusCode = 403;
                        res.end();
                        return;
                    }

                    fs.writeFileSync(filePath, 'export default ' + util.inspect(data, false, 7, false) + ';\n', 'utf-8');
                    exec(`${ JSON.stringify(path.join(root, 'node_modules/.bin/prettier')) } --write ${ JSON.stringify(filePath) }`, { cwd: root });

                    res.statusCode = 200;
                    res.end();
                });
            });
        },
    };
}
