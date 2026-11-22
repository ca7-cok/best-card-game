// AETHERFALL's entry program (Node 22, standard library only).
//
// It hands the game in: it copies this repository's game/ and screenshots/
// beside this file into the output directory and writes
// /output/dossier.json with the vendored make.fun library, so the sealed
// scorer and the judge can read the game, its screenshots and its outline.
//
// The output directory is never deleted itself — only its contents are
// cleared, so a second run over the same directory is safe and writes the
// same bytes. Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');

// Safety: never clear the repository itself, the filesystem root, or home.
const outResolved = resolve(out);
if (outResolved === resolve(here) || outResolved === resolve('/') || outResolved === resolve(process.env.HOME ?? '/root')) {
  throw new Error(`refusing to use ${out} as the output directory`);
}

if (!existsSync(gameDir) || !statSync(gameDir).isDirectory()) {
  throw new Error(`game/ not found beside main.ts: ${gameDir}`);
}
if (!existsSync(shotsDir) || !statSync(shotsDir).isDirectory()) {
  throw new Error(`screenshots/ not found beside main.ts: ${shotsDir}`);
}

/** Empty a directory's contents without removing the directory itself. */
function clearContents(dir) {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

clearContents(out);
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
// The scorer's own caps (from the kit's gate): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

if (!existsSync(dossierPath) || statSync(dossierPath).size === 0) {
  throw new Error(`dossier.json was not written: ${dossierPath}`);
}
const gameFiles = readdirSync(join(out, 'game'), { recursive: true }).length;
const shotFiles = readdirSync(join(out, 'screenshots')).length;
console.log(`AETHERFALL handed in to ${out} (${gameFiles} game files, ${shotFiles} screenshots, dossier.json written)`);
