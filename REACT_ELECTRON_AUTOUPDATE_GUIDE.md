# 🚀 React-Electron AutoUpdater Sistemi Kurulum Rehberi

## 📋 İçindekiler
1. [Paket Kurulumu](#paket-kurulumu)
2. [Main Process (Electron) Ayarları](#main-process-ayarları)
3. [Renderer Process (React) Ayarları](#renderer-process-ayarları)
4. [Package.json Konfigürasyonu](#packagejson-konfigürasyonu)
5. [GitHub Repository Ayarları](#github-repository-ayarları)
6. [Build ve Deploy](#build-ve-deploy)
7. [Test ve Sorun Giderme](#test-ve-sorun-giderme)

## 📦 Paket Kurulumu

### 1. Temel Paketler
```bash
# Ana bağımlılıklar
npm install electron-updater --save

# Development bağımlılıkları
npm install electron --save-dev
npm install electron-builder --save-dev

# React için (eğer yoksa)
npm install react react-dom
npm install @types/react @types/react-dom --save-dev
```

### 2. TypeScript Desteği (Opsiyonel)
```bash
npm install @types/electron --save-dev
```

## ⚡ Main Process Ayarları

### `main.js` veya `main.ts` dosyası:

```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

// AutoUpdater ayarları - sadece production'da
if (!isDev) {
  console.log('[AutoUpdater] Production modu - electron-updater aktif');
  
  // electron-updater konfigürasyonu
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  
  // GitHub repository ayarları
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'GITHUB_USERNAME',      // Değiştirin!
    repo: 'GITHUB_REPOSITORY',     // Değiştirin!
    private: false
  });
  
  // Event handler'lar
  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Güncelleme kontrol ediliyor...');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Güncelleme mevcut:', info.version);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-available', info);
    }
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] Son sürüm kullanılıyor.');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-not-available');
    }
  });

  autoUpdater.on('error', (err) => {
    console.log('[AutoUpdater] Güncelleme hatası:', err.message);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-error', err);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`[AutoUpdater] İndiriliyor: ${percent}%`);
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[AutoUpdater] Güncelleme hazır! 5 saniye sonra yeniden başlatılacak...');
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('update-downloaded');
    }
    
    // 5 saniye bekle ve otomatik yeniden başlat
    setTimeout(() => {
      console.log('[AutoUpdater] Yeniden başlatılıyor...');
      autoUpdater.quitAndInstall();
    }, 5000);
  });
  
  console.log('[AutoUpdater] Event handler'lar ayarlandı');
} else {
  console.log('[AutoUpdater] Development modu - güncelleme kontrolü devre dışı');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // React uygulamasını yükle
  const startUrl = isDev 
    ? 'http://localhost:3000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Development'ta DevTools aç
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handler'lar
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
});

app.whenReady().then(() => {
  createWindow();
  
  // AutoUpdater başlat (sadece production'da)
  if (!isDev) {
    // 5 saniye sonra ilk kontrol
    setTimeout(() => {
      console.log('[AutoUpdater] İlk güncelleme kontrolü başlatılıyor...');
      autoUpdater.checkForUpdates();
    }, 5000);
    
    // Her 5 dakikada bir kontrol et
    setInterval(() => {
      console.log('[AutoUpdater] Periyodik güncelleme kontrolü...');
      autoUpdater.checkForUpdates();
    }, 5 * 60 * 1000); // 5 dakika
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
```

## 🔗 Preload Script

### `preload.js` dosyası:

```javascript
const { contextBridge, ipcRenderer } = require('electron');

// React'e güvenli API expose et
contextBridge.exposeInMainWorld('electronAPI', {
  // App bilgileri
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Update kontrolleri
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  
  // Update event listener'ları
  onUpdateChecking: (callback) => {
    ipcRenderer.on('update-checking', callback);
  },
  
  onUpdateAvailable: (callback) => {
    ipcRenderer.on('update-available', (event, info) => callback(info));
  },
  
  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on('update-not-available', callback);
  },
  
  onUpdateError: (callback) => {
    ipcRenderer.on('update-error', (event, error) => callback(error));
  },
  
  onUpdateProgress: (callback) => {
    ipcRenderer.on('update-progress', (event, progress) => callback(progress));
  },
  
  onUpdateDownloaded: (callback) => {
    ipcRenderer.on('update-downloaded', callback);
  },
  
  // Cleanup
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});
```

## ⚛️ React Component

### `UpdateManager.jsx` komponenti:

```jsx
import React, { useState, useEffect } from 'react';

const UpdateManager = () => {
  const [updateStatus, setUpdateStatus] = useState('idle');
  const [updateInfo, setUpdateInfo] = useState(null);
  const [progress, setProgress] = useState(0);
  const [version, setVersion] = useState('');
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // App version'ı al
    window.electronAPI?.getAppVersion().then(setVersion);

    // Update event listener'ları
    window.electronAPI?.onUpdateChecking(() => {
      setUpdateStatus('checking');
      setShowNotification(true);
      console.log('🔄 Güncelleme kontrol ediliyor...');
    });

    window.electronAPI?.onUpdateAvailable((info) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      setShowNotification(true);
      console.log('📥 Güncelleme mevcut:', info.version);
    });

    window.electronAPI?.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      setTimeout(() => {
        setShowNotification(false);
        setUpdateStatus('idle');
      }, 3000);
      console.log('✅ Son sürüm kullanılıyor');
    });

    window.electronAPI?.onUpdateError((error) => {
      setUpdateStatus('error');
      setTimeout(() => {
        setShowNotification(false);
        setUpdateStatus('idle');
      }, 5000);
      console.log('❌ Güncelleme hatası:', error.message);
    });

    window.electronAPI?.onUpdateProgress((progressObj) => {
      setProgress(Math.round(progressObj.percent));
      console.log(`📊 İndiriliyor: ${Math.round(progressObj.percent)}%`);
    });

    window.electronAPI?.onUpdateDownloaded(() => {
      setUpdateStatus('downloaded');
      console.log('✅ Güncelleme hazır! Yeniden başlatılıyor...');
    });

    // Cleanup
    return () => {
      window.electronAPI?.removeAllListeners('update-checking');
      window.electronAPI?.removeAllListeners('update-available');
      window.electronAPI?.removeAllListeners('update-not-available');
      window.electronAPI?.removeAllListeners('update-error');
      window.electronAPI?.removeAllListeners('update-progress');
      window.electronAPI?.removeAllListeners('update-downloaded');
    };
  }, []);

  const handleManualCheck = () => {
    window.electronAPI?.checkForUpdates();
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Güncelleme kontrol ediliyor...';
      case 'available':
        return `Yeni sürüm (${updateInfo?.version}) indiriliyor...`;
      case 'not-available':
        return 'Son sürüm kullanılıyor';
      case 'error':
        return 'Güncelleme hatası';
      case 'downloaded':
        return 'Güncelleme hazır! Yeniden başlatılıyor...';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (updateStatus) {
      case 'checking':
        return 'bg-blue-500';
      case 'available':
        return 'bg-yellow-500';
      case 'not-available':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'downloaded':
        return 'bg-green-600';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Version Display */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-mono text-gray-600">
          v{version}
        </span>
        
        {/* Loading Spinner */}
        {updateStatus === 'checking' && (
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        )}
        
        {/* Manual Check Button */}
        <button
          onClick={handleManualCheck}
          className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded"
          disabled={updateStatus === 'checking'}
        >
          Güncelleme Kontrol Et
        </button>
      </div>

      {/* Update Notification */}
      {showNotification && (
        <div className={`${getStatusColor()} text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 max-w-xs`}>
          <div className="flex items-center gap-2">
            {updateStatus === 'checking' && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            
            {updateStatus === 'available' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            )}
            
            {updateStatus === 'downloaded' && (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
            
            <div>
              <div className="text-sm font-medium">{getStatusMessage()}</div>
              {updateStatus === 'available' && (
                <div className="text-xs opacity-90">
                  İndirme: %{progress}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UpdateManager;
```

## 🎯 React App.js'e Entegrasyon

### `App.js` dosyasında:

```jsx
import React from 'react';
import UpdateManager from './components/UpdateManager';
import './App.css';

function App() {
  return (
    <div className="App">
      {/* Ana uygulamanız */}
      <header className="App-header">
        <h1>React Electron Uygulaması</h1>
        {/* Diğer componentleriniz */}
      </header>
      
      {/* AutoUpdater Manager */}
      <UpdateManager />
    </div>
  );
}

export default App;
```

## 📄 Package.json Konfigürasyonu

```json
{
  "name": "react-electron-app",
  "version": "0.1.0",
  "main": "main.js",
  "homepage": "./",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "electron": "electron .",
    "electron-dev": "ELECTRON_IS_DEV=true electron .",
    "dist": "npm run build && electron-builder",
    "publish": "npm run build && electron-builder --publish=always",
    "pack": "npm run build && electron-builder --dir"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "electron-updater": "^6.1.7"
  },
  "devDependencies": {
    "electron": "^29.4.0",
    "electron-builder": "^24.13.3",
    "react-scripts": "5.0.1"
  },
  "build": {
    "appId": "com.yourcompany.react-electron-app",
    "productName": "React Electron App",
    "directories": {
      "output": "dist"
    },
    "files": [
      "build/**/*",
      "main.js",
      "preload.js",
      "node_modules/**/*"
    ],
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": ["AppImage"],
      "icon": "assets/icon.png"
    },
    "nsis": {
      "oneClick": true,
      "perMachine": false,
      "allowElevation": false,
      "runAfterFinish": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    },
    "publish": {
      "provider": "github",
      "owner": "GITHUB_USERNAME",
      "repo": "GITHUB_REPOSITORY"
    }
  }
}
```

## 🎨 CSS Stilleri (Tailwind veya CSS)

### Tailwind CSS ile:
```jsx
// UpdateManager component'inde zaten Tailwind kullandık
```

### Vanilla CSS ile:
```css
/* UpdateManager.css */
.update-container {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 1000;
}

.version-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.version-text {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #666;
}

.update-notification {
  background: #3b82f6;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-width: 300px;
  transition: all 0.3s ease;
}

.update-notification.success {
  background: #10b981;
}

.update-notification.error {
  background: #ef4444;
}

.update-notification.warning {
  background: #f59e0b;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
```

## 🔧 GitHub Repository Ayarları

### 1. Repository Oluştur:
```
Repository Name: react-electron-app
Visibility: Public (AutoUpdater için gerekli)
```

### 2. GitHub Token:
```bash
# GitHub → Settings → Developer settings → Personal access tokens
# Permissions: repo (full control)
```

### 3. Environment Variable:
```bash
# Windows
$env:GH_TOKEN = "github_pat_xxxxxxxx"

# macOS/Linux
export GH_TOKEN="github_pat_xxxxxxxx"
```

## 🚀 Build ve Deploy

### 1. Development Test:
```bash
# React uygulamasını başlat
npm start

# Başka terminal'de Electron'u başlat
npm run electron-dev
```

### 2. Production Build:
```bash
# React build + Electron package
npm run dist

# React build + Electron package + GitHub publish
npm run publish
```

### 3. Manuel Release (İlk kez):
```bash
# Build oluştur
npm run dist

# GitHub'da manuel release oluştur
# dist/ klasöründeki dosyaları yükle
```

## 🧪 Test ve Sorun Giderme

### 1. Development Test:
```javascript
// main.js'te geçici olarak
const isDev = false; // Test için

// Test ettikten sonra geri çevir
const isDev = require('electron-is-dev');
```

### 2. Console Log'ları:
```javascript
// React'te
console.log('Update status:', updateStatus);

// Electron'da (F12 ile görünür)
console.log('[AutoUpdater] Test mesajı');
```

### 3. Common Issues:

#### "Update URL is not set":
```javascript
// Çözüm: setFeedURL doğru ayarlandığından emin ol
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'iaydogdu',
  repo: 'react-electron-app',
  private: false
});
```

#### "Cannot find latest.yml":
```bash
# Çözüm: GitHub'da release oluştur ve latest.yml yükle
npm run publish
```

#### "Permission denied":
```json
// Çözüm: package.json'da
"nsis": {
  "perMachine": false,
  "allowElevation": false
}
```

## 📂 Proje Yapısı

```
react-electron-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   └── UpdateManager.jsx
│   ├── App.js
│   └── index.js
├── main.js
├── preload.js
├── package.json
└── dist/ (build sonrası)
```

## 🎯 Kullanım Örnekleri

### React Hook ile:
```jsx
import { useState, useEffect } from 'react';

const useAutoUpdater = () => {
  const [updateState, setUpdateState] = useState({
    status: 'idle',
    version: '',
    progress: 0,
    error: null
  });

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable((info) => {
      setUpdateState(prev => ({
        ...prev,
        status: 'downloading',
        version: info.version
      }));
    });

    // Diğer event listener'lar...
  }, []);

  return updateState;
};

// Kullanım
const MyComponent = () => {
  const updateState = useAutoUpdater();
  
  return (
    <div>
      {updateState.status === 'downloading' && (
        <div>Güncelleme indiriliyor: %{updateState.progress}</div>
      )}
    </div>
  );
};
```

## 🚀 Production Deployment

### 1. İlk Release:
```bash
npm run build
npm run publish
```

### 2. Sonraki Güncellemeler:
```bash
# Version artır
npm version patch  # 0.1.0 → 0.1.1
npm version minor  # 0.1.0 → 0.2.0
npm version major  # 0.1.0 → 1.0.0

# Build ve publish
npm run publish
```

### 3. Otomatik Pipeline (GitHub Actions):
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run publish
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## ⚙️ Gelişmiş Ayarlar

### 1. Update Kanal Seçimi:
```javascript
// main.js'te
autoUpdater.channel = 'latest'; // veya 'beta', 'alpha'
```

### 2. Özel Update Server:
```javascript
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://yourserver.com/updates/'
});
```

### 3. Update Politikaları:
```javascript
autoUpdater.autoDownload = false; // Manuel indirme
autoUpdater.autoInstallOnAppQuit = false; // Manuel kurulum
```

## 🔒 Güvenlik Önerileri

1. **Code Signing**: Production'da kod imzalama
2. **HTTPS**: Update server'ı HTTPS kullanmalı
3. **Checksum**: Dosya bütünlüğü kontrolü
4. **Permissions**: Minimum gerekli yetkiler

## 📞 Destek

Bu rehberi takip ederek React-Electron projenizde mükemmel çalışan bir AutoUpdater sistemi kurabilirsiniz!

**Önemli:** GitHub repository adlarını ve kullanıcı adınızı değiştirmeyi unutmayın!
