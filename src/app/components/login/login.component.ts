import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { UpdateService } from '../../services/update.service';
import { catchError, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center p-4">
      <!-- Update Status Bar -->
      <div *ngIf="updateStatus && updateStatus.status !== 'not-available'" 
           class="fixed top-0 left-0 right-0 z-50 bg-blue-600 text-white text-center py-2 text-sm">
        <div class="flex items-center justify-center space-x-2">
          <div *ngIf="updateStatus.status === 'checking'" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>{{ getUpdateStatusText() }}</span>
          <button *ngIf="updateStatus.status === 'downloaded'" 
                  (click)="restartForUpdate()"
                  class="ml-4 px-3 py-1 bg-white text-blue-600 rounded-md text-xs hover:bg-gray-100">
            Yeniden Başlat
          </button>
        </div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8" 
           [class.mt-12]="updateStatus && updateStatus.status !== 'not-available'">
        <!-- Logo -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            EasyRest
          </h1>
          <p class="text-gray-600 dark:text-gray-300">
            {{ 'integratedorders' | translate }}
          </p>
          <!-- Versiyon Bilgisi -->
          <div class="mt-2 text-xs text-gray-500">
            <span>v{{ currentVersion }}</span>
            <button (click)="checkForUpdates()" 
                    class="ml-2 text-blue-500 hover:text-blue-700 underline"
                    [disabled]="updateStatus?.status === 'checking'">
              {{ updateStatus?.status === 'checking' ? 'Kontrol ediliyor...' : 'Güncelleme Kontrol Et' }}
            </button>
          </div>
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
                <span class="text-lg">
                  {{ isPasswordVisible ? '👁️' : '👁️‍🗨️' }}
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
          <div class="mt-2 text-xs text-gray-400">
            {{ platformInfo }}
          </div>
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
export class LoginComponent implements OnInit, OnDestroy {
  kullaniciAdi: string = '';
  password: string = '';
  rememberMe: boolean = false;
  isPasswordVisible: boolean = false;
  isLoading: boolean = false;
  currYear: number = new Date().getFullYear();

  updateStatus: any = null;
  currentVersion: string = '1.0.0';
  platformInfo: string = '';

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService,
    private updateService: UpdateService
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

  onSubmit() {
    if (!this.kullaniciAdi || !this.password) {
      this.showNotification(
        this.translate.instant('pleasefillallfields'),
        'warning'
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
              this.showNotification(
                `${message} (${kalanDakika} dakika kaldı)`,
                'error'
              );
            } else {
              this.showNotification(message, 'error');
            }
          } else if (error.status === 409) {
            const message = error.error?.msg || "Zaten aktif bir oturumunuz bulunmaktadır.";
            this.showNotification(message, 'warning');
          } else if (error.status === 400) {
            const message = error.error?.msg
              ? this.translate.instant(error.error.msg)
              : this.translate.instant("incorrectpassword");
            this.showNotification(message, 'error');
          } else {
            this.showNotification(
              this.translate.instant("loginError"),
              'error'
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
            this.showNotification(
              this.translate.instant('loginSuccess'),
              'success'
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

  checkForUpdates() {
    this.updateService.checkForUpdates();
  }

  restartForUpdate() {
    this.updateService.restartApp();
  }

  getUpdateStatusText(): string {
    return this.updateService.getUpdateStatusText(this.updateStatus);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white text-sm max-w-sm transition-all duration-300 transform translate-x-full`;
    
    switch (type) {
      case 'success':
        notification.classList.add('bg-green-500');
        break;
      case 'error':
        notification.classList.add('bg-red-500');
        break;
      case 'warning':
        notification.classList.add('bg-yellow-500');
        break;
      case 'info':
      default:
        notification.classList.add('bg-blue-500');
        break;
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 10);
    
    // Auto remove
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }
}
