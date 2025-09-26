# 🚀 Build ve Deploy Kılavuzu - TAMAMEN DETAYLI

## 📦 GitHub Actions CI/CD Pipeline

### Workflow Configuration (.github/workflows/build.yml)
```yaml
name: Build and Release EasyRest Desktop

on:
  push:
    tags:
      - 'v*'
    branches:
      - main
      - develop
  pull_request:
    branches:
      - main
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g., 1.0.0)'
        required: false
        default: ''

env:
  NODE_VERSION: '18'
  ELECTRON_CACHE: ~/.cache/electron
  ELECTRON_BUILDER_CACHE: ~/.cache/electron-builder

jobs:
  test:
    runs-on: ubuntu-latest
    name: Test and Lint
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 🔧 Install dependencies
        run: |
          npm ci --prefer-offline --no-audit
          
      - name: 🧪 Run tests
        run: |
          npm run test:ci
          
      - name: 🔍 Run linting
        run: |
          npm run lint
          
      - name: 🏗️ Test build
        run: |
          npm run build

  build:
    needs: test
    runs-on: ${{ matrix.os }}
    
    strategy:
      fail-fast: false
      matrix:
        include:
          - os: windows-latest
            platform: win
            arch: x64
            ext: exe
          - os: windows-latest
            platform: win
            arch: ia32
            ext: exe
          - os: macos-latest
            platform: mac
            arch: x64
            ext: dmg
          - os: macos-latest
            platform: mac
            arch: arm64
            ext: dmg
          - os: ubuntu-latest
            platform: linux
            arch: x64
            ext: AppImage
        
    name: Build ${{ matrix.platform }}-${{ matrix.arch }}
    
    steps:
      - name: 📥 Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 📦 Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: 🍎 Setup macOS signing (macOS only)
        if: matrix.platform == 'mac'
        run: |
          echo "Setting up macOS code signing..."
          # Code signing certificates burada setup edilecek
          
      - name: 🔧 Install dependencies
        run: |
          npm ci --prefer-offline --no-audit
          
      - name: 🏗️ Build Angular app
        run: |
          npm run build
          
      - name: 📊 Build info
        run: |
          echo "Build bilgileri:"
          echo "Platform: ${{ matrix.platform }}"
          echo "Architecture: ${{ matrix.arch }}"
          echo "Node version: $(node --version)"
          echo "NPM version: $(npm --version)"
          echo "Commit: ${{ github.sha }}"
          echo "Branch: ${{ github.ref_name }}"
          
      - name: 🔨 Build Electron app
        run: |
          npm run dist
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          CSC_LINK: ${{ secrets.CSC_LINK }}
          CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
          APPLEID: ${{ secrets.APPLEID }}
          APPLEIDPASS: ${{ secrets.APPLEIDPASS }}
          
      - name: 📊 Build artifacts info
        run: |
          echo "Build artifacts:"
          ls -la release/ || dir release\
          
      - name: 📤 Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: easyrest-desktop-${{ matrix.platform }}-${{ matrix.arch }}
          path: |
            release/*.exe
            release/*.dmg
            release/*.AppImage
            release/*.zip
            release/*.tar.gz
          retention-days: 30

      - name: 📊 Calculate checksums
        if: startsWith(github.ref, 'refs/tags/')
        run: |
          cd release
          if command -v sha256sum > /dev/null; then
            sha256sum * > checksums.txt
          elif command -v shasum > /dev/null; then
            shasum -a 256 * > checksums.txt
          fi
          
      - name: 🚀 Create Release
        if: startsWith(github.ref, 'refs/tags/') && matrix.platform == 'win' && matrix.arch == 'x64'
        uses: softprops/action-gh-release@v1
        with:
          files: |
            release/*.exe
            release/*.dmg
            release/*.AppImage
            release/checksums.txt
          draft: false
          prerelease: false
          generate_release_notes: true
          body: |
            ## 🎉 EasyRest Entegre Siparişler Desktop v${{ github.ref_name }}
            
            ### 📱 Desktop Uygulaması Özellikleri:
            - ✅ Real-time sipariş takibi (10 saniye interval)
            - ✅ 4 platform desteği (Trendyol, YemekSepeti, Migros, Getir)
            - ✅ Otomatik sipariş onaylama sistemi
            - ✅ Ses ve desktop bildirimleri
            - ✅ Termal yazdırma desteği
            - ✅ Otomatik güncelleme sistemi
            
            ### 🔄 Background Sync Sistemleri:
            - Trendyol Siparişler: Her 11 saniyede
            - Trendyol İadeler: Her 1 saatte
            - YemekSepeti İadeler: Her 3 saatte
            
            ### 📥 İndirme Linkleri:
            - **Windows (64-bit)**: `easyrest-entegre-siparisler-Setup-${{ github.ref_name }}.exe`
            - **Windows (32-bit)**: `easyrest-entegre-siparisler-ia32-Setup-${{ github.ref_name }}.exe`
            - **macOS (Intel)**: `easyrest-entegre-siparisler-${{ github.ref_name }}.dmg`
            - **macOS (Apple Silicon)**: `easyrest-entegre-siparisler-${{ github.ref_name }}-arm64.dmg`
            - **Linux**: `easyrest-entegre-siparisler-${{ github.ref_name }}.AppImage`
            
            ### 🔧 Sistem Gereksinimleri:
            - **Windows**: Windows 10 veya üzeri
            - **macOS**: macOS 10.15 (Catalina) veya üzeri
            - **Linux**: Ubuntu 18.04 veya üzeri
            
            ### 🌐 Backend Konfigürasyonu:
            - API URL: `https://api.easycorest.com:5555`
            - Termal Yazıcı: `http://localhost:41411`
            
            ### 📋 Kurulum Sonrası:
            1. Uygulamayı çalıştırın
            2. EasyRest hesap bilgilerinizle giriş yapın
            3. Mağaza seçin
            4. Entegre siparişler otomatik olarak takip edilmeye başlar
            
            **⚠️ Not**: Termal yazdırma için ayrı yazıcı servisi gereklidir.
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  notify:
    needs: build
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/')
    
    steps:
      - name: 📢 Notify success
        run: |
          echo "✅ Release başarıyla oluşturuldu: ${{ github.ref_name }}"
          # Burada Slack, Discord, email notification'ları eklenebilir
