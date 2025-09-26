# EasyRest Entegre Siparişler Desktop Uygulaması

Bu doküman, mevcut Angular projenizden entegre siparişler sayfasını alarak Electron desktop uygulaması oluşturmak için gerekli tüm adımları ve dosyaları içerir.

## Proje Yapısı

```
easyrest-entegre-siparisler-desktop/
├── main.ts                          # Electron main process
├── package.json                     # Proje bağımlılıkları ve build konfigürasyonu
├── angular.json                     # Angular build konfigürasyonu
├── tsconfig.json                    # TypeScript konfigürasyonu
├── tsconfig.app.json               # Angular app TypeScript konfigürasyonu
├── .gitignore                      # Git ignore dosyası
├── README.md                       # Proje açıklaması
├── src/
│   ├── main.ts                     # Angular bootstrap
│   ├── index.html                  # Ana HTML dosyası
│   ├── styles.css                  # Global stiller
│   ├── environments/               # Environment dosyaları
│   ├── assets/                     # Statik dosyalar (resimler, i18n, vb.)
│   ├── preload.ts                  # Electron preload script
│   └── app/
│       ├── app.component.ts        # Ana component
│       ├── app.routes.ts           # Routing konfigürasyonu
│       ├── services/               # Servisler
│       ├── components/             # Componentler
│       ├── guards/                 # Route guard'ları
│       └── interceptors/           # HTTP interceptor'lar
├── dist/                          # Build çıktıları
├── release/                       # Electron build çıktıları
└── .github/
    └── workflows/
        └── build.yml              # GitHub Actions build workflow
```

## 1. Package.json

```json
{
  "name": "easyrest-entegre-siparisler",
  "version": "1.0.0",
  "description": "EasyRest Entegre Siparişler Desktop Uygulaması",
  "main": "dist/main.js",
  "homepage": "./",
  "scripts": {
    "start": "ng serve",
    "build": "ng build",
    "build:electron": "ng build --configuration production && npm run electron:build",
    "electron": "npm run build:electron && electron .",
    "electron:dev": "concurrently \"ng serve\" \"wait-on http://localhost:4200 && electron .\"",
    "electron:build": "tsc main.ts --outDir dist",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "release": "electron-builder --publish=always",
    "postinstall": "electron-builder install-app-deps"
  },
  "build": {
    "appId": "com.easyrest.entegre-siparisler",
    "productName": "EasyRest Entegre Siparişler",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.business",
      "target": "dmg"
    },
    "win": {
      "target": "nsis",
      "icon": "src/assets/icons/icon.ico"
    },
    "linux": {
      "target": "AppImage",
      "category": "Office"
    },
    "publish": {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "easyrest-entegre-siparisler"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "dependencies": {
    "@angular/animations": "^17.0.0",
    "@angular/common": "^17.0.0",
    "@angular/compiler": "^17.0.0",
    "@angular/core": "^17.0.0",
    "@angular/forms": "^17.0.0",
    "@angular/platform-browser": "^17.0.0",
    "@angular/platform-browser-dynamic": "^17.0.0",
    "@angular/router": "^17.0.0",
    "@angular/cdk": "^17.0.0",
    "@angular/material": "^17.0.0",
    "@ng-select/ng-select": "^15.0.0",
    "@ngx-translate/core": "^15.0.0",
    "@ngx-translate/http-loader": "^8.0.0",
    "rxjs": "~7.8.0",
    "tslib": "^2.3.0",
    "zone.js": "~0.14.0",
    "electron-updater": "^6.1.7"
  },
  "devDependencies": {
    "@angular-devkit/build-angular": "^17.0.0",
    "@angular/cli": "^17.0.0",
    "@angular/compiler-cli": "^17.0.0",
    "@types/node": "^18.18.0",
    "concurrently": "^8.2.2",
    "electron": "^27.0.0",
    "electron-builder": "^24.6.4",
    "typescript": "~5.2.0",
    "wait-on": "^7.2.0"
  }
}
```

## 2. Electron Main Process (main.ts)

