import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, 'frontend-lint.mjs');

if (!existsSync(target)) {
    console.log(`frontend-lint.mjs not found at ${target}`);
    process.exit(0);
}

const result = spawnSync(process.execPath, [target], { stdio: 'inherit' });
process.exit(result.status ?? 0);