```

### Package.json Build Scripts
```json
{
  "scripts": {
    "ng": "ng",
    "start": "ng serve --port 4200 --host 0.0.0.0",
    "build": "ng build --configuration production",
    "build:dev": "ng build --configuration development",
    "test": "ng test",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadless --code-coverage",
    "lint": "ng lint",
    "e2e": "ng e2e",
    
    "electron": "npm run build && npm run electron:serve",
    "electron:serve": "wait-on http://localhost:4200 && electron .",
    "electron:dev": "concurrently \"npm run start\" \"npm run electron:serve\"",
    "electron:build": "npm run build && electron-builder",
    "electron:build:dir": "npm run build && electron-builder --dir",
    
    "pack": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder",
    "dist:win": "npm run build && electron-builder --win",
    "dist:mac": "npm run build && electron-builder --mac",
    "dist:linux": "npm run build && electron-builder --linux",
    
    "release": "npm run build && electron-builder --publish=always",
    "release:win": "npm run build && electron-builder --win --publish=always",
    "release:mac": "npm run build && electron-builder --mac --publish=always",
    "release:linux": "npm run build && electron-builder --linux --publish=always",
    
    "postinstall": "electron-builder install-app-deps",
    "clean": "rimraf dist release",
    "clean:all": "rimraf dist release node_modules package-lock.json",
    
    "version:patch": "npm version patch && git push && git push --tags",
    "version:minor": "npm version minor && git push && git push --tags",
    "version:major": "npm version major && git push && git push --tags"
  }
}
```

## 🔧 Electron Builder Configuration

### Detaylı electron-builder Config
```json
{
  "build": {
    "appId": "com.easyrest.entegre-siparisler",
    "productName": "EasyRest Entegre Siparişler",
    "artifactName": "${productName}-${version}-${platform}-${arch}.${ext}",
    "copyright": "Copyright © 2024 EasyRest",
    "
    
    "directories": {
      "output": "release",
      "buildResources": "build"
    },
    
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json",
      "!node_modules/.cache",
      "!node_modules/.bin",
      "!node_modules/*/test",
      "!node_modules/*/tests",
      "!node_modules/*/*.md",
      "!node_modules/*/README*",
      "!node_modules/*/CHANGELOG*",
      "!node_modules/*/LICENSE*"
    ],
    
    "extraResources": [
      {
        "from": "src/assets",
        "to": "assets",
        "filter": ["**/*"]
      }
    ],
    
    "compression": "maximum",
    "removePackageScripts": true,
    
    "win": {
      "target": [
        {
          "target": "nsis",
          "arch": ["x64", "ia32"]
        },
        {
          "target": "portable",
          "arch": ["x64"]
        }
      ],
      "icon": "src/assets/icons/icon.ico",
      "publisherName": "EasyRest",
      "verifyUpdateCodeSignature": false,
      "requestedExecutionLevel": "asInvoker"
    },
    
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "allowElevation": true,
      "installerIcon": "src/assets/icons/installer.ico",
      "uninstallerIcon": "src/assets/icons/uninstaller.ico",
      "installerHeaderIcon": "src/assets/icons/installer-header.ico",
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true,
      "shortcutName": "EasyRest Entegre Siparişler",
      "include": "build/installer.nsh",
      "script": "build/installer.nsh",
      "deleteAppDataOnUninstall": false,
      "runAfterFinish": true,
      "menuCategory": "EasyRest",
      "artifactName": "${productName}-Setup-${version}.${ext}"
    },
    
    "portable": {
      "artifactName": "${productName}-Portable-${version}.${ext}"
    },
    
    "mac": {
      "target": [
        {
          "target": "dmg",
          "arch": ["x64", "arm64"]
        },
        {
          "target": "zip",
          "arch": ["x64", "arm64"]
        }
      ],
      "icon": "src/assets/icons/icon.icns",
      "category": "public.app-category.business",
      "darkModeSupport": true,
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    },
    
    "dmg": {
      "title": "${productName} ${version}",
      "icon": "src/assets/icons/volume.icns",
      "background": "src/assets/images/dmg-background.png",
      "contents": [
        {
          "x": 130,
          "y": 220
        },
        {
          "x": 410,
          "y": 220,
          "type": "link",
          "path": "/Applications"
        }
      ],
      "window": {
        "width": 540,
        "height": 380
      }
    },
    
    "linux": {
      "target": [
        {
          "target": "AppImage",
          "arch": ["x64"]
        },
        {
          "target": "deb",
          "arch": ["x64"]
        },
        {
          "target": "rpm",
          "arch": ["x64"]
        },
        {
          "target": "tar.gz",
          "arch": ["x64"]
        }
      ],
      "icon": "src/assets/icons/icon.png",
      "category": "Office",
      "desktop": {
        "Name": "EasyRest Entegre Siparişler",
        "Comment": "Restaurant order management desktop application",
        "Keywords": "restaurant;orders;management;pos;",
        "StartupWMClass": "easyrest-entegre-siparisler"
      }
    },
    
    "appImage": {
      "artifactName": "${productName}-${version}-${arch}.${ext}"
    },
    
    "deb": {
      "packageCategory": "office",
      "priority": "optional",
      "afterInstall": "build/linux-after-install.sh",
      "afterRemove": "build/linux-after-remove.sh"
    },
    
    "rpm": {
      "packageCategory": "Office/Finance",
      "afterInstall": "build/linux-after-install.sh",
      "afterRemove": "build/linux-after-remove.sh"
    },
    
    "publish": {
      "provider": "github",
      "owner": "iaydogdu",
      "repo": "easyrest-entegre-siparisler-desktop",
      "private": false,
      "releaseType": "release"
    },
    
    "beforeBuild": "scripts/before-build.js",
    "afterSign": "scripts/after-sign.js",
    "afterAllArtifactBuild": "scripts/after-build.js"
  }
}
```

## 🔐 Code Signing ve Security

### Windows Code Signing
```javascript
// scripts/after-sign.js
const { execSync } = require('child_process');
const path = require('path');

