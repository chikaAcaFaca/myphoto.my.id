import { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage, session, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { randomBytes } from 'crypto';
import Store from 'electron-store';
import { SyncEngine } from './sync-engine';
import { TakeoutImporter, TakeoutProgress } from './takeout-importer';

const store = new Store({
  defaults: {
    syncFolder: '',
    // MySpace folder everything syncs under. Empty → derived from the sync
    // folder's own name at init, so the cloud mirrors a named tree (e.g.
    // "NKNET CONSULTING DOO") instead of dumping contents at the root.
    remoteBasePath: '',
    apiToken: '',
    refreshToken: '',
    // Wall-clock ms at which the current apiToken stops being valid.
    // We refresh ~5 min before this to avoid 401s in-flight.
    tokenExpiresAt: 0,
    serverUrl: 'https://myphotomy.space',
    syncEnabled: true,
    startOnBoot: true,
    showNotifications: true,
  },
});

// Refresh the Firebase ID token via /api/auth/refresh when it's within
// the safety window of expiry. Returns the (possibly refreshed) token,
// or empty string if the refresh fails — caller should treat that as
// "user must re-login in the browser".
const TOKEN_REFRESH_SAFETY_MS = 5 * 60 * 1000;
async function getValidToken(): Promise<string> {
  const serverUrl = store.get('serverUrl') as string;
  const refreshToken = store.get('refreshToken') as string;
  const expiresAt = store.get('tokenExpiresAt') as number;
  const current = store.get('apiToken') as string;

  if (current && Date.now() < expiresAt - TOKEN_REFRESH_SAFETY_MS) {
    return current;
  }
  if (!refreshToken) return current || '';

  try {
    const res = await fetch(`${serverUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      // Refresh tokens can be revoked when the user resets their password
      // or signs out everywhere. Clear our copy so the renderer routes
      // them back to the login screen on next interaction.
      console.error('Token refresh failed with status', res.status);
      store.set('apiToken', '');
      store.set('refreshToken', '');
      store.set('tokenExpiresAt', 0);
      return '';
    }
    const data = (await res.json()) as { token: string; refreshToken: string; expiresIn: number };
    const newExpiresAt = Date.now() + (data.expiresIn || 3600) * 1000;
    store.set('apiToken', data.token);
    store.set('refreshToken', data.refreshToken);
    store.set('tokenExpiresAt', newExpiresAt);
    return data.token;
  } catch (e) {
    console.error('Token refresh error:', e);
    return current || '';
  }
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

let syncEngine: SyncEngine | null = null;
let takeout: TakeoutImporter | null = null;
let takeoutUid = '';

// Register (or clear) the Windows auto-start login item. In a packaged build
// process.execPath is the app's own exe, so the bare form is correct. In dev
// (`electron .`) it's the bare electron.exe — registering THAT alone makes
// Windows launch Electron's built-in "welcome" app at boot (a stray "Electron"
// window), so we must also hand it the resolved app path.
function applyAutoStart(openAtLogin: boolean) {
  app.setLoginItemSettings(
    process.defaultApp
      ? { openAtLogin, path: process.execPath, args: [path.resolve(process.argv[1])] }
      : { openAtLogin }
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 460,
    height: 700,
    backgroundColor: '#FAFAF8',
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'assets', 'index.html'));

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.once('ready-to-show', () => {
    // Don't show window on startup if already configured
    if (!store.get('syncFolder') || !store.get('apiToken')) {
      mainWindow?.show();
    }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const fallbackIcon = path.join(__dirname, '..', 'assets', 'icon.png');
  let trayIcon: Electron.NativeImage;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else if (fs.existsSync(fallbackIcon)) {
    trayIcon = nativeImage.createFromPath(fallbackIcon).resize({ width: 16, height: 16 });
  } else {
    // Generate a 16x16 blue icon programmatically (PNG header + solid blue)
    const size = 16;
    const buffer = Buffer.alloc(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      buffer[i * 4] = 59;     // R
      buffer[i * 4 + 1] = 130; // G
      buffer[i * 4 + 2] = 246; // B
      buffer[i * 4 + 3] = 255; // A
    }
    trayIcon = nativeImage.createFromBuffer(buffer, { width: size, height: size });
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('MyPhoto Sync');

  updateTrayMenu('idle');

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

function updateTrayMenu(status: 'idle' | 'syncing' | 'error' | 'paused') {
  const statusLabels = {
    idle: '✓ Sinhronizovano',
    syncing: '↻ Sinhronizacija...',
    error: '⚠ Greška',
    paused: '⏸ Pauzirano',
  };

  const contextMenu = Menu.buildFromTemplate([
    { label: `MyPhoto Sync — ${statusLabels[status]}`, enabled: false },
    { type: 'separator' },
    {
      label: 'Otvori MyPhoto folder',
      click: () => {
        const folder = store.get('syncFolder') as string;
        if (folder && fs.existsSync(folder)) {
          shell.openPath(folder);
        }
      },
    },
    {
      label: 'Mimovi',
      click: () => { void openWebPage('meme-wall'); },
    },
    {
      label: 'Otvori myphotomy.space',
      click: () => shell.openExternal(store.get('serverUrl') as string),
    },
    { type: 'separator' },
    {
      label: store.get('syncEnabled') ? 'Pauziraj sinhronizaciju' : 'Nastavi sinhronizaciju',
      click: () => {
        const enabled = !store.get('syncEnabled');
        store.set('syncEnabled', enabled);
        if (enabled) {
          syncEngine?.start();
          updateTrayMenu('idle');
        } else {
          syncEngine?.stop();
          updateTrayMenu('paused');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Podešavanja',
      click: () => mainWindow?.show(),
    },
    {
      label: 'Izlaz',
      click: () => {
        syncEngine?.stop();
        takeout?.dispose();
        mainWindow?.destroy();
        app.quit();
      },
    },
  ]);

  tray?.setContextMenu(contextMenu);
  tray?.setToolTip(`MyPhoto Sync — ${statusLabels[status]}`);
}

async function initSyncEngine() {
  const syncFolder = store.get('syncFolder') as string;
  const serverUrl = store.get('serverUrl') as string;
  const apiToken = await getValidToken();

  if (!syncFolder || !apiToken) return;

  // Ensure sync folder exists
  if (!fs.existsSync(syncFolder)) {
    fs.mkdirSync(syncFolder, { recursive: true });
  }

  // Default the cloud base folder to the local folder's name so the MySpace
  // tree mirrors it (and lines up with Boty writing into the same folder).
  const remoteBasePath = (store.get('remoteBasePath') as string) || path.basename(syncFolder);

  syncEngine = new SyncEngine({
    syncFolder,
    remoteBasePath,
    // Pass the refresh callback so the engine can ask for a fresh token
    // mid-flight instead of failing once the cached one expires.
    apiToken,
    getToken: getValidToken,
    serverUrl,
    onStatus: (status) => {
      updateTrayMenu(status);
      mainWindow?.webContents.send('sync-status', status);
    },
    onNotification: (title, message) => {
      if (store.get('showNotifications')) {
        mainWindow?.webContents.send('notification', { title, message });
      }
    },
    onLog: (msg) => {
      mainWindow?.webContents.send('log', msg);
    },
    // Cloud-side deletes land in the Windows Recycle Bin, never a hard delete.
    trashLocal: (absPath) => shell.trashItem(absPath),
    onPendingDeletes: (pending) => {
      mainWindow?.webContents.send('pending-deletes', pending);
      if (pending) mainWindow?.show();
    },
  });

  if (store.get('syncEnabled')) {
    syncEngine.start();
  }
}

// (Re)start syncing after a sign-in — with a folder already chosen there is
// no settings save to do it, so the app would sit idle until restarted.
function restartSyncEngine() {
  syncEngine?.stop();
  syncEngine = null;
  initSyncEngine().catch((e) => console.error('initSyncEngine error:', e));
}

// IPC handlers for renderer
ipcMain.handle('get-config', () => ({
  syncFolder: store.get('syncFolder'),
  remoteBasePath: store.get('remoteBasePath'),
  apiToken: store.get('apiToken'),
  serverUrl: store.get('serverUrl'),
  syncEnabled: store.get('syncEnabled'),
  startOnBoot: store.get('startOnBoot'),
  showNotifications: store.get('showNotifications'),
}));

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Izaberite folder za sinhronizaciju',
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('save-config', (_event, config: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(config)) {
    store.set(key, value);
  }

  // Restart sync engine with new config
  restartSyncEngine();

  // Auto-start on boot
  applyAutoStart((config.startOnBoot as boolean) || false);

  return true;
});

ipcMain.handle('login', async (_event, email: string, password: string) => {
  const serverUrl = store.get('serverUrl') as string;
  try {
    const response = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errData = (await response.json()) as { error?: string };
      return { success: false, error: errData.error || 'Login failed' };
    }

    const data = (await response.json()) as {
      token: string;
      refreshToken: string;
      expiresIn: number;
    };
    // Persist the full token bundle so the sync engine can keep going
    // past the 1h ID-token expiry without forcing the user back through
    // a manual re-login.
    store.set('apiToken', data.token);
    store.set('refreshToken', data.refreshToken || '');
    store.set('tokenExpiresAt', Date.now() + (data.expiresIn || 3600) * 1000);
    restartSyncEngine();
    return { success: true, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
});

// Google sign-in for users who don't know their password. We can't run the
// Firebase web SDK inside the main process, so we reuse the website's Google
// sign-in: spin up a one-shot loopback HTTP server, open the system browser at
// /desktop-auth?port=&state=, and the page POSTs the Firebase tokens back to us.
// The `state` nonce prevents any other local process from injecting tokens.
ipcMain.handle('google-login', async () => {
  const serverUrl = store.get('serverUrl') as string;
  const state = randomBytes(16).toString('hex');

  return new Promise<{ success: boolean; token?: string; error?: string }>((resolve) => {
    let settled = false;
    const server = http.createServer();

    const finish = (result: { success: boolean; token?: string; error?: string }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { server.close(); } catch { /* already closing */ }
      resolve(result);
    };

    // Give the user 5 minutes to complete the browser flow, then give up.
    const timer = setTimeout(() => finish({ success: false, error: 'Vreme za prijavu je isteklo' }), 5 * 60 * 1000);

    server.on('request', (req, res) => {
      const url = new URL(req.url || '', 'http://127.0.0.1');

      // Allow the cross-origin POST from the https website to this loopback.
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      if (url.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      if (url.searchParams.get('state') !== state) {
        res.writeHead(403); res.end('bad state');
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
        if (body.length > 100_000) req.destroy(); // refuse oversized payloads
      });
      req.on('end', () => {
        try {
          const data = JSON.parse(body || '{}') as { idToken?: string; refreshToken?: string; expiresIn?: number };
          if (!data.idToken) {
            res.writeHead(400); res.end('no token');
            finish({ success: false, error: 'Token nije primljen' });
            return;
          }
          store.set('apiToken', data.idToken);
          store.set('refreshToken', data.refreshToken || '');
          store.set('tokenExpiresAt', Date.now() + (data.expiresIn || 3600) * 1000);
          restartSyncEngine();

          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end('<html><body style="font-family:system-ui,sans-serif;text-align:center;padding-top:48px;color:#374151">Prijava uspešna. Možete zatvoriti ovaj prozor i vratiti se u MyPhoto aplikaciju.</body></html>');

          if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
          finish({ success: true, token: data.idToken });
        } catch {
          res.writeHead(400); res.end('bad body');
          finish({ success: false, error: 'Neispravan odgovor prijave' });
        }
      });
    });

    server.on('error', (e) => finish({ success: false, error: e.message }));

    // Bind to a random free port on loopback only, then open the browser.
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      shell.openExternal(`${serverUrl}/desktop-auth?port=${port}&state=${state}`);
    });
  });
});

ipcMain.handle('get-sync-stats', () => {
  return syncEngine?.getStats() || { filesWatched: 0, filesSynced: 0, lastSync: null, errors: [] };
});

ipcMain.handle('force-sync', () => {
  syncEngine?.forceSync();
});

ipcMain.handle('resolve-pending-deletes', (_event, approve: boolean) => {
  return syncEngine?.resolvePendingDeletes(approve === true);
});

// ---- Built-in web window (MemeWall, meme creator, MySpace, plans) ----

// Fixed destinations only — the renderer never hands us a URL.
const WEB_PAGES: Record<string, string> = {
  'meme-wall': '/meme-wall',
  'meme-creator': '/meme-creator',
  myspace: '/myspace',
  photos: '/photos',
  pricing: '/pricing',
};
let webWindow: BrowserWindow | null = null;

/**
 * Open a myphotomy.space page in the app's own window, signed into the same
 * account as the desktop app: we trade our ID token for a Firebase custom
 * token and hand it to /desktop-session in the URL fragment. If that fails
 * the page simply opens and the user can sign in there.
 */
async function openWebPage(page: string): Promise<void> {
  const target = WEB_PAGES[page];
  if (!target) return;
  const serverUrl = store.get('serverUrl') as string;
  const origin = new URL(serverUrl).origin;

  let url = `${serverUrl}${target}`;
  try {
    const token = await getValidToken();
    if (token) {
      const res = await fetch(`${serverUrl}/api/auth/custom-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const { customToken } = (await res.json()) as { customToken: string };
        url = `${serverUrl}/desktop-session#t=${encodeURIComponent(customToken)}&next=${encodeURIComponent(target)}`;
      }
    }
  } catch (e) {
    console.error('Web sign-in handoff failed:', e);
  }

  if (!webWindow || webWindow.isDestroyed()) {
    webWindow = new BrowserWindow({
      width: 1180,
      height: 820,
      minWidth: 420,
      minHeight: 600,
      title: 'MyPhoto',
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      autoHideMenuBar: true,
      backgroundColor: '#FAFAF8',
      webPreferences: {
        // Its own persistent session: the web login survives restarts and
        // never mixes with the app's own renderer.
        partition: 'persist:myphoto-web',
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    const isOurs = (u: string) => {
      try { return new URL(u).origin === origin; } catch { return false; }
    };
    // Our site stays in the window; everything else opens in the real browser.
    webWindow.webContents.setWindowOpenHandler(({ url: u }) => {
      if (isOurs(u)) {
        webWindow?.loadURL(u);
      } else if (/^https?:/.test(u)) {
        shell.openExternal(u);
      }
      return { action: 'deny' };
    });
    webWindow.webContents.on('will-navigate', (e, u) => {
      if (!isOurs(u)) {
        e.preventDefault();
        if (/^https?:/.test(u)) shell.openExternal(u);
      }
    });
    webWindow.on('closed', () => { webWindow = null; });
  }
  await webWindow.loadURL(url);
  webWindow.show();
  webWindow.focus();
}

ipcMain.handle('open-web', (_event, page: string) => openWebPage(page));

ipcMain.handle('get-account', async () => {
  const token = await getValidToken();
  if (!token) return null;
  try {
    const res = await fetch(`${store.get('serverUrl')}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as { email?: string; displayName?: string; storageUsed?: number; storageLimit?: number };
    return {
      email: d.email || '',
      displayName: d.displayName || '',
      storageUsed: d.storageUsed || 0,
      storageLimit: d.storageLimit || 0,
    };
  } catch {
    return null;
  }
});

ipcMain.handle('open-sync-folder', () => {
  const folder = store.get('syncFolder') as string;
  if (folder && fs.existsSync(folder)) shell.openPath(folder);
});

// Sign out completely: clearing only apiToken left the refresh token behind,
// so the next getValidToken() silently signed the user straight back in.
ipcMain.handle('logout', async () => {
  syncEngine?.stop();
  syncEngine = null;
  takeout?.dispose();
  takeout = null;
  store.set('apiToken', '');
  store.set('refreshToken', '');
  store.set('tokenExpiresAt', 0);
  if (webWindow && !webWindow.isDestroyed()) webWindow.close();
  await session.fromPartition('persist:myphoto-web').clearStorageData();
  updateTrayMenu('paused');
});

// ---- Google Takeout import ----

// Firebase ID tokens carry the uid in the JWT payload. Import progress is
// kept per account so a different login never sees "already imported".
function uidFromToken(token: string): string {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'));
    return String(payload.user_id || payload.sub || '');
  } catch {
    return '';
  }
}

async function getTakeout(): Promise<TakeoutImporter> {
  const uid = uidFromToken(await getValidToken());
  if (!uid) throw new Error('Prijavite se na svoj MyPhoto nalog');
  if (takeout && takeoutUid === uid) return takeout;
  if (takeout?.isRunning()) throw new Error('Uvoz je već u toku');
  takeout?.dispose();

  // Progress fires per uploaded chunk; forward at most ~4×/s, but always
  // pass phase changes through immediately.
  let lastSent = 0;
  let lastPhase = '';
  takeoutUid = uid;
  takeout = new TakeoutImporter({
    serverUrl: store.get('serverUrl') as string,
    getToken: getValidToken,
    statePath: path.join(app.getPath('userData'), `takeout-import-${uid}.json`),
    onProgress: (p: TakeoutProgress) => {
      const now = Date.now();
      if (p.phase === lastPhase && now - lastSent < 250) return;
      lastSent = now;
      lastPhase = p.phase;
      mainWindow?.webContents.send('takeout-progress', p);
    },
    onLog: (msg) => mainWindow?.webContents.send('log', msg),
  });
  return takeout;
}

ipcMain.handle('takeout-pick', async (_event, kind: 'zip' | 'folder') => {
  const result = await dialog.showOpenDialog(
    kind === 'folder'
      ? { properties: ['openDirectory'], title: 'Izaberite raspakovan Takeout folder' }
      : {
          properties: ['openFile', 'multiSelections'],
          title: 'Izaberite Google Takeout ZIP fajlove (sve delove)',
          filters: [{ name: 'Google Takeout', extensions: ['zip'] }],
        }
  );
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle('takeout-scan', async (_event, paths: string[]) => {
  try {
    const importer = await getTakeout();
    return { summary: await importer.scan(paths) };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('takeout-start', async () => {
  try {
    const importer = await getTakeout();
    // Runs for minutes to hours — report through 'takeout-progress' events.
    importer.start().catch((e) => console.error('Takeout import error:', e));
    return { ok: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('takeout-stop', () => {
  takeout?.stop();
});

ipcMain.handle('takeout-progress', () => takeout?.getProgress() || null);

// Fixed destinations only — the renderer never hands us an arbitrary URL.
ipcMain.handle('open-link', (_event, which: 'takeout' | 'google-photos' | 'web') => {
  const urls: Record<string, string> = {
    takeout: 'https://takeout.google.com/settings/takeout/custom/photos',
    'google-photos': 'https://photos.google.com/',
    web: store.get('serverUrl') as string,
  };
  if (urls[which]) shell.openExternal(urls[which]);
});

// App lifecycle.
// Single-instance lock: the app lives in the tray with its window hidden, so
// when the user clicks the launcher again they expect the window to surface —
// not a second silent background process. Grab the lock; if another instance
// already holds it, hand off (show its window) and quit this one.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    createTray();
    // Apply the start-with-Windows preference on every launch so the default
    // (startOnBoot: true) actually registers the login item — previously this
    // only ran when settings were saved, so a fresh install never auto-started.
    applyAutoStart(store.get('startOnBoot') as boolean);
    initSyncEngine().catch((e) => console.error('initSyncEngine error:', e));
  });
}

app.on('window-all-closed', (e: Event) => {
  // Don't quit, keep in tray
  e.preventDefault();
});

app.on('activate', () => {
  mainWindow?.show();
});
