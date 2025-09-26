# 📋 EasyRest Desktop - ADIM ADIM KURULUM REHBERİ

## 🎯 Kurulum Öncesi Hazırlık

### Sistem Gereksinimleri
```
💻 İşletim Sistemi:
  - Windows 10/11 (64-bit önerilen)
  - macOS 10.15+ (Catalina veya üzeri)
  - Linux Ubuntu 18.04+ / CentOS 8+

🔧 Yazılım Gereksinimleri:
  - Node.js 18.x veya üzeri
  - npm 9.x veya üzeri
  - Git 2.x
  - Visual Studio Code (önerilen)

💾 Donanım Gereksinimleri:
  - RAM: 8 GB (minimum 4 GB)
  - Disk: 2 GB boş alan
  - İnternet: Stabil bağlantı
```

### Gerekli Hesaplar
- **GitHub hesabı** (repository için)
- **EasyRest API erişimi** (`https://api.easycorest.com:5555`)

## 📥 1. ADIM: Proje Kurulumu

### Repository Clone
```bash
# 1. Projeyi klonlayın
git clone https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop.git

# 2. Proje klasörüne girin
cd easyrest-entegre-siparisler-desktop

# 3. Branch kontrolü
git branch -a
git checkout main
```

### Dependencies Kurulumu
```bash
# 1. Node.js version kontrolü
node --version  # 18.x olmalı
npm --version   # 9.x olmalı

# 2. Dependencies yükle
npm install

# 3. Kurulum kontrolü
npm ls --depth=0

# 4. Angular CLI global kurulum (gerekirse)
npm install -g @angular/cli@17

# 5. Electron global kurulum (gerekirse)
npm install -g electron@27
```

## 📁 2. ADIM: Dosya Yapısı Oluşturma

### Temel Klasör Yapısı
```bash
# Klasörleri oluşturun
mkdir -p src/app/components/login
mkdir -p src/app/components/orders
mkdir -p src/app/services
mkdir -p src/app/guards
mkdir -p src/app/interceptors
mkdir -p src/assets/images
mkdir -p src/assets/sounds
mkdir -p src/assets/icons
mkdir -p src/assets/i18n
mkdir -p src/environments
mkdir -p .github/workflows
mkdir -p build
mkdir -p scripts
```

### Dosya Kopyalama Listesi
```bash
# Mevcut Angular projesinden kopyalanacak dosyalar:

# 1. Asset dosyaları
cp ../easyRest-Angular/src/assets/images/* src/assets/images/
cp ../easyRest-Angular/src/assets/sounds/* src/assets/sounds/

# 2. i18n dosyaları
cp ../easyRest-Angular/src/assets/i18n/tr.json src/assets/i18n/

# 3. Service dosyaları (import path'leri güncellenecek)
cp ../easyRest-Angular/src/app/service/entegre-siparis.service.ts src/app/services/
cp ../easyRest-Angular/src/app/service/order.service.ts src/app/services/
cp ../easyRest-Angular/src/app/service/user.service.ts src/app/services/

# 4. Component dosyaları (uyarlanacak)
cp ../easyRest-Angular/src/app/apps/pages/entegresiparisler/entegresiparisler.component.ts src/app/components/orders/orders.component.ts
cp ../easyRest-Angular/src/app/apps/pages/entegresiparisler/entegresiparisler.component.html src/app/components/orders/orders.component.html
```

## 🔧 3. ADIM: Konfigürasyon Dosyaları