module.exports = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName === 'win32') {
    console.log('🔐 Windows code signing başlatılıyor...');
    
    const appPath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
    
    // Code signing certificate
    const certPath = process.env.CSC_LINK;
    const certPassword = process.env.CSC_KEY_PASSWORD;
    
    if (certPath && certPassword) {
      try {
        // SignTool ile imzala
        execSync(`signtool sign /f "${certPath}" /p "${certPassword}" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "${appPath}"`, {
          stdio: 'inherit'
        });
        
        console.log('✅ Windows code signing tamamlandı');
      } catch (error) {
        console.error('❌ Windows code signing hatası:', error);
        throw error;
      }
    } else {
      console.warn('⚠️ Code signing certificate bulunamadı');
    }
  }
};
```

### macOS Notarization
```javascript
// scripts/notarize.js
const { notarize } = require('electron-notarize');

module.exports = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'darwin') {
    return;
  }

  console.log('🍎 macOS notarization başlatılıyor...');

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(appOutDir, `${appName}.app`);

  const appleId = process.env.APPLEID;
  const appleIdPass = process.env.APPLEIDPASS;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPass || !teamId) {
    console.warn('⚠️ Apple ID credentials bulunamadı, notarization atlanıyor');
    return;
  }

  try {
    await notarize({
      appBundleId: 'com.easyrest.entegre-siparisler',
      appPath: appPath,
      appleId: appleId,
      appleIdPassword: appleIdPass,
      teamId: teamId
    });
    
    console.log('✅ macOS notarization tamamlandı');
  } catch (error) {
    console.error('❌ macOS notarization hatası:', error);
    throw error;
  }
};
```

## 📊 Build Optimization

### Build Performance Scripts
```javascript
// scripts/before-build.js
const fs = require('fs');
const path = require('path');

