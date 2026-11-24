// Assembles worker.mjs from src/ parts (cut from the original
// single file at top-level seams). Also produces the browser copy
// of the shared game engine: engine1+engine2 with `export` stripped,
// baked into main.mjs as ENGINE_JS and served at /engine.js?v=<hash>
// for LOCAL PLAY mode on the host page.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const engine1 = readFileSync('src/engine1.mjs', 'utf8');
const roomstore = readFileSync('src/roomstore.mjs', 'utf8');
const engine2 = readFileSync('src/engine2.mjs', 'utf8');
let main = readFileSync('src/main.mjs', 'utf8');
let page = readFileSync('src/page.mjs', 'utf8');

const engineSrc = engine1 + engine2;
// The browser copy runs inside an IIFE: the page already owns global
// names the engine also uses (TL_RANKS and friends), so the engine
// must not declare anything in the page's global scope. It publishes
// exactly five entry points the local-play runtime calls.
const engineBrowser = '(function () {\n'
  + engineSrc.replace(/^export /gm, '')
  + '\nwindow.__NP_ENGINE = { newRoom: newRoom, hostDispatch: hostDispatch, playerAction: playerAction, advance: advance, buildView: buildView };\n})();\n';
const hash = createHash('sha256').update(engineBrowser).digest('hex').slice(0, 10);

if (!main.includes('/*__ENGINE_BUNDLE__*/')) throw new Error('main.mjs is missing the /*__ENGINE_BUNDLE__*/ marker');
main = main.replace('/*__ENGINE_BUNDLE__*/', 'const ENGINE_JS = ' + JSON.stringify(engineBrowser) + ';');
page = page.split('__ENGV__').join(hash);
const pageHash = createHash('sha256').update(page).digest('hex').slice(0, 10);
if (!main.includes('/*__PAGE_V__*/')) throw new Error('main.mjs is missing the /*__PAGE_V__*/ marker');
main = main.replace('/*__PAGE_V__*/', 'const PAGE_V = ' + JSON.stringify(pageHash) + ';');
page = page.split('__PAGEV__').join(pageHash);

const out = engine1 + roomstore + engine2 + main + page;
writeFileSync('worker.mjs', out);
console.log('worker.mjs assembled:', out.length, 'chars | engine hash:', hash, '| engine browser bytes:', engineBrowser.length);
