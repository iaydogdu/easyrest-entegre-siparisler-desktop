import { contextBridge, ipcRenderer } from 'electron';

// Type definitions for ElectronAPI
interface ElectronAPI {
  // Versiyon ve uygulama bilgileri
  getAppVersion: () => Promise<{
    version: string;
    electron: string;
    node: string;
    platform: string;
  }>;
  
  // Güncelleme sistemi
  checkForUpdates: () => Promise<any>;
  onUpdateStatus: (callback: (event: any, data: any) => void) => void;
  removeUpdateStatusListener: () => void;
  
  // Pencere kontrolü
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  restartApp: () => Promise<void>;
  
  // Platform bilgisi
  platform: string;
  
  // Event listener yönetimi
  removeAllListeners: (channel: string) => void;
}

const electronAPI: ElectronAPI = {
  // Versiyon ve uygulama bilgileri
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Güncelleme sistemi
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', callback);
  },
  removeUpdateStatusListener: () => {
    ipcRenderer.removeAllListeners('update-status');
  },
  
  // Pencere kontrolü
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  restartApp: () => ipcRenderer.invoke('restart-app'),
  
  // Platform bilgisi
  platform: process.platform,
  
  // Event listener yönetimi
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
};

// ElectronAPI'yi global scope'a ekle
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript için global type tanımlaması
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