```typescript
import { app, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as isDev from 'electron-is-dev';

class Main {
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    app.on('ready', this.createWindow);
    app.on('window-all-closed', this.onWindowAllClosed);
    app.on('activate', this.onActivate);

    // Auto updater events
    autoUpdater.checkForUpdatesAndNotify();
    this.setupAutoUpdater();
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
        enableRemoteModule: false,
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
    autoUpdater.on('checking-for-update', () => {
      console.log('Güncellemeler kontrol ediliyor...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Güncelleme mevcut:', info);
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Güncelleme Mevcut',
        message: 'Yeni bir güncelleme mevcut. İndirilecek ve yeniden başlatılacak.',
        buttons: ['Tamam']
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Güncelleme indirildi:', info);
      dialog.showMessageBox(this.mainWindow!, {
        type: 'info',
        title: 'Güncelleme Hazır',
        message: 'Güncelleme indirildi. Uygulama yeniden başlatılacak.',
        buttons: ['Şimdi Yeniden Başlat', 'Daha Sonra']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });
  }
}

new Main();
```

## 3. Preload Script (src/preload.ts)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: () => ipcRenderer.invoke('get-version'),
  minimize: () => ipcRenderer.invoke('minimize-window'),
  maximize: () => ipcRenderer.invoke('maximize-window'),
  close: () => ipcRenderer.invoke('close-window'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getPlatform: () => process.platform,
  onUpdateAvailable: (callback: Function) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback: Function) => ipcRenderer.on('update-downloaded', callback),
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
});
```

## 4. Angular Konfigürasyonları

### angular.json
```json
{
  "$schema": "./node_modules/@angular/cli/lib/config/schema.json",
  "version": 1,
  "newProjectRoot": "projects",
  "projects": {
    "easyrest-entegre-siparisler": {
      "projectType": "application",
      "schematics": {
        "@schematics/angular:component": {
          "style": "css"
        }
      },
      "root": "",
      "sourceRoot": "src",
      "prefix": "app",
      "architect": {
        "build": {
          "builder": "@angular-devkit/build-angular:browser",
          "options": {
            "outputPath": "dist",
            "index": "src/index.html",
            "main": "src/main.ts",
            "polyfills": ["zone.js"],
            "tsConfig": "tsconfig.app.json",
            "assets": ["src/favicon.ico", "src/assets"],
            "styles": ["src/styles.css"],
            "scripts": []
          },
          "configurations": {
            "production": {
              "budgets": [
                {
                  "type": "initial",
                  "maximumWarning": "2mb",
                  "maximumError": "5mb"
                }
              ],
              "outputHashing": "all"
            }
          }
        },
        "serve": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "configurations": {
            "production": {
              "buildTarget": "easyrest-entegre-siparisler:build:production"
            },
            "development": {
              "buildTarget": "easyrest-entegre-siparisler:build:development"
            }
          },
          "defaultConfiguration": "development"
        }
      }
    }
  }
}
```

### tsconfig.json
```json
{
  "compileOnSave": false,
  "compilerOptions": {
    "baseUrl": "./",
    "outDir": "./dist/out-tsc",
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "sourceMap": true,
    "declaration": false,
    "downlevelIteration": true,
    "experimentalDecorators": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "target": "ES2022",
    "module": "ES2022",
    "useDefineForClassFields": false,
    "lib": ["ES2022", "dom"]
  },
  "angularCompilerOptions": {
    "enableI18nLegacyMessageIdFormat": false,
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

### tsconfig.app.json
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}
```

## 5. Angular Uygulaması

### src/main.ts
```typescript
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { importProvidersFrom } from '@angular/core';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/interceptors/auth.interceptor';

export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        },
        defaultLanguage: 'tr'
      })
    )
  ]
}).catch(err => console.error(err));
```

### src/app/app.component.ts
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container">
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      height: 100vh;
      width: 100vw;
      overflow: hidden;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'EasyRest Entegre Siparişler';

  constructor(private translate: TranslateService) {
    this.translate.setDefaultLang('tr');
    this.translate.use('tr');
  }

  ngOnInit() {
    console.log('EasyRest Entegre Siparişler uygulaması başlatıldı');
  }
}
```

### src/app/app.routes.ts
```typescript
import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'orders',
    loadComponent: () => import('./components/orders/orders.component').then(c => c.OrdersComponent),
    canActivate: [AuthGuard]
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];
```

## 6. Servisler

