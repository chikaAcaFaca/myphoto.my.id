import { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
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

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
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
    onStatus: (status) => updateTrayMenu(status),
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
  syncEngine?.stop();
  initSyncEngine().catch((e) => console.error('initSyncEngine error:', e));

  // Auto-start on boot. In a packaged build process.execPath is the app's own
  // exe, so the bare form is correct. In dev (`electron .`) process.execPath is
  // the bare electron.exe — registering THAT alone makes Windows launch
  // Electron's built-in "welcome" app at boot (the stray "Electron" window), so
  // we must also hand it the app path.
  const openAtLogin = (config.startOnBoot as boolean) || false;
  app.setLoginItemSettings(
    process.defaultApp
      ? { openAtLogin, path: process.execPath, args: [path.resolve(process.argv[1])] }
      : { openAtLogin }
  );

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
    return { success: true, token: data.token };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
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
