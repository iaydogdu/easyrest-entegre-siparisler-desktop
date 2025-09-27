const { app, BrowserWindow, Menu, shell, ipcMain, dialog, Notification } = require('electron');
const path = require('path');

// Auto-updater'ı güvenli şekilde yükle
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (error) {
  console.warn('Auto-updater yüklenemedi:', error.message);
}

// Development ortamını kontrol et - sadece NODE_ENV kontrol et
const isDev = process.env.NODE_ENV === 'development';
const isPackaged = app.isPackaged;

class Main {
  constructor() {
    this.mainWindow = null;
    
    // Browser açılmasını engelle
    process.env.BROWSER = 'none';
    
    app.on('ready', this.createWindow.bind(this));
    app.on('window-all-closed', this.onWindowAllClosed.bind(this));
    app.on('activate', this.onActivate.bind(this));

    // Auto updater events - her zaman çalıştır (test için)
    if (autoUpdater) {
      console.log('🔄 Auto-updater başlatılıyor...', { isDev, isPackaged, version: app.getVersion() });
      
      // Uygulama başladıktan 10 saniye sonra güncellemeleri kontrol et (test için kısa)
      setTimeout(() => {
        console.log('🔍 Update kontrolü başlatılıyor...', {
          currentVersion: app.getVersion(),
          isPackaged: app.isPackaged,
          isDev: isDev,
          platform: process.platform
        });
        autoUpdater.checkForUpdatesAndNotify();
      }, 10000);
      
      // Development'ta 1 dakikada bir, production'da da 1 dakikada bir (test için)
      const interval = 60000; // 1 dakika
      setInterval(() => {
        console.log('⏰ Scheduled update check...');
        autoUpdater.checkForUpdatesAndNotify();
      }, interval);
    } else {
      console.warn('⚠️ Auto-updater mevcut değil!');
    }
    
    this.setupAutoUpdater();
    this.setupIpcHandlers();
    
    // Asset path handler
    ipcMain.handle('get-asset-path', (event, relativePath) => {
      if (isDev) {
        return `http://localhost:3002/assets/${relativePath}`;
      } else {
        // Production'da extraResources klasöründeki assets'i kullan
        const resourcesPath = process.resourcesPath;
        const assetPath = path.join(resourcesPath, 'assets', relativePath);
        const fileUrl = `file:///${assetPath.replace(/\\/g, '/')}`;
        console.log('📁 Asset path:', assetPath, '-> URL:', fileUrl);
        return fileUrl;
      }
    });
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
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js')
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

    // Development'ta DevTools aç - packaged uygulamada kapalı
    if (isDev && !isPackaged) {
      this.mainWindow.webContents.openDevTools();
      
      // Auto-updater loglarını React console'a da gönder
      setTimeout(() => {
        this.mainWindow.webContents.executeJavaScript(`
          console.log('🔄 Electron Auto-updater test başlatılıyor...');
          console.log('📋 Current version: ${app.getVersion()}');
        `);
      }, 2000);
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
                message: `EasyRest Entegre Siparişler v${app.getVersion()}`,
                detail: 'React + Electron Desktop Uygulaması'
              });
            }
          },
          {
            label: 'Güncelleme Kontrol Et',
            accelerator: 'F5',
            click: () => {
              if (autoUpdater) {
                console.log('🔍 Manuel güncelleme kontrolü başlatılıyor...');
                // React console'a da gönder
                this.mainWindow.webContents.executeJavaScript(`
                  console.log('🔍 [ELECTRON] Manuel güncelleme kontrolü başlatılıyor...');
                  console.log('📋 [ELECTRON] Current version: ${app.getVersion()}');
                  console.log('🔗 [ELECTRON] GitHub URL: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases');
                `);
                autoUpdater.checkForUpdatesAndNotify();
              } else {
                console.warn('⚠️ Auto-updater mevcut değil!');
                this.mainWindow.webContents.executeJavaScript(`
                  console.error('❌ [ELECTRON] Auto-updater mevcut değil!');
                `);
              }
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
    
    // Menu'nun görünür olduğunu kontrol et
    console.log('📋 Menu oluşturuldu:', template.length, 'item');
  }

  setupAutoUpdater() {
    // Auto updater yoksa çık
    if (!autoUpdater) {
      console.log('Auto-updater mevcut değil, güncelleme sistemi devre dışı');
      return;
    }

    // Auto updater konfigürasyonu - easyRest--FrontSecond gibi
    autoUpdater.autoDownload = true; // Otomatik indirme açık
    autoUpdater.autoInstallOnAppQuit = true; // Uygulama kapanırken otomatik yükle

    autoUpdater.on('checking-for-update', () => {
      const logData = {
        currentVersion: app.getVersion(),
        updateUrl: 'https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases',
        isDev: isDev,
        isPackaged: isPackaged
      };
      console.log('🔍 Güncellemeler kontrol ediliyor...', logData);
      
      // React console'a da gönder
      this.mainWindow.webContents.executeJavaScript(`
        console.log('🔍 [ELECTRON] Güncellemeler kontrol ediliyor...', ${JSON.stringify(logData)});
      `);
      
      this.sendToRenderer('update-status', { status: 'checking' });
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Güncelleme mevcut:', info);
      
      // React console'a da gönder
      this.mainWindow.webContents.executeJavaScript(`
        console.log('🆕 [ELECTRON] Güncelleme mevcut!', ${JSON.stringify(info)});
      `);
      
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
      const logData = {
        currentVersion: app.getVersion(),
        latestVersion: info.version,
        updateUrl: 'https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases'
      };
      console.log('📭 Güncelleme mevcut değil:', logData);
      
      // React console'a da gönder
      this.mainWindow.webContents.executeJavaScript(`
        console.log('📭 [ELECTRON] Güncelleme mevcut değil:', ${JSON.stringify(logData)});
      `);
      
      this.sendToRenderer('update-status', { status: 'not-available' });
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto updater hatası:', err);
      
      // React console'a da gönder
      this.mainWindow.webContents.executeJavaScript(`
        console.error('❌ [ELECTRON] Auto updater hatası:', '${err.message}');
      `);
      
      this.sendToRenderer('update-status', { status: 'error', error: err.message });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      console.log(`İndirme ilerlemesi: ${percent}%`);
      
      // React console'a da gönder
      this.mainWindow.webContents.executeJavaScript(`
        console.log('📥 [ELECTRON] İndirme ilerlemesi: ${percent}%', {
          transferred: ${progressObj.transferred},
          total: ${progressObj.total},
          bytesPerSecond: ${progressObj.bytesPerSecond}
        });
      `);
      
      this.sendToRenderer('update-status', { 
        status: 'downloading', 
        percent: percent,
        transferred: progressObj.transferred,
        total: progressObj.total
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
      if (autoUpdater) {
        console.log('🔍 IPC: Manual update check triggered');
        
        // Timeout ekle - 30 saniye sonra force log
        setTimeout(() => {
          this.mainWindow.webContents.executeJavaScript(`
            console.warn('⏰ [ELECTRON] Auto-updater timeout - 30 saniye geçti, response yok!');
            console.log('🔗 [ELECTRON] GitHub releases kontrol et: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases');
          `);
        }, 30000);
        
        autoUpdater.checkForUpdatesAndNotify();
      }
      return { status: 'checking' };
    });

    // Download update
    ipcMain.handle('download-update', () => {
      if (autoUpdater) {
        autoUpdater.downloadUpdate();
      }
      return { status: 'downloading' };
    });

    // Install update
    ipcMain.handle('install-update', () => {
      if (autoUpdater) {
        autoUpdater.quitAndInstall();
      }
      return { status: 'installing' };
    });

    // Show notification handler
    ipcMain.handle('show-notification', (event, title, body) => {
      console.log('📢 Notification:', title, body);
      if (Notification.isSupported()) {
        new Notification({
          title: title,
          body: body
        }).show();
      }
      return { status: 'shown' };
    });

    // Get version
    ipcMain.handle('get-version', () => {
      return app.getVersion();
    });

    // Window controls
    ipcMain.handle('minimize', () => {
      if (this.mainWindow) this.mainWindow.minimize();
    });

    ipcMain.handle('maximize', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMaximized()) {
          this.mainWindow.unmaximize();
        } else {
          this.mainWindow.maximize();
        }
      }
    });

    ipcMain.handle('close', () => {
      if (this.mainWindow) this.mainWindow.close();
    });

    // External links
    ipcMain.handle('open-external', (event, url) => {
      shell.openExternal(url);
    });

    // Execute file handler
    ipcMain.handle('execute-file', async (event, filePath) => {
      try {
        console.log('🔄 Dosya çalıştırılıyor:', filePath);
        const result = await shell.openPath(filePath);
        console.log('✅ Dosya çalıştırma sonucu:', result);
        return { success: true, result };
      } catch (error) {
        console.error('❌ Dosya çalıştırma hatası:', error);
        return { success: false, error: error.message };
      }
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