### src/app/services/auth.service.ts
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  _id: string;
  kullaniciAdi: string;
  token: string;
  role: string;
  parentUser: string;
  egitimTamamlandiMi: boolean;
  magazalar: any[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.baseappurl;
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  login(kullaniciAdi: string, password: string): Observable<LoginResponse> {
    const loginData = { kullaniciAdi, password };

    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, loginData)
      .pipe(
        tap((response: LoginResponse) => {
          if (response && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response._id);
            localStorage.setItem('kullaniciAdi', response.kullaniciAdi);
            localStorage.setItem('role', response.role);
            
            if (response.magazalar && response.magazalar.length > 0) {
              localStorage.setItem('magazalar', JSON.stringify(response.magazalar));
              localStorage.setItem('selectedStore', response.magazalar[0]._id);
            }

            this.isLoggedInSubject.next(true);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('kullaniciAdi');
    localStorage.removeItem('role');
    localStorage.removeItem('magazalar');
    localStorage.removeItem('selectedStore');
    
    this.isLoggedInSubject.next(false);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getMagazalar(): any[] {
    const magazalar = localStorage.getItem('magazalar');
    return magazalar ? JSON.parse(magazalar) : [];
  }
}
```

### src/app/services/entegre-siparis.service.ts
Mevcut projenizden `src/app/service/entegre-siparis.service.ts` dosyasını kopyalayın ve import path'leri güncelleyin:

```typescript
// Mevcut dosyayı kopyalayın ve environment import'unu güncelleyin:
import { environment } from '../../environments/environment';
```

### src/app/services/notification.service.ts
```typescript
import { Injectable } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'danger';
export type NotificationPosition = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'top-center' | 'bottom-center';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Array<{
    id: string;
    message: string;
    type: NotificationType;
    position: NotificationPosition;
    timeout?: number;
  }> = [];

  constructor() {}

  showNotification(
    message: string, 
    type: NotificationType = 'info', 
    position: NotificationPosition = 'top-end',
    timeout: number = 5000
  ): void {
    const id = Date.now().toString();
    
    // Desktop notification desteği
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('EasyRest', {
        body: message,
        icon: '/assets/images/logo.svg',
        tag: id
      });

      // 5 saniye sonra kapat
      setTimeout(() => {
        notification.close();
      }, timeout);
    }

    // Browser notification fallback
    this.createToast(id, message, type, position, timeout);
  }

  private createToast(
    id: string, 
    message: string, 
    type: NotificationType, 
    position: NotificationPosition,
    timeout: number
  ): void {
    // Toast container oluştur veya mevcut olanı bul
    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        ${this.getPositionStyles(position)}
      `;
      document.body.appendChild(container);
    }

    // Toast elementi oluştur
    const toast = document.createElement('div');
    toast.id = id;
    toast.style.cssText = `
      margin: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      word-wrap: break-word;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
      ${this.getTypeStyles(type)}
    `;
    toast.textContent = message;

    // Click to close
    toast.addEventListener('click', () => {
      this.removeToast(id);
    });

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);

    // Auto remove
    setTimeout(() => {
      this.removeToast(id);
    }, timeout);
  }

  private removeToast(id: string): void {
    const toast = document.getElementById(id);
    if (toast) {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  private getPositionStyles(position: NotificationPosition): string {
    switch (position) {
      case 'top-start':
        return 'top: 20px; left: 20px;';
      case 'top-end':
        return 'top: 20px; right: 20px;';
      case 'top-center':
        return 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom-start':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-end':
        return 'bottom: 20px; right: 20px;';
      case 'bottom-center':
        return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      default:
        return 'top: 20px; right: 20px;';
    }
  }

  private getTypeStyles(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'background-color: #10b981; border: 1px solid #059669;';
      case 'error':
      case 'danger':
        return 'background-color: #ef4444; border: 1px solid #dc2626;';
      case 'warning':
        return 'background-color: #f59e0b; border: 1px solid #d97706;';
      case 'info':
        return 'background-color: #3b82f6; border: 1px solid #2563eb;';
      default:
        return 'background-color: #6b7280; border: 1px solid #4b5563;';
    }
  }

  // Notification permission iste
  requestPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}
```

### src/app/services/order.service.ts
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly baseUrl = environment.baseappurl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getOrderHesapFisi(orderId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/api/orders/${orderId}/hesap-fisi`, { 
      headers,
      responseType: 'text' 
    });
  }

  posthesapFisi(htmlContent: string): Observable<any> {
    return this.http.post('http://localhost:41411/api/receipt/print', htmlContent, {
      headers: new HttpHeaders({
        'Content-Type': 'text/html;charset=UTF-8'
      }),
      responseType: 'text'
    });
  }
}
```

### src/app/services/user.service.ts
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private readonly baseUrl = environment.baseappurl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getUserSettings(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/api/user/settings`, { headers });
  }

  updateUserSettings(settings: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put(`${this.baseUrl}/api/user/settings`, settings, { headers });
  }
}
```

## 7. Guards

### src/app/guards/auth.guard.ts
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    } else {
      this.router.navigate(['/login']);
      return false;
    }
  }
}
```

## 8. Interceptors

### src/app/interceptors/auth.interceptor.ts
```typescript
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};
```

## 9. Components

### src/app/components/login/login.component.ts
```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            EasyRest
          </h1>
          <p class="text-gray-600 dark:text-gray-300">
            {{ 'integratedorders' | translate }}
          </p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-6">
          <!-- Kullanıcı Adı -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'username' | translate }}
            </label>
            <input
              type="text"
              [(ngModel)]="kullaniciAdi"
              name="kullaniciAdi"
              required
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="{{ 'enterusername' | translate }}"
            >
          </div>

          <!-- Şifre -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ 'password' | translate }}
            </label>
            <div class="relative">
              <input
                [type]="isPasswordVisible ? 'text' : 'password'"
                [(ngModel)]="password"
                name="password"
                required
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white pr-12"
                placeholder="{{ 'enterpassword' | translate }}"
              >
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span class="material-icons text-xl">
                  {{ isPasswordVisible ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
          </div>

          <!-- Beni Hatırla -->
          <div class="flex items-center">
            <input
              type="checkbox"
              [(ngModel)]="rememberMe"
              name="rememberMe"
              id="rememberMe"
              class="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            >
            <label for="rememberMe" class="ml-2 text-sm text-gray-700 dark:text-gray-300">
              {{ 'rememberme' | translate }}
            </label>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            [disabled]="isLoading"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
          >
            <span *ngIf="!isLoading">{{ 'login' | translate }}</span>
            <span *ngIf="isLoading" class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ 'loading' | translate }}...
            </span>
          </button>
        </form>

        <!-- Footer -->
        <div class="mt-8 text-center">
          <p class="text-xs text-gray-500 dark:text-gray-400">
            © {{ currYear }} EasyRest. {{ 'allrightsreserved' | translate }}
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Custom animations */
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
      20%, 40%, 60%, 80% { transform: translateX(10px); }
    }
    
    .shake {
      animation: shake 0.82s cubic-bezier(.36,.07,.19,.97) both;
    }
  `]
})
export class LoginComponent implements OnInit {
  kullaniciAdi: string = '';
  password: string = '';
  rememberMe: boolean = false;
  isPasswordVisible: boolean = false;
  isLoading: boolean = false;
  currYear: number = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    // Remember me kontrolü
    const savedEmail = localStorage.getItem('email2');
    const savedPassword = localStorage.getItem('password');
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true';

    if (savedRememberMe) {
      this.kullaniciAdi = savedEmail || '';
      this.password = savedPassword || '';
      this.rememberMe = savedRememberMe;
    }

    // Zaten giriş yapılmışsa orders sayfasına yönlendir
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/orders']);
    }
  }

  onSubmit() {
    if (!this.kullaniciAdi || !this.password) {
      this.notificationService.showNotification(
        this.translate.instant('pleasefillallfields'),
        'warning',
        'top-end'
      );
      return;
    }

    this.isLoading = true;

    this.authService.login(this.kullaniciAdi, this.password)
      .pipe(
        catchError((error) => {
          console.error('Login failed', error);
          this.isLoading = false;

          if (error.status === 429) {
            const message = error.error?.msg || this.translate.instant("tooManyAttempts");
            const kalanDakika = error.error?.kalanDakika;

            if (kalanDakika) {
              this.notificationService.showNotification(
                `${message} (${kalanDakika} dakika kaldı)`,
                'danger',
                'top-end'
              );
            } else {
              this.notificationService.showNotification(message, 'danger', 'top-end');
            }
          } else if (error.status === 409) {
            const message = error.error?.msg || "Zaten aktif bir oturumunuz bulunmaktadır.";
            this.notificationService.showNotification(message, 'warning', 'top-end');
          } else if (error.status === 400) {
            const message = error.error?.msg
              ? this.translate.instant(error.error.msg)
              : this.translate.instant("incorrectpassword");
            this.notificationService.showNotification(message, 'danger', 'top-end');
          } else {
            this.notificationService.showNotification(
              this.translate.instant("loginError"),
              'danger',
              'top-end'
            );
          }

          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response) {
            // Remember me işlemleri
            if (this.rememberMe) {
              localStorage.setItem('email2', this.kullaniciAdi);
              localStorage.setItem('password', this.password);
              localStorage.setItem('rememberMe', 'true');
            } else {
              localStorage.removeItem('email2');
              localStorage.removeItem('password');
              localStorage.removeItem('rememberMe');
            }

            // Başarılı giriş bildirimi
            this.notificationService.showNotification(
              this.translate.instant('loginSuccess'),
              'success',
              'top-end'
            );

            // Orders sayfasına yönlendir
            this.router.navigate(['/orders']);
          }
        }
      });
  }

  togglePasswordVisibility() {
    this.isPasswordVisible = !this.isPasswordVisible;
  }
}
```