### package.json Oluşturma
```bash
# Mevcut package.json'ı güncelle
cat > package.json << 'EOF'
{
  "name": "easyrest-entegre-siparisler",
  "version": "1.0.0",
  "description": "EasyRest Entegre Siparişler Desktop Uygulaması",
  "main": "dist/main.js",
  "homepage": "./",
  "scripts": {
    "start": "ng serve --port 4200",
    "build": "ng build --configuration production",
    "electron": "npm run build && electron .",
    "electron:dev": "concurrently \"npm run start\" \"wait-on http://localhost:4200 && electron .\"",
    "dist": "npm run build && electron-builder",
    "release": "npm run build && electron-builder --publish=always"
  },
  "build": {
    "appId": "com.easyrest.entegre-siparisler",
    "productName": "EasyRest Entegre Siparişler",
    "directories": { "output": "release" },
    "files": ["dist/**/*", "node_modules/**/*", "package.json"],
    "win": { "target": "nsis", "icon": "src/assets/icons/icon.ico" },
    "mac": { "target": "dmg", "icon": "src/assets/icons/icon.icns" },
    "linux": { "target": "AppImage", "icon": "src/assets/icons/icon.png" },
    "publish": {
      "provider": "github",
      "owner": "iaydogdu",
      "repo": "easyrest-entegre-siparisler-desktop"
    }
  }
}
EOF
```

### Environment Dosyaları
```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  baseappurl: 'https://api.easycorest.com:5555'
};

// src/environments/environment.prod.ts  
export const environment = {
  production: true,
  baseappurl: 'https://api.easycorest.com:5555'
};
```

### TypeScript Konfigürasyonu
```bash
# tsconfig.json oluştur
cat > tsconfig.json << 'EOF'
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
  }
}
EOF
```

## 🎨 4. ADIM: Asset Dosyaları Hazırlama

### Icon Dosyaları Oluşturma
```bash
# Icon klasörü
mkdir -p src/assets/icons

# Gerekli icon dosyaları:
# - icon.png (512x512) - Ana uygulama ikonu
# - icon.ico (Windows)
# - icon.icns (macOS)
# - tray-icon.png (16x16, 32x32) - System tray
# - tray-icon-alert.png (16x16, 32x32) - Alert state
```

### Platform Logoları
```bash
# Platform logoları (mevcut projeden kopyala)
# - yemek-sepeti.png
# - trendyollogo.png  
# - migros-yemek.png
# - getir.png
# - logo.svg (EasyRest logo)

# Logo boyutları kontrol et
file src/assets/images/*.png
file src/assets/images/*.svg
```

### Ses Dosyaları
```bash
# Ses dosyalarını kopyala
cp ../easyRest-Angular/src/assets/sounds/web.mp3 src/assets/sounds/
cp ../easyRest-Angular/src/assets/sounds/success.mp3 src/assets/sounds/
cp ../easyRest-Angular/src/assets/sounds/info.mp3 src/assets/sounds/
cp ../easyRest-Angular/src/assets/sounds/beep.wav src/assets/sounds/

# Ses dosyaları test et
ls -la src/assets/sounds/
```

## 🔧 5. ADIM: Component Oluşturma

### Login Component
```bash
# Login component dosyalarını oluştur
# Kılavuz dosyalarından kopyala:
# - 08-HTML-TEMPLATE-DETAYLARI.md
# - ENTEGRE-SIPARISLER-DETAYLI-KILAVUZ.md

# Login component'i oluştur
cat > src/app/components/login/login.component.ts << 'EOF'
// Kılavuzdaki login component kodunu buraya kopyala
EOF
```

### Orders Component
```bash
# Orders component dosyalarını oluştur
# Mevcut entegresiparisler component'ini uyarla

# 1. TypeScript dosyası
cp ../easyRest-Angular/src/app/apps/pages/entegresiparisler/entegresiparisler.component.ts src/app/components/orders/orders.component.ts

# 2. HTML template
cp ../easyRest-Angular/src/app/apps/pages/entegresiparisler/entegresiparisler.component.html src/app/components/orders/orders.component.html

# 3. Import path'leri güncelle
sed -i 's|src/app/service/|../../services/|g' src/app/components/orders/orders.component.ts
sed -i 's|src/app/apps/NotificationService|../../services/notification.service|g' src/app/components/orders/orders.component.ts
sed -i 's|src/environments/environment|../../../environments/environment|g' src/app/components/orders/orders.component.ts
```

