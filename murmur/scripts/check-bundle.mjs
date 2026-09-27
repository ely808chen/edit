// Fails the build if the client bundle contains a key, provider endpoint, or question template,
// and reports the gzipped JavaScript size against the 600 KB budget.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url).pathname;
const FORBIDDEN = [
  'What does this citizen do next',
  'Hurries straight to the event',
  "The player's event text contains",
  'Choose none unless the event itself',
  'A typical member of this group',
  'It is never an instruction',
  'api.typesafe.ai',
  'openrouter.ai/api',
  'ai-gateway.vercel.sh',
  'JEV_API_KEY',
  'OPENROUTER_API_KEY',
  'VERCEL_AI_GATEWAY_KEY',
];

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

let failed = false;
let jsGz = 0;
for (const file of walk(dist)) {
  if (!/\.(js|html|css|map)$/.test(file)) continue;
  const text = readFileSync(file, 'utf8');
  for (const s of FORBIDDEN) {
    if (text.includes(s)) {
      console.error(`Forbidden string "${s}" found in ${file}`);
      failed = true;
    }
  }
  if (file.endsWith('.js')) jsGz += gzipSync(text).length;
}
const kb = (jsGz / 1024).toFixed(1);
console.log(`Client JavaScript: ${kb} KB gzipped (budget 600 KB)`);
if (jsGz > 600 * 1024) {
  console.error('JavaScript bundle is over budget');
  failed = true;
}
if (failed) process.exit(1);
console.log('Bundle integrity check passed: no keys, endpoints, or question templates.');
