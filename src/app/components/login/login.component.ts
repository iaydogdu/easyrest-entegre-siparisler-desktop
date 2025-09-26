import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  template: `
    <div style="min-height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; padding: 20px;">
      <div style="background: white; border-radius: 15px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); width: 100%; max-width: 400px; padding: 40px;">
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-size: 2rem; font-weight: bold; color: #333; margin-bottom: 10px;">
            EasyRest
          </h1>
          <p style="color: #666;">
            {{ 'integratedorders' | translate }}
          </p>
        </div>

        <!-- Login Form -->
        <form (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 20px;">
          <!-- Kullanıcı Adı -->
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 5px;">
              {{ 'username' | translate }}
            </label>
            <input
              type="text"
              [(ngModel)]="kullaniciAdi"
              name="kullaniciAdi"
              required
              style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"
              placeholder="{{ 'enterusername' | translate }}"
            >
          </div>

          <!-- Şifre -->
          <div>
            <label style="display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 5px;">
              {{ 'password' | translate }}
            </label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px;"
              placeholder="{{ 'enterpassword' | translate }}"
            >
          </div>

          <!-- Beni Hatırla -->
          <div style="display: flex; align-items: center;">
            <input
              type="checkbox"
              [(ngModel)]="rememberMe"
              name="rememberMe"
              id="rememberMe"
              style="margin-right: 8px;"
            >
            <label for="rememberMe" style="font-size: 14px; color: #333;">
              {{ 'rememberme' | translate }}
            </label>
          </div>

          <!-- Login Button -->
          <button
            type="submit"
            [disabled]="isLoading"
            style="width: 100%; background: #667eea; color: white; font-weight: 500; padding: 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;"
          >
            <span *ngIf="!isLoading">{{ 'login' | translate }}</span>
            <span *ngIf="isLoading">{{ 'loading' | translate }}...</span>
          </button>
        </form>

        <!-- Footer -->
        <div style="margin-top: 30px; text-align: center;">
          <p style="font-size: 12px; color: #999;">
            © {{ currYear }} EasyRest. {{ 'allrightsreserved' | translate }}
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent implements OnInit {
  kullaniciAdi: string = '';
  password: string = '';
  rememberMe: boolean = false;
  isLoading: boolean = false;
  currYear: number = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private router: Router,
    private translate: TranslateService
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
      alert(this.translate.instant('pleasefillallfields'));
      return;
    }

    this.isLoading = true;

    this.authService.login(this.kullaniciAdi, this.password)
      .pipe(
        catchError((error) => {
          console.error('Login failed', error);
          this.isLoading = false;
          alert(this.translate.instant('loginError'));
          return of(null);
        })
      )
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          
          if (response) {
            console.log('Login response:', response);
            console.log('Magazalar:', response.magazalar);
            
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

            // LocalStorage'ı kontrol et
            console.log('LocalStorage magazalar:', localStorage.getItem('magazalar'));

            // Mağazaların yüklenmesini bekle, sonra yönlendir
            setTimeout(() => {
              console.log('Gecikmeli kontrol - LocalStorage magazalar:', localStorage.getItem('magazalar'));
              this.router.navigate(['/orders']);
            }, 2000);
          }
        }
      });
  }
}