### Service Dosyaları
```bash
# Service dosyalarını oluştur ve import path'leri güncelle

# 1. Auth Service (yeni oluştur)
cat > src/app/services/auth.service.ts << 'EOF'
// Kılavuzdaki auth service kodunu buraya kopyala
EOF

# 2. Notification Service (yeni oluştur)  
cat > src/app/services/notification.service.ts << 'EOF'
// Kılavuzdaki notification service kodunu buraya kopyala
EOF

# 3. Entegre Siparis Service (mevcut dosyayı uyarla)
# Import path'leri güncelle
sed -i 's|src/environments/environment.prod|../../environments/environment|g' src/app/services/entegre-siparis.service.ts

# 4. Order Service (mevcut dosyayı uyarla)
sed -i 's|src/environments/environment|../../environments/environment|g' src/app/services/order.service.ts

# 5. User Service (mevcut dosyayı uyarla)  
sed -i 's|src/environments/environment|../../environments/environment|g' src/app/services/user.service.ts
```

## ⚡ 6. ADIM: Development Test

### İlk Çalıştırma
```bash
# 1. Angular development server test
npm run start
# Browser'da http://localhost:4200 açılmalı

# 2. Electron development test
npm run electron:dev
# Electron penceresi açılmalı

# 3. Build test
npm run build
# dist/ klasörü oluşmalı

# 4. Electron production test
npm run electron
# Production build ile Electron çalışmalı
```

### Debug ve Troubleshooting
```bash
# 1. Console log'ları kontrol et
# Browser DevTools: F12
# Electron DevTools: Ctrl+Shift+I

# 2. Network tab'ında API istekleri kontrol et
# - https://api.easycorest.com:5555/api/auth/login
# - https://api.easycorest.com:5555/api/aggregated-orders/{storeId}

# 3. Application tab'ında localStorage kontrol et
# - token
# - magazalar
# - selectedStore
# - soundEnabled
# - autoApproveEnabled

# 4. Console'da hata mesajları kontrol et
# - Import path hataları
# - Service injection hataları
# - API CORS hataları
```

### Yaygın Sorunlar ve Çözümleri
```bash
# SORUN 1: Import path hataları
# ÇÖZÜM: Relative path'leri kontrol et
find src -name "*.ts" -exec grep -l "src/app/" {} \;
# Bu dosyalardaki import path'leri ../../ ile güncelle

# SORUN 2: Asset dosyaları bulunamıyor
# ÇÖZÜM: Asset path'leri kontrol et
ls -la src/assets/images/
ls -la src/assets/sounds/
# Eksik dosyaları mevcut projeden kopyala

# SORUN 3: API CORS hatası
# ÇÖZÜM: Electron webSecurity'yi false yap (main.ts'te yapıldı)

# SORUN 4: Notification permission
# ÇÖZÜM: Browser'da notification permission'ı manuel olarak ver
```

## 🏗️ 7. ADIM: Production Build

### Build Hazırlığı
```bash
# 1. Dependencies kontrol et
npm audit
npm audit fix

# 2. Lint kontrol et
npm run lint

# 3. Test et (varsa)
npm run test

# 4. Environment kontrol et
cat src/environments/environment.prod.ts
# baseappurl doğru olmalı: https://api.easycorest.com:5555
```

### Electron Build
```bash
# 1. Development build test
npm run build
ls -la dist/

# 2. Electron build test
npm run dist
ls -la release/

# 3. Platform-specific build
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

### Build Verification
```bash
# 1. Build artifacts kontrol et
ls -la release/
# .exe, .dmg, .AppImage dosyaları olmalı

