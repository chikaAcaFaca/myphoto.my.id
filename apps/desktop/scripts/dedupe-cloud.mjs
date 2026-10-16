#!/usr/bin/env node
/**
 * Clean up the " (1) (1)…" duplicate explosion the sync loop created in the
 * CLOUD (MySpace), under a base folder. Walks the tree; within each folder it
 * groups files by canonical name (trailing " (N)" groups stripped) + extension,
 * KEEPS the one with the FEWEST groups, and trashes the rest
 * (DELETE /api/disk-files → soft-delete, frees quota).
 *
 * SAFE BY DEFAULT: dry run — prints what it WOULD trash. Pass --apply to trash.
 *
 * Auth (one of):
 *   MYPHOTO_TOKEN                       a Firebase ID token (skips login)
 *   MYPHOTO_EMAIL + MYPHOTO_PASSWORD    logs in via /api/auth/login
 * Options (env):
 *   SERVER_URL    default https://myphotomy.space
 *   BASE_FOLDER   default "NKNET CONSULTING DOO"
 *
 * Usage:
 *   MYPHOTO_EMAIL=you@x.com MYPHOTO_PASSWORD=… node dedupe-cloud.mjs
 *   …same… node dedupe-cloud.mjs --apply
 */
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const SERVER_URL = process.env.SERVER_URL || 'https://myphotomy.space';
const BASE_FOLDER = process.env.BASE_FOLDER || 'NKNET CONSULTING DOO';

function parse(name) {
  const ext = path.extname(name);
  const stem = ext ? name.slice(0, -ext.length) : name;
  const m = stem.match(/^(.*?)((?: \(\d+\))+)$/);
  if (m) return { base: m[1], groups: (m[2].match(/\(\d+\)/g) || []).length, ext };
  return { base: stem, groups: 0, ext };
}

async function getToken() {
  if (process.env.MYPHOTO_TOKEN) return process.env.MYPHOTO_TOKEN;
  const email = process.env.MYPHOTO_EMAIL, password = process.env.MYPHOTO_PASSWORD;
  if (!email || !password) throw new Error('Set MYPHOTO_TOKEN or MYPHOTO_EMAIL + MYPHOTO_PASSWORD.');
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  return (await res.json()).token;
}

async function api(token, pathname, init = {}) {
  return fetch(`${SERVER_URL}${pathname}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });
}

async function listFolder(token, parentId) {
  const res = await api(token, `/api/folders?parentId=${encodeURIComponent(parentId)}`);
  if (!res.ok) return { folders: [], files: [] };
  return res.json();
}

async function main() {
  console.log(`\n=== Cloud dedupe under "${BASE_FOLDER}" on ${SERVER_URL} ===`);
  console.log(APPLY ? '*** APPLY — duplicates WILL be trashed ***\n' : '(dry run — pass --apply to trash)\n');

  const token = await getToken();

  const root = await listFolder(token, 'root');
  const base = (root.folders || []).find((f) => f.name === BASE_FOLDER);
  if (!base) { console.log(`Base folder "${BASE_FOLDER}" not found at root.`); return; }

  const trash = []; // {id, name, relPath}
  let scanned = 0;

  async function walk(folderId, relDir) {
    const { folders = [], files = [] } = await listFolder(token, folderId);
    // Dedup files in THIS folder.
    const groups = new Map();
    for (const f of files) {
      scanned++;
      const { base: b, groups: g, ext } = parse(f.name);
      const key = b + ' ' + ext;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ ...f, _g: g });
    }
    for (const [, grp] of groups) {
      if (grp.length < 2) continue;
      const min = Math.min(...grp.map((f) => f._g));
      let kept = false;
      for (const f of grp.sort((a, b) => a._g - b._g)) {
        if (!kept && f._g === min) { kept = true; continue; }
        trash.push({ id: f.id, name: f.name, relPath: `${relDir}/${f.name}` });
      }
    }
    for (const sub of folders) await walk(sub.id, `${relDir}/${sub.name}`);
  }

  await walk(base.id, BASE_FOLDER);

  console.log(`Scanned ${scanned} files. Duplicates to trash: ${trash.length}\n`);
  for (const t of trash.slice(0, 60)) console.log('  TRASH ' + t.relPath);
  if (trash.length > 60) console.log(`  … and ${trash.length - 60} more`);

  if (!APPLY) { console.log('\nDry run. Re-run with --apply to trash the above.'); return; }

  let done = 0;
  for (const t of trash) {
    const res = await api(token, `/api/disk-files?fileId=${encodeURIComponent(t.id)}`, { method: 'DELETE' });
    if (res.ok) done++; else console.error(`  ! failed (${res.status}): ${t.relPath}`);
  }
  console.log(`\nTrashed ${done}/${trash.length} cloud duplicates.`);
}

main().catch((e) => { console.error('\nCloud dedupe error:', e.message); process.exit(1); });
