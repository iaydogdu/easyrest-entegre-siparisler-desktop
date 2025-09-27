const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Version
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('minimize'),
  maximize: () => ipcRenderer.invoke('maximize'),
  close: () => ipcRenderer.invoke('close'),
  
  // Notifications
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', title, body),
  
  // External links
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Asset paths için
  getAssetPath: (relativePath) => {
    return ipcRenderer.invoke('get-asset-path', relativePath);
  },
  
  // Auto-updater controls
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  
  // File execution
  executeFile: (filePath) => ipcRenderer.invoke('execute-file', filePath)
});
