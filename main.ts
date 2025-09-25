import { app, BrowserWindow, Menu, shell, ipcMain, dialog, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';

// Development ortamını kontrol et
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

class Main {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    app.on('ready', this.createWindow);
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);

    // Auto updater events - sadece production'da çalıştır
    if (!isDev) {
      // Uygulama başladıktan 30 saniye sonra güncellemeleri kontrol et
      setTimeout(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 30000);
      
      // Her 4 saatte bir güncelleme kontrol et
      setInterval(() => {
        autoUpdater.checkForUpdatesAndNotify();
      }, 4 * 60 * 60 * 1000);
    }
    
    this.setupAutoUpdater();
    this.setupIpcHandlers();
  }

  private createWindow = (): void => {
    // Ana pencereyi oluştur
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js')
      },
      icon: path.join(__dirname, '../src/assets/icons/icon.png'),
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#ffffff'
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      
      if (isDev) {
        this.mainWindow?.webContents.openDevTools();
      }
    });

    const url = isDev 
      ? 'http://localhost:4200' 
      : `file://${path.join(__dirname, '../dist/index.html')}`;
    
    this.mainWindow.loadURL(url);

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    this.setupMenu();
  };

  private onWindowAllClosed = (): void => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  };

  private onActivate = (): void => {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  };

  private setupMenu(): void {
    const template: any[] = [
      {
        label: 'Dosya',
        submenu: [
          {
            label: 'Yenile',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.mainWindow?.reload()
          },
          {
            label: 'DevTools Aç',
            accelerator: 'F12',
            click: () => this.mainWindow?.webContents.toggleDevTools()
          },
          { type: 'separator' },
          {
            label: 'Çıkış',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Görünüm',
        submenu: [
          {
            label: 'Yakınlaştır',
            accelerator: 'CmdOrCtrl+Plus',
            click: () => {
              const currentZoom = this.mainWindow?.webContents.getZoomLevel() || 0;
              this.mainWindow?.webContents.setZoomLevel(currentZoom + 0.5);
            }
          },
          {
            label: 'Uzaklaştır',
            accelerator: 'CmdOrCtrl+-',
            click: () => {
              const currentZoom = this.mainWindow?.webContents.getZoomLevel() || 0;
              this.mainWindow?.webContents.setZoomLevel(currentZoom - 0.5);
            }
          },
          {
            label: 'Normal Boyut',
            accelerator: 'CmdOrCtrl+0',
            click: () => this.mainWindow?.webContents.setZoomLevel(0)
          },
          { type: 'separator' },
          {
            label: 'Tam Ekran',
            accelerator: 'F11',
            click: () => {
              const isFullScreen = this.mainWindow?.isFullScreen();
              this.mainWindow?.setFullScreen(!isFullScreen);
            }
          }
        ]
      },
      {
        label: 'Yardım',
        submenu: [
          {
            label: 'Hakkında',
            click: () => {
              dialog.showMessageBox(this.mainWindow!, {
                type: 'info',
                title: 'Hakkında',
                message: 'EasyRest Entegre Siparişler',
                detail: `Versiyon: ${app.getVersion()}\nElectron: ${process.versions.electron}\nNode.js: ${process.versions.node}`
              });
            }
          },
          {
            label: 'Güncellemeleri Kontrol Et',
            click: () => autoUpdater.checkForUpdatesAndNotify()
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  private setupAutoUpdater(): void {
    // Auto updater konfigürasyonu
    autoUpdater.autoDownload = false; // Otomatik indirme kapalı
    autoUpdater.autoInstallOnAppQuit = true; // Uygulama kapanırken otomatik yükle

    autoUpdater.on('checking-for-update', () => {
      console.log('Güncellemeler kontrol ediliyor...');
      this.sendToRenderer('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Güncelleme mevcut:', info);
      
      // Native notification göster
      if (Notification.isSupported()) {
        new Notification({
          title: 'EasyRest - Güncelleme Mevcut',
          body: `Versiyon ${info.version} mevcut. İndirmek ister misiniz?`,
          icon: path.join(__dirname, '../src/assets/icons/icon.png')
        }).show();
      }

      this.sendToRenderer('update-status', { 
        status: 'available', 
        version: info.version,
        releaseNotes: info.releaseNotes 
      });

      // Kullanıcıya sor
      dialog.showMessageBox(this.mainWindow!, {
        type: 'question',
        title: 'Güncelleme Mevcut',
        message: `EasyRest v${info.version} mevcut!`,
        detail: 'Yeni güncellemeyi indirmek ister misiniz?',
        buttons: ['İndir ve Yükle', 'Daha Sonra'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Güncelleme mevcut değil:', info);
      this.sendToRenderer('update-status', { status: 'not-available' });
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto updater hatası:', err);
      this.sendToRenderer('update-status', { status: 'error', error: err.message });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`İndirme ilerlemesi: ${progressObj.percent}%`);
      this.sendToRenderer('update-status', { 
        status: 'downloading', 
        progress: Math.round(progressObj.percent) 
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Güncelleme indirildi:', info);
      
      // Native notification göster
      if (Notification.isSupported()) {
        new Notification({
          title: 'EasyRest - Güncelleme Hazır',
          body: 'Güncelleme indirildi. Yeniden başlatmak ister misiniz?',
          icon: path.join(__dirname, '../src/assets/icons/icon.png')
        }).show();
      }

      this.sendToRenderer('update-status', { 
        status: 'downloaded', 
        version: info.version 
      });

      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Güncelleme Hazır',
        message: `EasyRest v${info.version} yükleme için hazır!`,
        detail: 'Uygulamayı yeniden başlatarak güncellemeyi yüklemek ister misiniz?',
        buttons: ['Şimdi Yeniden Başlat', 'Uygulama Kapanırken Yükle'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall(false, true);
        }
      });
    });
  }

  private setupIpcHandlers(): void {
    // Versiyon bilgisi
    ipcMain.handle('get-app-version', () => {
      return {
        version: app.getVersion(),
        electron: process.versions.electron,
        node: process.versions.node,
        platform: process.platform
      };
    });

    // Manuel güncelleme kontrolü
    ipcMain.handle('check-for-updates', () => {
      if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      } else {
        return { message: 'Geliştirme modunda güncelleme kontrolü yapılmaz' };
      }
    });

    // Pencere kontrolü
    ipcMain.handle('minimize-window', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('close-window', () => {
      this.mainWindow?.close();
    });

    // Uygulama yeniden başlatma
    ipcMain.handle('restart-app', () => {
      app.relaunch();
      app.exit();
    });
  }

  private sendToRenderer(channel: string, data: any): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

new Main();
