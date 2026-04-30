import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config: Record<string, unknown>) => ipcRenderer.invoke('save-config', config),
  selectFolder: () => ipcRenderer.invoke('select-folder'),

  // Auth
  login: (email: string, password: string) => ipcRenderer.invoke('login', email, password),

  // Sync
  getSyncStats: () => ipcRenderer.invoke('get-sync-stats'),
  forceSync: () => ipcRenderer.invoke('force-sync'),

  // Events from main process
  onNotification: (callback: (data: { title: string; message: string }) => void) => {
    ipcRenderer.on('notification', (_event, data) => callback(data));
  },
  onLog: (callback: (msg: string) => void) => {
    ipcRenderer.on('log', (_event, msg) => callback(msg));
  },
  onSyncStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('sync-status', (_event, status) => callback(status));
  },
});