# 2. File size kontrol et
du -sh release/*
# Dosyalar 100-200MB arası olmalı

# 3. Executable test et
# Windows: release/*.exe dosyasını çalıştır
# macOS: release/*.dmg'yi mount et ve uygulamayı çalıştır
# Linux: release/*.AppImage'ı executable yap ve çalıştır
```

## 🚀 8. ADIM: GitHub Release

### Release Hazırlığı
```bash
# 1. Version bump
npm version patch  # 1.0.0 -> 1.0.1
# veya
npm version minor  # 1.0.0 -> 1.1.0
# veya  
npm version major  # 1.0.0 -> 2.0.0

# 2. Changelog güncelle
echo "## v$(node -p require('./package.json').version) - $(date +%Y-%m-%d)" >> CHANGELOG.md
echo "- Yeni özellikler ve düzeltmeler" >> CHANGELOG.md

# 3. Git commit
git add .
git commit -m "chore: bump version to $(node -p require('./package.json').version)"

# 4. Git tag
git tag "v$(node -p require('./package.json').version)"

# 5. Push
git push origin main
git push origin --tags
```

### GitHub Actions Trigger
```bash
# GitHub Actions otomatik başlayacak:
# 1. Test pipeline çalışacak
# 2. Build pipeline çalışacak (Windows, macOS, Linux)
# 3. Release oluşturulacak
# 4. Artifacts upload edilecek

# Progress takip et:
# https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/actions
```

## 📱 9. ADIM: Auto-Update Test

### Auto-Update Konfigürasyonu
```typescript
// main.ts'te auto-updater test
// Development'ta test etmek için:

if (isDev) {
  // Test update server
  autoUpdater.setFeedURL({
    provider: 'generic',
    url: 'http://localhost:3000/updates'
  });
}
```

### Update Test Server (Opsiyonel)
```javascript
// test-update-server.js
const express = require('express');
const app = express();

app.get('/updates/latest', (req, res) => {
  res.json({
    version: '1.0.1',
    releaseDate: new Date().toISOString(),
    url: 'http://localhost:3000/updates/easyrest-1.0.1.exe'
  });
});

app.listen(3000, () => {
  console.log('🔄 Test update server: http://localhost:3000');
});
```

## 🔍 10. ADIM: Deployment Verification

### Functionality Test Checklist
```
✅ Login Sistemi:
  [ ] Kullanıcı adı/şifre ile giriş
  [ ] "Beni hatırla" çalışıyor
  [ ] Hatalı giriş mesajları
  [ ] Mağaza listesi geliyor
  [ ] Token localStorage'a kaydediliyor

✅ Mağaza Yönetimi:
  [ ] Mağaza dropdown çalışıyor
  [ ] Mağaza değişimi API'leri tetikliyor
  [ ] selectedStore localStorage'a kaydediliyor

✅ Sipariş Sistemi:
  [ ] Real-time sipariş takibi (10s)
  [ ] Platform filtreleri çalışıyor
  [ ] Sipariş detayları açılıyor
  [ ] Yeni sipariş animasyonları

✅ Ses Sistemi:
  [ ] Ses açma/kapama toggle
  [ ] web.mp3 dosyası çalıyor
  [ ] Yeni sipariş geldiğinde ses çalıyor
  [ ] Ses loop sistemi çalışıyor

✅ Otomatik Onay:
  [ ] Otomatik onay açma/kapama
  [ ] Eşleştirme kontrolü çalışıyor
  [ ] Ödeme eşleştirmesi kontrolü
  [ ] Platform-specific onay koşulları

✅ Background Sync:
  [ ] Trendyol sync (11s) çalışıyor
  [ ] Trendyol refund sync (1h) çalışıyor
  [ ] YemekSepeti refund sync (3h) çalışıyor
  [ ] Sync status indicators güncelleniyor

✅ Termal Yazdırma:
  [ ] Termal yazıcı servisi bağlantısı
  [ ] Sipariş yazdırma çalışıyor
  [ ] Hesap fişi yazdırma çalışıyor
  [ ] HTML format doğru

✅ Desktop Features:
  [ ] Window management (minimize, maximize)
  [ ] System tray integration
  [ ] Keyboard shortcuts
  [ ] Auto-updater çalışıyor
  [ ] Native notifications

✅ Error Handling:
  [ ] API hataları yakalanıyor
  [ ] Network kesintilerinde retry
  [ ] Ardışık hatada auto-reload
  [ ] User-friendly error messages
```

### Performance Test
```bash
# 1. Memory usage kontrol et
# Task Manager / Activity Monitor'da RAM kullanımı
# Normal: 150-300MB
# Yüksek yük: 400-500MB

# 2. CPU usage kontrol et
# İdle: %1-5
# Active: %10-20

# 3. Network traffic kontrol et
# API istekleri düzenli aralıklarla
# Gereksiz istek yok

# 4. Startup time kontrol et
# İlk açılış: 3-5 saniye
# Sonraki açılışlar: 1-3 saniye
```

## 📊 11. ADIM: Monitoring ve Analytics

### Error Tracking Setup
```typescript
// Error tracking service
export class ErrorTrackingService {
  private errors: Array<{
    timestamp: string;
    error: string;
    context: string;
    userId?: string;
    version: string;
  }> = [];

  logError(error: any, context: string): void {
    const errorEntry = {
      timestamp: new Date().toISOString(),
      error: error.toString(),
      context,
      userId: localStorage.getItem('userId') || undefined,
      version: '1.0.0' // Package.json'dan al
    };

    this.errors.push(errorEntry);
    
    // Son 100 hatayı tut
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100);
    }

    // Console'a log
    console.error(`❌ [${context}]`, error);

    // Kritik hatalarda notification
    if (this.isCriticalError(error)) {
      this.sendCriticalErrorNotification(errorEntry);
    }
  }

  private isCriticalError(error: any): boolean {
    const criticalKeywords = [
      'network error',
      'authentication failed',
      'cannot connect',
      'server error 500'
    ];

    const errorStr = error.toString().toLowerCase();
    return criticalKeywords.some(keyword => errorStr.includes(keyword));
  }

  getErrorReport(): string {
    const recentErrors = this.errors.slice(-20);
    
    return `
📊 ERROR REPORT
===============
Toplam Hata: ${this.errors.length}
Son 24 Saat: ${this.errors.filter(e => 
  Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
).length}

Son 20 Hata:
${recentErrors.map(e => `${e.timestamp} [${e.context}]: ${e.error}`).join('\n')}
`;
  }
}
```

### Usage Analytics
```typescript
// Analytics service
export class AnalyticsService {
  private events: Array<{
    event: string;
    timestamp: string;
    data?: any;
  }> = [];

  trackEvent(event: string, data?: any): void {
    this.events.push({
      event,
      timestamp: new Date().toISOString(),
      data
    });

    console.log(`📊 Analytics: ${event}`, data);
  }

  // Önemli event'ler
  trackLogin(success: boolean): void {
    this.trackEvent('login', { success });
  }

  trackOrderApproval(platform: string, auto: boolean): void {
    this.trackEvent('order_approval', { platform, auto });
  }

  trackPrint(platform: string, success: boolean): void {
    this.trackEvent('thermal_print', { platform, success });
  }

  getUsageReport(): any {
    const last24h = this.events.filter(e => 
      Date.now() - new Date(e.timestamp).getTime() < 24 * 60 * 60 * 1000
    );

    return {
      totalEvents: this.events.length,
      last24h: last24h.length,
      eventTypes: this.groupBy(last24h, 'event'),
      sessionDuration: this.calculateSessionDuration()
    };
  }

  private groupBy(array: any[], key: string): any {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = (result[group] || 0) + 1;
      return result;
    }, {});
  }

  private calculateSessionDuration(): number {
    if (this.events.length < 2) return 0;
    
    const first = new Date(this.events[0].timestamp).getTime();
    const last = new Date(this.events[this.events.length - 1].timestamp).getTime();
    
    return Math.round((last - first) / 1000 / 60); // dakika
  }
}
```

## 🔧 12. ADIM: Final Configuration

### Git Hooks Setup
```bash
# Pre-commit hook
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/sh
echo "🔍 Pre-commit checks..."

# Lint check
npm run lint
if [ $? -ne 0 ]; then
  echo "❌ Lint hatası! Commit iptal edildi."
  exit 1
fi

# Build test
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Build hatası! Commit iptal edildi."
  exit 1
fi

echo "✅ Pre-commit checks passed"
EOF

chmod +x .git/hooks/pre-commit
```

### VS Code Workspace Settings
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "files.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/release": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/dist": true,
    "**/release": true
  }
}
```

### Environment Variables Setup
```bash
# .env dosyası (development için)
cat > .env << 'EOF'
# Development environment
NODE_ENV=development
ELECTRON_IS_DEV=true

