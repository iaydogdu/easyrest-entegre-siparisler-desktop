import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService, UserProfile, Magaza } from '../../services/auth.service';
import { UpdateService } from '../../services/update.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    TranslateModule
  ],
  template: `
    <!-- Desktop Header -->
    <div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-4">
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">
            EasyRest - {{ 'integratedorders' | translate }}
          </h1>
        </div>
        <div class="flex items-center gap-4">
          <!-- Update Status -->
          <div *ngIf="updateStatus && updateStatus.status !== 'not-available'" 
               class="flex items-center gap-2 text-sm">
            <div *ngIf="updateStatus.status === 'checking'" class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span class="text-gray-600 dark:text-gray-400">{{ getUpdateStatusText() }}</span>
            <button *ngIf="updateStatus.status === 'downloaded'" 
                    (click)="restartForUpdate()"
                    class="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded">
              Yeniden Başlat
            </button>
          </div>
          
          <!-- Version Info -->
          <div class="text-sm text-gray-500">
            <span>v{{ currentVersion }}</span>
            <button (click)="checkForUpdates()" 
                    class="ml-2 text-blue-500 hover:text-blue-700 underline text-xs"
                    [disabled]="updateStatus?.status === 'checking'">
              {{ updateStatus?.status === 'checking' ? 'Kontrol...' : 'Güncelle' }}
            </button>
          </div>
          
          <!-- Kullanıcı Bilgisi -->
          <div class="flex items-center gap-3">
            <!-- Profil Resmi -->
            <div class="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              <img *ngIf="userProfile?.profilResmi" 
                   [src]="userProfile.profilResmi" 
                   [alt]="getDisplayName()"
                   class="w-full h-full object-cover">
              <span *ngIf="!userProfile?.profilResmi" 
                    class="text-gray-600 text-sm font-medium">
                {{ getInitials() }}
              </span>
            </div>
            
            <!-- Kullanıcı Detayları -->
            <div class="text-sm">
              <div class="text-gray-800 dark:text-white font-medium">
                {{ getDisplayName() }}
              </div>
              <div class="text-gray-500 dark:text-gray-400 text-xs">
                {{ userProfile?.role | titlecase }} 
                <span *ngIf="selectedStore">• {{ getSelectedStoreName() }}</span>
              </div>
            </div>
          </div>
          
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

    <!-- Main Content -->
    <div class="flex-1 overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div class="h-full p-6">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm h-full p-6">
          <div class="text-center">
            <h2 class="text-2xl font-bold text-gray-800 dark:text-white mb-4">
              {{ 'integratedorders' | translate }}
            </h2>
            <p class="text-gray-600 dark:text-gray-400 mb-8">
              Entegre sipariş sistemi yakında aktif olacak...
            </p>
            
            <!-- Platform Info Card -->
            <div class="max-w-md mx-auto bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 mb-8">
              <h3 class="font-semibold text-blue-800 dark:text-blue-200 mb-3">Sistem Bilgileri</h3>
              <div class="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                <div>Versiyon: {{ currentVersion }}</div>
                <div>Platform: {{ platformInfo }}</div>
                <div>Güncelleme Durumu: {{ getUpdateStatusText() }}</div>
              </div>
            </div>

            <!-- Update Actions -->
            <div class="space-y-3">
              <button 
                (click)="checkForUpdates()"
                [disabled]="updateStatus?.status === 'checking'"
                class="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors">
                {{ updateStatus?.status === 'checking' ? 'Kontrol Ediliyor...' : 'Güncellemeleri Kontrol Et' }}
              </button>
              
              <button 
                *ngIf="updateStatus?.status === 'downloaded'"
                (click)="restartForUpdate()"
                class="block mx-auto px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors">
                Güncellemeyi Yükle ve Yeniden Başlat
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
  `]
})
export class OrdersComponent implements OnInit, OnDestroy {
  updateStatus: any = null;
  currentVersion: string = '1.0.0';
  platformInfo: string = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private authService: AuthService,
    private updateService: UpdateService
  ) {}

  ngOnInit() {
    // Update service subscriptions
    const updateStatusSub = this.updateService.updateStatus$.subscribe(status => {
      this.updateStatus = status;
    });

    const versionSub = this.updateService.appVersion$.subscribe(version => {
      if (version) {
        this.currentVersion = version.version;
        this.platformInfo = this.updateService.getPlatformInfo();
      }
    });

    this.subscriptions.push(updateStatusSub, versionSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  logout(): void {
    this.authService.logout();
  }

  getKullaniciAdi(): string {
    return this.authService.getKullaniciAdi() || 'Kullanıcı';
  }

  checkForUpdates(): void {
    this.updateService.checkForUpdates();
  }

  restartForUpdate(): void {
    this.updateService.restartApp();
  }

  getUpdateStatusText(): string {
    return this.updateService.getUpdateStatusText(this.updateStatus || { status: 'not-available' });
  }
}