### src/app/components/login/login.component.html
Login component'i standalone olarak yazıldığı için HTML template yukarıdaki component içinde bulunmaktadır.

### src/app/components/orders/orders.component.ts
```typescript
// Mevcut projenizden src/app/apps/pages/entegresiparisler/entegresiparisler.component.ts 
// dosyasının tamamını kopyalayın ve aşağıdaki değişiklikleri yapın:

import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgSelectModule } from '@ng-select/ng-select';
import { catchError, interval, of, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { EntegreSiparisService, Order, OrderResponse } from '../../services/entegre-siparis.service';
import { NotificationService } from '../../services/notification.service';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { OrderService } from '../../services/order.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    TranslateModule, 
    NgSelectModule
  ],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  // Mevcut entegresiparisler.component.ts'deki tüm property'leri kopyalayın
  
  constructor(
    private router: Router,
    private entegreSiparisService: EntegreSiparisService,
    private notificationService: NotificationService,
    private orderService: OrderService,
    private translate: TranslateService,
    private http: HttpClient,
    private ngZone: NgZone,
    private userService: UserService,
    private authService: AuthService // AuthService ekleyin
  ) {
    this.initializeSettings();
  }

  // Logout metodu ekleyin
  logout(): void {
    this.authService.logout();
  }

  // Mevcut entegresiparisler.component.ts'deki tüm metodları kopyalayın
}
```

