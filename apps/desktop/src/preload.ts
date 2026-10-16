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
  resolvePendingDeletes: (approve: boolean) => ipcRenderer.invoke('resolve-pending-deletes', approve),
  onPendingDeletes: (callback: (pending: unknown) => void) => {
    ipcRenderer.on('pending-deletes', (_event, pending) => callback(pending));
  },

  // Google Takeout import
  takeoutPick: (kind: 'zip' | 'folder') => ipcRenderer.invoke('takeout-pick', kind),
  takeoutScan: (paths: string[]) => ipcRenderer.invoke('takeout-scan', paths),
  takeoutStart: () => ipcRenderer.invoke('takeout-start'),
  takeoutStop: () => ipcRenderer.invoke('takeout-stop'),
  takeoutProgress: () => ipcRenderer.invoke('takeout-progress'),
  onTakeoutProgress: (callback: (p: unknown) => void) => {
    ipcRenderer.on('takeout-progress', (_event, p) => callback(p));
  },
  openLink: (which: 'takeout' | 'google-photos' | 'web') => ipcRenderer.invoke('open-link', which),

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
