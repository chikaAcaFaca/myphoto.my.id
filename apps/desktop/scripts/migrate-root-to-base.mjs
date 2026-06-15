#!/usr/bin/env node
/**
 * One-time migration: move desktop-synced items that currently sit at the
 * MySpace ROOT into a single base folder (default "NKNET CONSULTING DOO"),
 * so desktop + Boty + web + mobile share ONE tree.
 *
 * Background: the desktop sync engine used to upload a folder's CONTENTS to
 * the MySpace root — top-level subfolders (invoici/, pasoši/, …) became ROOT
 * folders and loose files landed at root. Phase 0 of the desktop fix makes new
 * uploads nest under a base folder; this script reconciles what's already up.
 *
 * SAFE BY DEFAULT: this is a dry run. It prints what it WOULD do. Pass --apply
 * to actually move/trash.
 *
 * Auth (one of):
 *   MYPHOTO_TOKEN                  a Firebase ID token (skips login)
 *   MYPHOTO_EMAIL + MYPHOTO_PASSWORD   logs in via /api/auth/login
 *
 * Options (env):
 *   SERVER_URL    default https://myphotomy.space
 *   BASE_FOLDER   default "NKNET CONSULTING DOO" (created at root if missing)
 *   SYNC_FOLDER   if set, the move-set is read precisely from that folder's
 *                 .myphoto-sync-db.json; otherwise a built-in NKNET list.
 *
 * Usage:
 *   MYPHOTO_EMAIL=you@x.com MYPHOTO_PASSWORD=… node migrate-root-to-base.mjs
 *   …same… node migrate-root-to-base.mjs --apply
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const SERVER_URL = process.env.SERVER_URL || 'https://myphotomy.space';
const BASE_FOLDER = process.env.BASE_FOLDER || 'NKNET CONSULTING DOO';

// Built-in fallback move-set (top-level items the desktop synced to root).
// Used only when SYNC_FOLDER isn't given. Edit if your root has more/less.
const FALLBACK_FOLDERS = ['invoici', 'pasoši', 'RESTORAN VILINO KORITO'];
const FALLBACK_FILES = ['NACRT LOKALA STARČEVO.xlsx', 'PAY_5138260090026364.pdf'];

const isTempName = (n) => n.startsWith('~$') || n.startsWith('.~lock.') || /\.tmp$/i.test(n);

async function getToken() {
  if (process.env.MYPHOTO_TOKEN) return process.env.MYPHOTO_TOKEN;
  const email = process.env.MYPHOTO_EMAIL;
  const password = process.env.MYPHOTO_PASSWORD;
  if (!email || !password) {
    throw new Error('Set MYPHOTO_TOKEN, or MYPHOTO_EMAIL + MYPHOTO_PASSWORD.');
  }
  const res = await fetch(`${SERVER_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`Login failed (${res.status}): ${e.error || ''}`);
  }
  const data = await res.json();
  return data.token;
}

// Derive the precise top-level move-set from a sync DB, if available.
function moveSetFromSyncDB(syncFolder) {
  const dbPath = path.join(syncFolder, '.myphoto-sync-db.json');
  if (!fs.existsSync(dbPath)) return null;
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  const topFolders = new Set();
  for (const key of Object.keys(db.folders || {})) {
    if (key.startsWith('__base__:')) continue; // base-resolution cache entry
    // Folder cache keys are either "relPath" (old) or "basePath|relPath" (new).
    const rel = key.includes('|') ? key.split('|').pop() : key;
    if (rel && !rel.includes('/')) topFolders.add(rel);
  }

  const topFiles = new Set();
  for (const key of Object.keys(db.files || {})) {
    // File keys are device-relative paths; top-level = no separator.
    if (!key.includes('/') && !key.includes('\\') && !isTempName(key)) topFiles.add(key);
  }

  return { folders: [...topFolders], files: [...topFiles] };
}

async function api(token, pathname, init = {}) {
  const res = await fetch(`${SERVER_URL}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  });
  return res;
}

async function listRoot(token) {
  const res = await api(token, '/api/folders?parentId=root');
  if (!res.ok) throw new Error(`List root failed (${res.status})`);
  return res.json(); // { folders: [{id,name}], files: [{id,name}] }
}

async function ensureBaseFolder(token, rootListing) {
  const found = (rootListing.folders || []).find((f) => f.name === BASE_FOLDER);
  if (found) return found.id;
  if (!APPLY) return null; // dry run: don't create
  const res = await api(token, '/api/folders', {
    method: 'POST',
    body: JSON.stringify({ name: BASE_FOLDER, parentId: 'root' }),
  });
  if (!res.ok) throw new Error(`Create base folder failed (${res.status})`);
  const data = await res.json();
  return data.id || data.folderId;
}

async function main() {
  console.log(`\n=== Migrate root → "${BASE_FOLDER}" on ${SERVER_URL} ===`);
  console.log(APPLY ? '*** APPLY MODE — changes WILL be made ***' : '(dry run — pass --apply to execute)\n');

  const token = await getToken();

  // Decide what to move.
  let moveSet;
  if (process.env.SYNC_FOLDER) {
    moveSet = moveSetFromSyncDB(process.env.SYNC_FOLDER);
    if (moveSet) console.log(`Move-set from sync DB in ${process.env.SYNC_FOLDER}`);
  }
  if (!moveSet) {
    moveSet = { folders: FALLBACK_FOLDERS, files: FALLBACK_FILES };
    console.log('Move-set: built-in fallback list');
  }

  const root = await listRoot(token);
  console.log(`\nAt root now: ${root.folders.length} folders, ${root.files.length} files`);
  console.log('  folders:', root.folders.map((f) => f.name).join(', ') || '(none)');
  console.log('  files:  ', root.files.map((f) => f.name).join(', ') || '(none)');

  const targetId = await ensureBaseFolder(token, root);

  // Match the move-set against what's actually at root.
  const folderIds = [];
  for (const name of moveSet.folders) {
    const m = root.folders.find((f) => f.name === name);
    if (m && m.id !== targetId) folderIds.push({ id: m.id, name });
    else if (!m) console.log(`  ! folder not found at root: "${name}"`);
  }
  const fileIds = [];
  for (const name of moveSet.files) {
    const m = root.files.find((f) => f.name === name);
    if (m) fileIds.push({ id: m.id, name });
    else console.log(`  ! file not found at root: "${name}"`);
  }

  // Junk temp files lingering at root (e.g. ~$Doc.xlsx) → trash.
  const trashFiles = root.files.filter((f) => isTempName(f.name));

  console.log(`\nPLAN → "${BASE_FOLDER}":`);
  console.log('  move folders:', folderIds.map((f) => f.name).join(', ') || '(none)');
  console.log('  move files:  ', fileIds.map((f) => f.name).join(', ') || '(none)');
  console.log('  trash temp:  ', trashFiles.map((f) => f.name).join(', ') || '(none)');

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to perform the above.');
    return;
  }
  if (!targetId) throw new Error('No target folder id');

  if (folderIds.length || fileIds.length) {
    const res = await api(token, '/api/disk-files', {
      method: 'PATCH',
      body: JSON.stringify({
        action: 'move',
        targetFolderId: targetId,
        folderIds: folderIds.map((f) => f.id),
        fileIds: fileIds.map((f) => f.id),
      }),
    });
    if (!res.ok) throw new Error(`Move failed (${res.status})`);
    console.log(`\nMoved ${folderIds.length} folders + ${fileIds.length} files into "${BASE_FOLDER}".`);
  }

  for (const f of trashFiles) {
    const res = await api(token, `/api/disk-files?fileId=${encodeURIComponent(f.id)}`, { method: 'DELETE' });
    console.log(res.ok ? `  trashed ${f.name}` : `  ! failed to trash ${f.name} (${res.status})`);
  }

  console.log('\nDone.');
}

main().catch((e) => {
  console.error('\nMigration error:', e.message);
  process.exit(1);
});
