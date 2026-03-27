import { app, BrowserWindow, Tray, Menu, dialog, ipcMain, nativeImage, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import Store from 'electron-store';
import { SyncEngine } from './sync-engine';

const store = new Store({
  defaults: {
    syncFolder: '',
    apiToken: '',
    serverUrl: 'https://myphotomy.space',
    syncEnabled: true,
    startOnBoot: true,
    showNotifications: true,
  },
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let syncEngine: SyncEngine | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 620,
    resizable: false,
    maximizable: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
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
  // Create a simple tray icon (16x16 blue square as placeholder)
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  let trayIcon: nativeImage;

  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath);
  } else {
    // Generate a simple icon programmatically
    trayIcon = nativeImage.createEmpty();
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

function initSyncEngine() {
  const syncFolder = store.get('syncFolder') as string;
  const apiToken = store.get('apiToken') as string;
  const serverUrl = store.get('serverUrl') as string;

  if (!syncFolder || !apiToken) return;

  // Ensure sync folder exists
  if (!fs.existsSync(syncFolder)) {
    fs.mkdirSync(syncFolder, { recursive: true });
  }

  syncEngine = new SyncEngine({
    syncFolder,
    apiToken,
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
  initSyncEngine();

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
      const err = await response.json();
      return { success: false, error: err.error || 'Login failed' };
    }

    const data = await response.json();
    store.set('apiToken', data.token);
    return { success: true, token: data.token };
  } catch (err: any) {
    return { success: false, error: err.message || 'Connection failed' };
  }
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
  initSyncEngine();
});

app.on('window-all-closed', (e: Event) => {
  // Don't quit, keep in tray
  e.preventDefault();
});

app.on('activate', () => {
  mainWindow?.show();
});