# API Configuration  
API_BASE_URL=https://api.easycorest.com:5555
THERMAL_PRINTER_URL=http://localhost:41411

# Build Configuration
ELECTRON_BUILDER_CACHE=.cache/electron-builder
ELECTRON_CACHE=.cache/electron

# Debug
DEBUG=electron-builder
VERBOSE=true
EOF

# .env'i .gitignore'a ekle
echo ".env" >> .gitignore
```

## 📋 13. ADIM: Final Checklist

### Deployment Checklist
```
🔧 Teknik Kontroller:
  [ ] Tüm dependencies yüklü
  [ ] Import path'leri doğru
  [ ] Environment URL'leri doğru
  [ ] Asset dosyaları mevcut
  [ ] Icon dosyaları doğru boyutlarda
  [ ] Build başarılı
  [ ] Electron çalışıyor

🎯 Fonksiyonel Kontroller:
  [ ] Login çalışıyor
  [ ] Mağaza seçimi çalışıyor
  [ ] Siparişler yükleniyor
  [ ] Real-time refresh çalışıyor
  [ ] Ses sistemi çalışıyor
  [ ] Otomatik onay çalışıyor
  [ ] Termal yazdırma çalışıyor
  [ ] Background sync'ler çalışıyor

🚀 Release Kontroller:
  [ ] GitHub repository hazır
  [ ] GitHub Actions workflow çalışıyor
  [ ] Release artifacts oluşuyor
  [ ] Auto-updater çalışıyor
  [ ] Code signing (opsiyonel)