### src/app/components/orders/orders.component.html
```html
<!-- Mevcut projenizden src/app/apps/pages/entegresiparisler/entegresiparisler.component.html 
     dosyasının tamamını kopyalayın ve aşağıdaki header'ı ekleyin: -->

<!-- Desktop Header -->
<div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-4">
      <h1 class="text-xl font-semibold text-gray-800 dark:text-white">
        EasyRest - {{ 'integratedorders' | translate }}
      </h1>
    </div>
    <div class="flex items-center gap-2">
      <!-- Kullanıcı Bilgisi -->
      <span class="text-sm text-gray-600 dark:text-gray-400">
        {{ authService.getKullaniciAdi() }}
      </span>
      
      <!-- Logout Button -->
      <button
        (click)="logout()"
        class="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors"
      >
        {{ 'logout' | translate }}
      </button>
    </div>
  </div>
</div>

<!-- Mevcut HTML içeriğini buraya kopyalayın -->
<!-- ... tüm mevcut HTML kodu ... -->
```

### src/app/components/orders/orders.component.css
```css
/* Mevcut projenizden entegresiparisler component'inin CSS'lerini kopyalayın */
@keyframes newOrderPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.new-order-animation {
  animation: newOrderPulse 1.5s ease-in-out infinite;
}

/* Desktop specific styles */
.app-container {
  height: 100vh;
  overflow: hidden;
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

## 10. Environment Dosyaları

### src/environments/environment.ts
```typescript
export const environment = {
  production: false,
  baseappurl: 'https://api.easycorest.com:5555' // Geliştirme ortamı URL'si
};
```

### src/environments/environment.prod.ts
```typescript
export const environment = {
  production: true,
  baseappurl: 'https://api.easycorest.com:5555' // Üretim ortamı URL'si
};
```

## 11. HTML Dosyaları

### src/index.html
```html
<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8">
  <title>EasyRest Entegre Siparişler</title>
  <base href="./">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
  <style>
    /* Loading screen */
    .loading-screen {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      color: white;
    }
    
    .loading-spinner {
      width: 50px;
      height: 50px;
      border: 5px solid rgba(255,255,255,0.3);
      border-top: 5px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-bottom: 20px;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .loading-text {
      font-size: 18px;
      font-weight: 500;
    }
  </style>
</head>
<body>
  <app-root>
    <div class="loading-screen">
      <div class="loading-spinner"></div>
      <div class="loading-text">EasyRest Yükleniyor...</div>
    </div>
  </app-root>
</body>
</html>
```

### src/favicon.ico
Mevcut projenizden favicon.ico dosyasını kopyalayın.

## 12. Assets

Mevcut projenizden aşağıdaki klasörleri kopyalayın:
- `src/assets/images/` (logo ve sipariş kaynak logoları)
- `src/assets/sounds/` (bildirim sesleri)
- `src/assets/i18n/` (çeviri dosyaları)
- `src/assets/icons/` (uygulama ikonları)

### Gerekli Asset Dosyaları:
```
src/assets/
├── images/
│   ├── logo.svg
│   ├── yemek-sepeti.png
│   ├── trendyollogo.png
│   ├── migros-yemek.png
│   └── getir.png
├── sounds/
│   ├── web.mp3
│   ├── new_message.mp3
│   ├── beep.wav
│   └── success.mp3
├── icons/
│   ├── icon.png (512x512)
│   ├── icon.ico (Windows için)
│   └── icon.icns (macOS için)
└── i18n/
    └── tr.json
```

### src/assets/i18n/tr.json
```json
{
  "integratedorders": "Entegre Siparişler",
  "username": "Kullanıcı Adı",
  "password": "Şifre",
  "enterusername": "Kullanıcı adınızı girin",
  "enterpassword": "Şifrenizi girin",
  "rememberme": "Beni Hatırla",
  "login": "Giriş Yap",
  "loading": "Yükleniyor",
  "allrightsreserved": "Tüm hakları saklıdır",
  "pleasefillallfields": "Lütfen tüm alanları doldurun",
  "tooManyAttempts": "Çok fazla deneme yapıldı",
  "incorrectpassword": "Hatalı kullanıcı adı veya şifre",
  "loginError": "Giriş yapılırken hata oluştu",
  "loginSuccess": "Başarıyla giriş yapıldı",
  "logout": "Çıkış Yap",
  "total": "Toplam",
  "neworder": "Yeni Sipariş",
  "neworderhasarrived": "Yeni bir sipariş geldi",
  "volumeopen": "Ses Açık",
  "volumeclose": "Ses Kapalı",
  "volume_up": "volume_up",
  "volume_off": "volume_off",
  "auto_awesome": "auto_awesome",
  "auto_awesome_off": "auto_awesome_off",
  "orderaccepted": "Sipariş onaylandı",
  "orderaccepterror": "Sipariş onaylanırken hata oluştu",
  "termalwritesuccessful": "Termal yazdırma başarılı",
  "termalwriteerror": "Termal yazdırma hatası",
  "jsoncopied": "JSON kopyalandı",
  "jsoncopyfailed": "JSON kopyalanamadı",
  "htmlcopysuccessful": "HTML kopyalandı",
  "ordernotfound": "Sipariş bulunamadı",
  "choosestore": "Mağaza Seçin",
  "noordersyet": "Henüz sipariş yok",
  "moreproducts": "ürün daha",
  "orderdetail": "Sipariş Detayı",
  "customerinformation": "Müşteri Bilgileri",
  "namesurname": "Ad Soyad",
  "phone": "Telefon",
  "address": "Adres",
  "flat": "Daire",
  "floor": "Kat",
  "note": "Not",
  "ordercontent": "Sipariş İçeriği",
  "mapping": "Eşleştirme",
  "nomapping": "Eşleştirme Yok",
  "totalamount": "Toplam Tutar",
  "confirmtheorder": "Siparişi Onayla",
  "tekraronaygonder": "Tekrar Onay Gönder",
  "nopaymentmapping": "Ödeme Eşleştirmesi Yok",
  "schedule": "schedule",
  "ordertime": "Sipariş Zamanı",
  "inbox": "inbox",
  "LocalOrderCreated": "Yerel sipariş oluşturuldu",
  "LocalOrderCreationFailed": "Yerel sipariş oluşturulamadı",
  "AccountReceiptPrintingProcessSuccessful": "Hesap fişi yazdırma başarılı",
  "AccountReceiptPrintingProcessFailed": "Hesap fişi yazdırma başarısız",
  "AccountReceiptInformationRetrievalFailed": "Hesap fişi bilgileri alınamadı",
  "thereisnoauthorizationforthisprocessdynamic": "Bu işlem için yetkiniz yok: {errorMessage}",
  "saleresourcecouldnotbedeleted": "Satış kaynağı silinemedi"
}
```

## 12. Styles

### src/styles.css
```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen",
    "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
```

## 13. GitHub Actions Build Workflow

### .github/workflows/build.yml
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  build:
    runs-on: ${{ matrix.os }}
    
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
        
    steps:
      - name: Check out Git repository
        uses: actions/checkout@v3
        
      - name: Install Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build Angular app
        run: npm run build
        
      - name: Build Electron app
        run: npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}
          path: release/
```

## 14. Kurulum Adımları

1. Yeni klasör oluşturun: `D:\GitHub\easyrest-entegre-siparisler-desktop`
2. Bu klasörde terminal açın
3. `npm init -y` komutu ile package.json oluşturun
4. Yukarıdaki package.json içeriğini kopyalayın
5. `npm install` komutu ile bağımlılıkları yükleyin
6. Tüm dosyaları ve klasörleri oluşturun
7. Mevcut projenizden gerekli dosyaları kopyalayın
8. `npm run electron:dev` ile geliştirme modunda çalıştırın

## 15. Build ve Release

- **Geliştirme**: `npm run electron:dev`
- **Build**: `npm run dist`
- **Release**: GitHub'a push edin, otomatik build olacak

## 16. Güncelleme Sistemi

Uygulama otomatik güncelleme desteği ile gelir. GitHub Releases'ten yeni sürümleri otomatik kontrol eder ve kullanıcıya bildirir.

## 17. API Endpoint'leri ve Özellikler

### Kullanılan API Endpoint'leri:

#### Auth API'leri:
- `POST /api/auth/login` - Kullanıcı girişi
- Token tabanlı authentication

#### Sipariş API'leri:
- `GET /api/aggregated-orders/{storeId}` - Entegre siparişleri getir
- `POST /api/order-approval/approve` - Sipariş onaylama
- `PUT /api/banko/entegreSiparisHazirla` - Sipariş hazırlama
- `PUT /api/banko/entegreSiparisTamamla` - Sipariş tamamlama
- `PUT /api/banko/getOrderById` - Sipariş ID ile getir

#### Trendyol API'leri:
- `POST /api/trendyol-orders/sync/{storeId}?packageStatuses=Created` - Trendyol siparişleri sync
  - Örnek: `https://api.easycorest.com:5555/api/trendyol-orders/sync/676c048a029241c3076108f7?packageStatuses=Created`
- `GET /api/trendyol-orders-diger/{storeId}/iades?size=100&storeId={saticiId}&createdStartDate={timestamp}&createdEndDate={timestamp}` - Trendyol iadeleri
  - Örnek: `https://api.easycorest.com:5555/api/trendyol-orders-diger/676c048a029241c3076108f7/iades?size=100&storeId=1234&createdStartDate=1640995200000&createdEndDate=1641081600000`

#### YemekSepeti API'leri:
- `GET /api/yemeksepetideliveryhero/siparisRaporu?status=cancelled&pastNumberOfHours=24` - YemekSepeti iptal raporu
  - Örnek: `https://api.easycorest.com:5555/api/yemeksepetideliveryhero/siparisRaporu?status=cancelled&pastNumberOfHours=24`

#### Kullanıcı API'leri:
- `GET /api/user/settings` - Kullanıcı ayarları
- `PUT /api/user/settings` - Kullanıcı ayarlarını güncelle

#### Yazdırma API'leri:
- `GET /api/orders/{orderId}/hesap-fisi` - Hesap fişi HTML
- `POST http://localhost:41411/api/receipt/print` - Termal yazdırma

### Uygulama Özellikleri:

#### 🔐 Authentication:
- Token tabanlı giriş sistemi
- "Beni Hatırla" özelliği
- Otomatik logout
- Role-based access control

#### 🏪 Mağaza Yönetimi:
- **Login'de mağaza listesi alma**: Login response'da `magazalar` array'i gelir
- **LocalStorage'a kaydetme**: `localStorage.setItem('magazalar', JSON.stringify(response.magazalar))`
- **İlk mağazayı otomatik seçme**: `localStorage.setItem('selectedStore', response.magazalar[0]._id)`
- **Mağaza seçimi dropdown**: ng-select ile `bindLabel="magazaAdi"` ve `bindValue="_id"`
- **Mağaza değişimi**: `onStoreChange()` metodu ile API'leri yeniden başlatır
- **Mağaza ID formatı**: MongoDB ObjectId (24 karakter hex) örn: `676c048a029241c3076108f7`

#### 📱 Desktop Features:
- Electron-based desktop app
- Auto-updater (GitHub releases)
- Native notifications
- System tray integration
- Window state management
- Keyboard shortcuts

#### 🛒 Sipariş Yönetimi:
- **Real-time sipariş takibi** (10 saniye interval)
- **4 platform desteği**: Trendyol, YemekSepeti, Migros, Getir
- **Otomatik sync** sistemleri:
  - Trendyol: Her 11 saniyede
  - Trendyol İadeler: Her 1 saatte
  - YemekSepeti İadeler: Her 3 saatte
- **Sipariş filtreleme** (platform bazında)
- **Sipariş detay görüntüleme**
- **Ürün eşleştirme kontrolü**

#### 🔊 Bildirim Sistemi:
- **Ses bildirimleri** (web.mp3)
- **Desktop notifications**
- **Visual animations** (yeni siparişler için)
- **Toast notifications**
- **Ses açma/kapama** toggle

#### ⚡ Otomatik İşlemler:
- **Otomatik sipariş onaylama**
  - Eşleştirme kontrolü
  - Ödeme eşleştirmesi kontrolü
  - Platform-specific validations
- **Background sync** işlemleri
- **Retry mechanisms** (hata durumunda)
- **Connection monitoring**

#### 🖨️ Yazdırma Sistemi:
- **Termal yazıcı desteği**
- **Hesap fişi yazdırma**
- **HTML-to-Print conversion**
- **JSON export** özelliği
- **Print preview**

#### 🎨 UI/UX Features:
- **Dark/Light mode** desteği
- **Responsive design**
- **Loading states**
- **Error handling**
- **Tailwind CSS** styling
- **Material Icons**
- **Smooth animations**

#### 🔧 Teknik Özellikler:
- **Angular 17** (Standalone components)
- **RxJS** reactive programming
- **HTTP interceptors**
- **Route guards**
- **Service-based architecture**
- **TypeScript** strict mode
- **Error boundaries**
- **Memory leak prevention**

#### 📊 Monitoring:
- **Connection status** monitoring
- **API response tracking**
- **Performance metrics**
- **Error logging**
- **Retry counters**
- **Auto-reload** (hata durumunda)

#### 🔄 Data Management:
- **LocalStorage** for settings
- **Session management**
- **Cache strategies**
- **Data synchronization**
- **Conflict resolution**

### Platform-Specific Features:

#### Trendyol:
- Package status tracking
- Modifier products handling
- Promotion management
- Automatic discount calculation

#### YemekSepeti:
- Expedition type handling
- Topping management
- Customer comment processing
- Address parsing

#### Migros:
- Option/SubOption structure
- Price calculation (penny to TL)
- Delivery provider handling
- Customer info processing

#### Getir:
- Scheduled order support
- Option categories
- Client information handling
- Delivery type management

## 18. Troubleshooting

### Yaygın Sorunlar:

1. **Login Issues:**
   - Environment URL kontrolü
   - Token expiration
   - CORS settings

2. **Sipariş Yükleme:**
   - Store ID validation
   - API timeout settings
   - Network connectivity

3. **Notification Issues:**
   - Permission requests
   - Audio file paths
   - Browser compatibility

4. **Build Issues:**
   - Node.js version compatibility
   - Dependency conflicts
   - Path resolution

## Notlar

- **Backend URL**: `https://api.easycorest.com:5555` (hem dev hem prod için)
- GitHub repository bilgilerini package.json'da güncelleyin
- Icon dosyalarını src/assets/icons/ klasörüne ekleyin
- Tüm bağımlılıkları kontrol edin ve güncelleyin
- API sunucusunun CORS ayarlarını kontrol edin (`https://api.easycorest.com:5555`)
- Termal yazıcı servisi (port 41411) çalıştığından emin olun
- Notification permissions'ı kontrol edin
- SSL sertifikası geçerli olmalı (HTTPS)
