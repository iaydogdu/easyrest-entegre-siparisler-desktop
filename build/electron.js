const { app, BrowserWindow, Menu, shell, ipcMain, dialog, Notification } = require('electron');
const path = require('path');

// Auto-updater'ı güvenli şekilde yükle
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
  console.warn('Auto-updater yüklenemedi:', error.message);
}

// Development ortamını kontrol et
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

class Main {
  constructor() {
    this.mainWindow = null;
    
    // Browser açılmasını engelle
    process.env.BROWSER = 'none';
    
    app.on('ready', this.createWindow.bind(this));
    app.on('window-all-closed', this.onWindowAllClosed.bind(this));
    app.on('activate', this.onActivate.bind(this));

    // Auto updater events - sadece production'da ve autoUpdater varsa çalıştır
    if (!isDev && autoUpdater) {
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

  createWindow() {
    // Ana pencereyi oluştur
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1200,
      minHeight: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false
      },
      icon: path.join(__dirname, 'assets/icons/icon.png'),
      titleBarStyle: 'default',
      show: false,
      backgroundColor: '#ffffff'
    });

    // React uygulamasını yükle
    const startUrl = isDev 
      ? 'http://localhost:3002' 
      : `file://${path.join(__dirname, '../build/index.html')}`;
    
    this.mainWindow.loadURL(startUrl);

    // Development'ta DevTools aç
    if (isDev) {
      this.mainWindow.webContents.openDevTools();
    }

    // Pencere hazır olduğunda göster
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Pencere kapatıldığında
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    // External linkler için
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Menu'yu kur
    this.setupMenu();
  }

  onWindowAllClosed() {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  onActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }

  setupMenu() {
    const template = [
      {
        label: 'EasyRest',
        submenu: [
          {
            label: 'Hakkında',
            click: () => {
              dialog.showMessageBox(this.mainWindow, {
                type: 'info',
                title: 'EasyRest Entegre Siparişler',
                message: 'EasyRest Entegre Siparişler v1.0.1',
                detail: 'React + Electron Desktop Uygulaması'
              });
            }
          },
          { type: 'separator' },
          {
            label: 'Çıkış',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Görünüm',
        submenu: [
          { role: 'reload', label: 'Yenile' },
          { role: 'forceReload', label: 'Zorla Yenile' },
          { role: 'toggleDevTools', label: 'Geliştirici Araçları' },
          { type: 'separator' },
          { role: 'resetZoom', label: 'Zoom Sıfırla' },
          { role: 'zoomIn', label: 'Yakınlaştır' },
          { role: 'zoomOut', label: 'Uzaklaştır' },
          { type: 'separator' },
          { role: 'togglefullscreen', label: 'Tam Ekran' }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupAutoUpdater() {
    // Auto updater yoksa çık
    if (!autoUpdater) {
      console.log('Auto-updater mevcut değil, güncelleme sistemi devre dışı');
      return;
    }

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
          icon: path.join(__dirname, 'assets/icons/icon.png')
        }).show();
      }

      this.sendToRenderer('update-status', { 
        status: 'available', 
        version: info.version,
        releaseNotes: info.releaseNotes 
      });

      // Kullanıcıya sor
      dialog.showMessageBox(this.mainWindow, {
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
      console.log(`İndirme ilerlemesi: ${Math.round(progressObj.percent)}%`);
      this.sendToRenderer('update-status', { 
        status: 'downloading', 
        percent: Math.round(progressObj.percent) 
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Güncelleme indirildi:', info);
      this.sendToRenderer('update-status', { status: 'downloaded' });

      // Kullanıcıya restart sor
      dialog.showMessageBox(this.mainWindow, {
        type: 'info',
        title: 'Güncelleme Hazır',
        message: 'Güncelleme başarıyla indirildi!',
        detail: 'Uygulamayı yeniden başlatarak güncellemeyi tamamlayabilirsiniz.',
        buttons: ['Şimdi Yeniden Başlat', 'Daha Sonra'],
        defaultId: 0,
        cancelId: 1
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }

  setupIpcHandlers() {
    // Manual update check
    ipcMain.handle('check-for-updates', () => {
      if (!isDev && autoUpdater) {
        autoUpdater.checkForUpdatesAndNotify();
      }
      return { status: 'checking' };
    });

    // Download update
    ipcMain.handle('download-update', () => {
      if (!isDev && autoUpdater) {
        autoUpdater.downloadUpdate();
      }
      return { status: 'downloading' };
    });

    // Install update
    ipcMain.handle('install-update', () => {
      if (!isDev && autoUpdater) {
        autoUpdater.quitAndInstall();
      }
      return { status: 'installing' };
    });
  }

  sendToRenderer(channel, data) {
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.send(channel, data);
    }
  }
}

// Uygulama başlat
new Main();