📱 Desktop Kontroller:
  [ ] Window management çalışıyor
  [ ] System tray çalışıyor
  [ ] Keyboard shortcuts çalışıyor
  [ ] Native notifications çalışıyor
  [ ] Multi-platform uyumluluk
```

### Go-Live Checklist
```
🌐 Production Hazırlık:
  [ ] API sunucusu hazır (https://api.easycorest.com:5555)
  [ ] CORS ayarları yapıldı
  [ ] SSL sertifikası geçerli
  [ ] Database bağlantısı stabil

📦 Distribution:
  [ ] GitHub Releases sayfası hazır
  [ ] Download linkleri çalışıyor
  [ ] Checksums doğru
  [ ] Release notes hazır

👥 User Support:
  [ ] Kurulum dökümanı hazır
  [ ] User manual hazır
  [ ] Support email/sistem hazır
  [ ] FAQ hazır

🔄 Monitoring:
  [ ] Error tracking aktif
  [ ] Usage analytics aktif
  [ ] Performance monitoring
  [ ] Auto-update monitoring
```

## 🎉 14. ADIM: Launch!

### Production Launch
```bash
# 1. Final version tag
git tag v1.0.0
git push origin v1.0.0

# 2. GitHub Actions'ı izle
# https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/actions

# 3. Release'i kontrol et
# https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases

# 4. Download test et
# Her platform için executable'ı test et

# 5. Auto-update test et
# Eski versiyonu çalıştır, yeni version'ı algılayıp algılamadığını kontrol et
```

### Post-Launch Monitoring
```bash
# 1. Error logs kontrol et
tail -f ~/.config/easyrest-entegre-siparisler/logs/main.log

# 2. User feedback topla
# GitHub Issues, email, support channels

# 3. Performance metrics kontrol et
# Memory usage, CPU usage, network usage

# 4. Update adoption rate kontrol et
# GitHub Releases download statistics
```

---

## 🎯 Özet: Baştan Sona Kurulum

```bash
# Tek komutla hızlı kurulum
git clone https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop.git
cd easyrest-entegre-siparisler-desktop
npm install
# Asset dosyalarını mevcut projeden kopyala
npm run electron:dev
```

**🎉 Tebrikler!** EasyRest Entegre Siparişler Desktop uygulamanız hazır!

### 📞 Destek ve Yardım
- **GitHub Issues**: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/issues
- **Documentation**: Bu MD dosyaları
- **Email**: support@easyrest.com (örnek)

### 🔄 Sonraki Adımlar
1. User feedback topla
2. Performance optimize et
3. Yeni özellikler ekle
4. Regular updates yayınla
5. Platform desteğini genişlet