module.exports = async function(context) {
  console.log('🔧 Build öncesi optimizasyonlar...');
  
  // 1. Gereksiz dosyaları temizle
  const distPath = path.join(__dirname, '../dist');
  if (fs.existsSync(distPath)) {
    console.log('🧹 Önceki build dosyaları temizleniyor...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }

  // 2. Environment dosyalarını kontrol et
  const envProdPath = path.join(__dirname, '../src/environments/environment.prod.ts');
  if (fs.existsSync(envProdPath)) {
    const envContent = fs.readFileSync(envProdPath, 'utf8');
    if (envContent.includes('localhost')) {
      console.warn('⚠️ Production environment\'ta localhost URL tespit edildi!');
    }
  }

  // 3. Asset dosyalarını kontrol et
  const requiredAssets = [
    'src/assets/images/logo.svg',
    'src/assets/images/yemek-sepeti.png',
    'src/assets/images/trendyollogo.png',
    'src/assets/images/migros-yemek.png',
    'src/assets/images/getir.png',
    'src/assets/sounds/web.mp3',
    'src/assets/icons/icon.ico',
    'src/assets/icons/icon.png'
  ];

  const missingAssets = requiredAssets.filter(asset => 
    !fs.existsSync(path.join(__dirname, '..', asset))
  );

  if (missingAssets.length > 0) {
    console.error('❌ Eksik asset dosyaları:', missingAssets);
    throw new Error(`Eksik asset dosyaları: ${missingAssets.join(', ')}`);
  }

  // 4. Version bilgisini güncelle
  const packageJson = require('../package.json');
  const buildInfo = {
    version: packageJson.version,
    buildDate: new Date().toISOString(),
    commit: process.env.GITHUB_SHA || 'unknown',
    branch: process.env.GITHUB_REF_NAME || 'unknown'
  };

  fs.writeFileSync(
    path.join(__dirname, '../src/assets/build-info.json'),
    JSON.stringify(buildInfo, null, 2)
  );

  console.log('✅ Build öncesi hazırlık tamamlandı');
};
```

### Build Artifact Processing
```javascript
// scripts/after-build.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

module.exports = async function(context) {
  console.log('📊 Build sonrası işlemler...');
  
  const { outDir, artifactPaths } = context;
  
  // 1. Checksums oluştur
  const checksums = {};
  
  for (const artifactPath of artifactPaths) {
    const fileName = path.basename(artifactPath);
    const fileBuffer = fs.readFileSync(artifactPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const hex = hashSum.digest('hex');
    
    checksums[fileName] = {
      sha256: hex,
      size: fileBuffer.length,
      created: new Date().toISOString()
    };
    
    console.log(`📋 Checksum: ${fileName} -> ${hex}`);
  }

  // Checksums dosyasını kaydet
  fs.writeFileSync(
    path.join(outDir, 'checksums.json'),
    JSON.stringify(checksums, null, 2)
  );

  // 2. Build report oluştur
  const buildReport = {
    buildDate: new Date().toISOString(),
    version: context.packager.appInfo.version,
    platform: context.electronPlatformName,
    arch: context.arch,
    artifacts: artifactPaths.map(p => ({
      name: path.basename(p),
      size: fs.statSync(p).size,
      path: p
    })),
    nodeVersion: process.version,
    electronVersion: context.packager.config.electronVersion
  };

  fs.writeFileSync(
    path.join(outDir, 'build-report.json'),
    JSON.stringify(buildReport, null, 2)
  );

  console.log('✅ Build sonrası işlemler tamamlandı');
};
```

## 🚀 Release Management

### Automated Release Script
```bash
#!/bin/bash
# scripts/release.sh

set -e

echo "🚀 EasyRest Desktop Release Script"
echo "=================================="

# Version kontrolü
if [ -z "$1" ]; then
  echo "❌ Hata: Version belirtilmedi"
  echo "Kullanım: ./scripts/release.sh <version> [patch|minor|major]"
  echo "Örnek: ./scripts/release.sh 1.2.0"
  exit 1
fi

VERSION=$1
BUMP_TYPE=${2:-""}

echo "📋 Release bilgileri:"
echo "Version: $VERSION"
echo "Bump type: $BUMP_TYPE"
echo "Branch: $(git branch --show-current)"
echo "Commit: $(git rev-parse --short HEAD)"

# Git durumu kontrol et
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Hata: Working directory temiz değil"
  echo "Lütfen tüm değişiklikleri commit edin"
  exit 1
fi

# Main branch'te olduğundan emin ol
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "⚠️ Uyarı: Main branch'te değilsiniz ($CURRENT_BRANCH)"
  read -p "Devam etmek istiyor musunuz? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Dependencies kontrol et
echo "🔍 Dependencies kontrol ediliyor..."
npm audit --audit-level=moderate

# Tests çalıştır
echo "🧪 Tests çalıştırılıyor..."
npm run test:ci

# Lint kontrol et
echo "🔍 Linting..."
npm run lint

# Build test et
echo "🏗️ Build test ediliyor..."
npm run build

# Version bump
if [ -n "$BUMP_TYPE" ]; then
  echo "📈 Version bump: $BUMP_TYPE"
  npm version $BUMP_TYPE --no-git-tag-version
  VERSION=$(node -p "require('./package.json').version")
fi

# Package.json'da version güncelle
echo "📝 Version güncelleniyor: $VERSION"
npm version $VERSION --no-git-tag-version

# Git commit ve tag
echo "📝 Git commit ve tag oluşturuluyor..."
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"
git tag "v$VERSION"

# Push
echo "📤 Git push..."
git push origin main
git push origin "v$VERSION"

echo "✅ Release başarıyla oluşturuldu!"
echo "🔗 GitHub Actions: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/actions"
echo "📦 Releases: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases"
```

### Release Notes Generator
```javascript
// scripts/generate-release-notes.js
const { execSync } = require('child_process');
const fs = require('fs');

function generateReleaseNotes(version) {
  console.log(`📝 Release notes oluşturuluyor: v${version}`);
  
  // Git log'dan değişiklikleri al
  const gitLog = execSync(`git log --pretty=format:"%h %s" --since="30 days ago"`, { encoding: 'utf8' });
  const commits = gitLog.split('\n').filter(line => line.trim());
  
  // Commit'leri kategorize et
  const categories = {
    features: [],
    fixes: [],
    improvements: [],
    other: []
  };

  commits.forEach(commit => {
    const [hash, ...messageParts] = commit.split(' ');
    const message = messageParts.join(' ');
    
    if (message.includes('feat:') || message.includes('feature:')) {
      categories.features.push(`- ${message.replace(/^(feat:|feature:)\s*/i, '')} (${hash})`);
    } else if (message.includes('fix:') || message.includes('bugfix:')) {
      categories.fixes.push(`- ${message.replace(/^(fix:|bugfix:)\s*/i, '')} (${hash})`);
    } else if (message.includes('improve:') || message.includes('enhancement:')) {
      categories.improvements.push(`- ${message.replace(/^(improve:|enhancement:)\s*/i, '')} (${hash})`);
    } else {
      categories.other.push(`- ${message} (${hash})`);
    }
  });

  // Release notes template
  const releaseNotes = `# 🎉 EasyRest Entegre Siparişler Desktop v${version}

## 📱 Bu Sürümde Neler Var?

${categories.features.length > 0 ? `### 🆕 Yeni Özellikler
${categories.features.join('\n')}

` : ''}${categories.fixes.length > 0 ? `### 🐛 Düzeltmeler
${categories.fixes.join('\n')}

` : ''}${categories.improvements.length > 0 ? `### ⚡ İyileştirmeler
${categories.improvements.join('\n')}

` : ''}${categories.other.length > 0 ? `### 🔧 Diğer Değişiklikler
${categories.other.join('\n')}

` : ''}## 📥 İndirme

### Windows
- **64-bit**: \`easyrest-entegre-siparisler-Setup-${version}.exe\`
- **32-bit**: \`easyrest-entegre-siparisler-ia32-Setup-${version}.exe\`
- **Portable**: \`easyrest-entegre-siparisler-Portable-${version}.exe\`

### macOS
- **Intel Mac**: \`easyrest-entegre-siparisler-${version}.dmg\`
- **Apple Silicon**: \`easyrest-entegre-siparisler-${version}-arm64.dmg\`

### Linux
- **AppImage**: \`easyrest-entegre-siparisler-${version}-x64.AppImage\`
- **DEB**: \`easyrest-entegre-siparisler_${version}_amd64.deb\`
- **RPM**: \`easyrest-entegre-siparisler-${version}.x86_64.rpm\`

## 🔧 Sistem Gereksinimleri

### Minimum Gereksinimler
- **Windows**: Windows 10 (64-bit) veya üzeri
- **macOS**: macOS 10.15 (Catalina) veya üzeri
- **Linux**: Ubuntu 18.04 LTS veya üzeri
- **RAM**: 4 GB (8 GB önerilen)
- **Disk**: 500 MB boş alan

### Önerilen Gereksinimler
- **RAM**: 8 GB veya üzeri
- **Disk**: 1 GB boş alan
- **İnternet**: Stabil bağlantı (API erişimi için)

## 🌐 Konfigürasyon

### Backend URL
\`\`\`
https://api.easycorest.com:5555
\`\`\`

### Termal Yazıcı Servisi
\`\`\`
http://localhost:41411
\`\`\`

## 📋 Kurulum Sonrası

1. **Uygulamayı çalıştırın**
2. **EasyRest hesap bilgilerinizle giriş yapın**
3. **Mağaza seçin**
4. **Entegre siparişler otomatik takip edilmeye başlar**

## 🔄 Otomatik Güncelleme

Bu sürüm otomatik güncelleme desteği ile gelir. Yeni sürümler mevcut olduğunda bildirim alacaksınız.

## 🐛 Bilinen Sorunlar

- Termal yazıcı servisi manuel olarak başlatılmalıdır
- İlk açılışta notification permission istenebilir

## 📞 Destek

Sorun yaşadığınızda:
1. Uygulamayı yeniden başlatın
2. Log dosyalarını kontrol edin
3. GitHub Issues'tan bildirim yapın

---

**📅 Release Tarihi**: ${new Date().toLocaleDateString('tr-TR')}
**🔨 Build**: ${process.env.GITHUB_SHA || 'local'}
`;

  // Release notes'u dosyaya kaydet
  fs.writeFileSync(`release-notes-v${version}.md`, releaseNotes);
  
  console.log(`✅ Release notes oluşturuldu: release-notes-v${version}.md`);
  return releaseNotes;
}

module.exports = generateReleaseNotes;
```

## 🔄 Auto-Update Configuration

### Update Server Setup
```typescript
// main.ts içinde auto-updater detayları
private setupAutoUpdater(): void {
  if (isDev) {
    console.log('🔧 Development mode - Auto-updater devre dışı');
    return;
  }

  console.log('🔄 Auto-updater kuruluyor...');

  // Logger setup
  autoUpdater.logger = {
    info: (message) => console.log(`📄 [AutoUpdater] ${message}`),
    warn: (message) => console.warn(`⚠️ [AutoUpdater] ${message}`),
    error: (message) => console.error(`❌ [AutoUpdater] ${message}`)
  };

  // Update configuration
  autoUpdater.autoDownload = false; // Manuel kontrol
  autoUpdater.autoInstallOnAppQuit = true;
  
  // GitHub releases configuration
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'iaydogdu',
    repo: 'easyrest-entegre-siparisler-desktop',
    private: false,
    releaseType: 'release' // 'draft', 'prerelease', 'release'
  });

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Güncellemeler kontrol ediliyor...');
    this.updateTrayTooltip('Güncellemeler kontrol ediliyor...');
    this.sendToRenderer('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    console.log('📥 Güncelleme mevcut:', {
      currentVersion: app.getVersion(),
      newVersion: info.version,
      releaseDate: info.releaseDate,
      size: this.formatBytes(info.files?.[0]?.size || 0)
    });
    
    this.sendToRenderer('update-status', { status: 'available', info });
    this.showUpdateAvailableDialog(info);
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('✅ En güncel sürüm kullanılıyor:', info.version);
    this.sendToRenderer('update-status', { status: 'not-available', info });
  });

  autoUpdater.on('error', (err) => {
    console.error('❌ Auto-updater hatası:', err);
    this.sendToRenderer('update-status', { status: 'error', error: err.message });
    this.showUpdateErrorDialog(err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    const speed = this.formatBytes(progressObj.bytesPerSecond);
    const transferred = this.formatBytes(progressObj.transferred);
    const total = this.formatBytes(progressObj.total);
    
    console.log(`📥 İndirme: ${percent}% (${transferred}/${total}) - ${speed}/s`);
    
    this.updateTrayTooltip(`Güncelleme indiriliyor: ${percent}%`);
    this.sendToRenderer('update-progress', {
      percent,
      transferred,
      total,
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Güncelleme indirildi:', info.version);
    this.sendToRenderer('update-status', { status: 'downloaded', info });
    this.showUpdateReadyDialog(info);
  });

  // İlk kontrol (uygulama başladıktan 30 saniye sonra)
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 30000);

  // Periyodik kontrol (her 6 saatte bir)
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 6 * 60 * 60 * 1000);
}

private formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

private sendToRenderer(channel: string, data: any): void {
  if (this.mainWindow && !this.mainWindow.isDestroyed()) {
    this.mainWindow.webContents.send(channel, data);
  }
}
```

## 📊 Build Analytics

### Build Metrics Collection
```javascript
// scripts/build-analytics.js
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function collectBuildMetrics(context) {
  console.log('📊 Build metrics toplanıyor...');
  
  const startTime = Date.now();
  
  // Git bilgileri
  const gitInfo = {
    commit: execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(),
    branch: execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim(),
    tag: execSync('git describe --tags --exact-match 2>/dev/null || echo "no-tag"', { encoding: 'utf8' }).trim(),
    commitCount: parseInt(execSync('git rev-list --count HEAD', { encoding: 'utf8' }).trim()),
    lastCommitDate: execSync('git log -1 --format=%ci', { encoding: 'utf8' }).trim()
  };

  // Build environment
  const buildEnv = {
    nodeVersion: process.version,
    npmVersion: execSync('npm --version', { encoding: 'utf8' }).trim(),
    electronVersion: require('../package.json').devDependencies.electron,
    platform: process.platform,
    arch: process.arch,
    ci: !!process.env.CI,
    runner: process.env.RUNNER_OS || 'local'
  };

  // Package bilgileri
  const packageInfo = {
    name: context.packager.appInfo.name,
    version: context.packager.appInfo.version,
    description: context.packager.appInfo.description,
    author: context.packager.appInfo.companyName
  };

  // Build metrics
  const buildMetrics = {
    buildId: `${gitInfo.commit.substring(0, 8)}-${Date.now()}`,
    buildDate: new Date().toISOString(),
    buildDuration: Date.now() - startTime,
    gitInfo,
    buildEnv,
    packageInfo,
    artifacts: context.artifactPaths || []
  };

  // Metrics dosyasını kaydet
  const metricsPath = path.join(context.outDir, 'build-metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(buildMetrics, null, 2));
  
  console.log('✅ Build metrics kaydedildi:', metricsPath);
  
  return buildMetrics;
}

module.exports = collectBuildMetrics;
```

Bu dosyada **build ve deploy sisteminin tamamen detaylı** konfigürasyonu var! 

**Son dosya:**
- `10-KURULUM-REHBERI.md` (Adım adım kurulum kılavuzu)

Sonra tüm dosyaları GitHub'a push edelim. Devam edeyim mi? 🚀
