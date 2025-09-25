# EasyRest Entegre Siparişler Desktop Uygulaması

Bu proje, EasyRest sistemi için geliştirilmiş entegre siparişleri yönetmek amacıyla oluşturulmuş Electron tabanlı desktop uygulamasıdır.

## 🚀 Özellikler

### 🔐 Authentication
- Token tabanlı giriş sistemi
- "Beni Hatırla" özelliği
- Otomatik logout
- Güvenli oturum yönetimi

### 📱 Desktop Features
- **Electron-based desktop app**
- **Auto-updater** (GitHub releases'ten otomatik güncelleme)
- **Native notifications**
- **Window state management**
- **Keyboard shortcuts**
- **Cross-platform** (Windows, macOS, Linux)

### 🔄 Otomatik Güncelleme Sistemi
- GitHub Releases'ten otomatik güncelleme kontrolü
- Uygulama başladıktan 30 saniye sonra ilk kontrol
- Her 4 saatte bir otomatik kontrol
- Manuel güncelleme kontrolü
- İndirme progress gösterimi
- Kullanıcı onayı ile yükleme

### 🛒 Sipariş Yönetimi (Yakında)
- **Real-time sipariş takibi**
- **4 platform desteği**: Trendyol, YemekSepeti, Migros, Getir
- **Otomatik sync** sistemleri
- **Sipariş filtreleme**
- **Sipariş detay görüntüleme**

## 🛠️ Teknik Özellikler

- **Angular 17** (Standalone components)
- **Electron 27**
- **TypeScript** strict mode
- **RxJS** reactive programming
- **Tailwind CSS** styling
- **electron-updater** for auto-updates
- **Multi-platform build** support

## 📦 Kurulum

### Gereksinimler
- Node.js 18+
- npm 8+

### Geliştirme Ortamı
```bash
# Bağımlılıkları yükle
npm install

# Geliştirme modunda çalıştır
npm run electron:dev
```

### Production Build
```bash
# Angular ve Electron build
npm run build:electron

# Sadece Electron çalıştır
npm run electron

# Distribution build (installer oluştur)
npm run dist
```

## 🚀 Scripts

| Script | Açıklama |
|--------|----------|
| `npm start` | Angular development server |
| `npm run build` | Angular production build |
| `npm run electron:dev` | Geliştirme modunda Electron |
| `npm run electron` | Production Electron |
| `npm run dist` | Platform installer'ları oluştur |
| `npm run pack` | Portable versiyon oluştur |

## 🔧 Konfigürasyon

### Environment Dosyaları
- `src/environments/environment.ts` - Development
- `src/environments/environment.prod.ts` - Production

### Auto-updater Konfigürasyonu
Package.json'da GitHub repository bilgilerini güncelleyin:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "YOUR_GITHUB_USERNAME",
      "repo": "easyrest-entegre-siparisler"
    }
  }
}
```

## 📋 GitHub Actions

Proje otomatik build ve release sistemi ile gelir:
- Tag push edildiğinde otomatik build
- Windows, macOS, Linux için installer'lar
- GitHub Releases'e otomatik upload

### Release Oluşturma
```bash
# Version tag oluştur
git tag v1.0.0
git push origin v1.0.0
```

## 🔄 Güncelleme Sistemi

### Otomatik Güncelleme
- Uygulama başladıktan 30 saniye sonra kontrol
- Her 4 saatte bir otomatik kontrol
- GitHub Releases'ten yeni versiyon kontrolü
- Kullanıcı onayı ile indirme ve yükleme

### Manuel Güncelleme
- Menüden "Güncellemeleri Kontrol Et"
- Login ekranından güncelleme butonu
- Orders sayfasından güncelleme durumu

## 🎨 UI/UX Features

- **Modern ve temiz arayüz**
- **Dark/Light mode** desteği
- **Responsive design**
- **Loading states**
- **Error handling**
- **Smooth animations**
- **Native notifications**

## 🔧 API Endpoints

### Auth API
- `POST /api/auth/login` - Kullanıcı girişi

### Base URL
- Development: `https://api.easycorest.com:5555`
- Production: `https://api.easycorest.com:5555`

## 📁 Proje Yapısı

```
easyrest-entegre-siparisler-desktop/
├── main.ts                          # Electron main process
├── package.json                     # Bağımlılıklar ve build config
├── src/
│   ├── main.ts                     # Angular bootstrap
│   ├── index.html                  # Ana HTML
│   ├── preload.ts                  # Electron preload script
│   ├── environments/               # Environment dosyaları
│   ├── assets/                     # Statik dosyalar
│   └── app/
│       ├── components/             # Angular componentler
│       ├── services/               # Servisler
│       ├── guards/                 # Route guard'ları
│       └── interceptors/           # HTTP interceptor'lar
├── .github/workflows/              # GitHub Actions
└── release/                        # Build çıktıları
```

## 🔍 Troubleshooting

### Yaygın Sorunlar

1. **Build Issues:**
   - Node.js version uyumluluğu kontrol edin
   - `npm ci` ile temiz kurulum yapın
   - Cache temizleyin: `npm run clean`

2. **Auto-updater Issues:**
   - GitHub repository ayarlarını kontrol edin
   - GH_TOKEN permissions'ı kontrol edin
   - Release assets'ların doğru upload edildiğini kontrol edin

3. **Development Issues:**
   - Port 4200'ün boş olduğunu kontrol edin
   - Electron version uyumluluğu
   - TypeScript errors'ları kontrol edin

## 📝 Notlar

- **Backend URL**: `https://api.easycorest.com:5555`
- GitHub repository bilgilerini package.json'da güncelleyin
- Icon dosyalarını `src/assets/icons/` klasörüne ekleyin
- SSL sertifikası geçerli olmalı (HTTPS)
- Auto-updater sadece production build'de çalışır

## 📞 Destek

Herhangi bir sorun veya soru için lütfen GitHub Issues kullanın.

## 📄 Lisans

Bu proje EasyRest tarafından geliştirilmiştir.
