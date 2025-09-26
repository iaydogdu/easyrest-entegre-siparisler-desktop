import { contextBridge, ipcRenderer } from 'electron';

// Electron API'yi güvenli şekilde expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // Window controls
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  
  // Notifications
  showNotification: (title: string, body: string) => {
    return ipcRenderer.invoke('show-notification', { title, body });
  },
  
  // System
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

// Type declaration for window
declare global {
  interface Window {
    electronAPI: {
      getVersion: () => Promise<string>;
      minimize: () => Promise<void>;
      maximize: () => Promise<void>;
      close: () => Promise<void>;
      showNotification: (title: string, body: string) => Promise<void>;
      openExternal: (url: string) => Promise<void>;
    };
  }
}