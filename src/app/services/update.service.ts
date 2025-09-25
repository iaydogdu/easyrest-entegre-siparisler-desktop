import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: number;
  error?: string;
  releaseNotes?: string;
}

export interface AppVersion {
  version: string;
  electron: string;
  node: string;
  platform: string;
}

@Injectable({
  providedIn: 'root'
})
export class UpdateService {
  private updateStatusSubject = new BehaviorSubject<UpdateStatus>({ status: 'not-available' });
  public updateStatus$ = this.updateStatusSubject.asObservable();

  private appVersionSubject = new BehaviorSubject<AppVersion | null>(null);
  public appVersion$ = this.appVersionSubject.asObservable();

  private isElectron: boolean = false;

  constructor(private ngZone: NgZone) {
    this.isElectron = this.checkIfElectron();
    
    if (this.isElectron) {
      this.initializeElectronAPI();
      this.loadAppVersion();
    }
  }

  private checkIfElectron(): boolean {
    return !!(window && window.electronAPI);
  }

  private initializeElectronAPI(): void {
    if (window.electronAPI) {
      // Güncelleme durumu dinleyicisi
      window.electronAPI.onUpdateStatus((event: any, data: UpdateStatus) => {
        this.ngZone.run(() => {
          console.log('Update status received:', data);
          this.updateStatusSubject.next(data);
        });
      });
    }
  }

  private async loadAppVersion(): Promise<void> {
    try {
      if (window.electronAPI) {
        const version = await window.electronAPI.getAppVersion();
        this.ngZone.run(() => {
          this.appVersionSubject.next(version);
        });
      }
    } catch (error) {
      console.error('Versiyon bilgisi alınırken hata:', error);
    }
  }

  async checkForUpdates(): Promise<void> {
    if (!this.isElectron) {
      console.warn('Güncelleme kontrolü sadece Electron uygulamasında çalışır');
      return;
    }

    try {
      this.updateStatusSubject.next({ status: 'checking' });
      await window.electronAPI.checkForUpdates();
    } catch (error) {
      console.error('Güncelleme kontrolü hatası:', error);
      this.updateStatusSubject.next({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Bilinmeyen hata' 
      });
    }
  }

  async restartApp(): Promise<void> {
    if (!this.isElectron) {
      console.warn('Uygulama yeniden başlatma sadece Electron uygulamasında çalışır');
      return;
    }

    try {
      await window.electronAPI.restartApp();
    } catch (error) {
      console.error('Uygulama yeniden başlatma hatası:', error);
    }
  }

  async minimizeWindow(): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.minimizeWindow();
    }
  }

  async maximizeWindow(): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.maximizeWindow();
    }
  }

  async closeWindow(): Promise<void> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.closeWindow();
    }
  }

  getUpdateStatusText(status: UpdateStatus): string {
    switch (status.status) {
      case 'checking':
        return 'Güncellemeler kontrol ediliyor...';
      case 'available':
        return `Yeni versiyon mevcut: v${status.version}`;
      case 'not-available':
        return 'Uygulama güncel';
      case 'downloading':
        return `İndiriliyor... ${status.progress || 0}%`;
      case 'downloaded':
        return `v${status.version} indirildi, yeniden başlatın`;
      case 'error':
        return `Hata: ${status.error}`;
      default:
        return 'Bilinmeyen durum';
    }
  }

  isUpdateAvailable(): boolean {
    const currentStatus = this.updateStatusSubject.value;
    return currentStatus.status === 'available' || currentStatus.status === 'downloaded';
  }

  isUpdateDownloaded(): boolean {
    return this.updateStatusSubject.value.status === 'downloaded';
  }

  getCurrentVersion(): string {
    const version = this.appVersionSubject.value;
    return version ? version.version : '1.0.0';
  }

  getPlatformInfo(): string {
    const version = this.appVersionSubject.value;
    if (!version) return 'Bilinmeyen platform';
    
    return `${version.platform} - Electron v${version.electron} - Node.js v${version.node}`;
  }

  destroy(): void {
    if (this.isElectron && window.electronAPI) {
      window.electronAPI.removeUpdateStatusListener();
    }
  }
}
