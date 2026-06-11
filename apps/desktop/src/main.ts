import { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import { randomBytes } from 'crypto';
import Store from 'electron-store';
import { SyncEngine } from './sync-engine';

const store = new Store({
  defaults: {
    syncFolder: '',
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

// Single instance only. Auto-start + a manual launch (or repeated clicks) were
// spawning several parallel MyPhoto processes. If we don't get the lock another
// instance is already running — quit immediately and just focus that one.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}
let syncEngine: SyncEngine | null = null;

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

  // Temporary debug aid — open DevTools so renderer-side errors are
  // visible while we're stabilising the login flow. Remove before
  // shipping a packaged build.
  mainWindow.webContents.openDevTools({ mode: 'detach' });

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

  syncEngine = new SyncEngine({
    syncFolder,
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
  });

  if (store.get('syncEnabled')) {
    syncEngine.start();
  }
}

// IPC handlers for renderer
ipcMain.handle('get-config', () => ({
  syncFolder: store.get('syncFolder'),
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

  // Auto-start on boot
  app.setLoginItemSettings({
    openAtLogin: config.startOnBoot as boolean || false,
  });

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

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  createTray();
  // Apply the start-with-Windows preference on every launch so the default
  // (startOnBoot: true) actually registers the login item — previously this
  // only ran when settings were saved, so a fresh install never auto-started.
  app.setLoginItemSettings({ openAtLogin: store.get('startOnBoot') as boolean });
  initSyncEngine().catch((e) => console.error('initSyncEngine error:', e));
});

app.on('window-all-closed', (e: Event) => {
  // Don't quit, keep in tray
  e.preventDefault();
});

app.on('activate', () => {
  mainWindow?.show();
});
