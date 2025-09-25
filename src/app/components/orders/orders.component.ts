import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
    <div style="background: white; border-bottom: 1px solid #ddd; padding: 15px 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <h1 style="font-size: 20px; font-weight: 600; color: #333; margin: 0;">
            EasyRest - {{ 'integratedorders' | translate }}
          </h1>
        </div>
        
        <div style="display: flex; align-items: center; gap: 15px;">
          <!-- Kullanıcı Bilgisi -->
          <span style="font-size: 14px; color: #666;">
            {{ getKullaniciAdi() }}
          </span>
          
          <!-- Logout Button -->
          <button
            (click)="logout()"
            style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;"
          >
            {{ 'logout' | translate }}
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div style="flex: 1; background: #f5f5f5; padding: 20px;">
      <div style="background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); height: 100%; padding: 30px;">
        <div style="text-align: center;">
          <h2 style="font-size: 24px; font-weight: bold; color: #333; margin-bottom: 15px;">
            {{ 'integratedorders' | translate }}
          </h2>
          <p style="color: #666; margin-bottom: 30px;">
            Entegre sipariş sistemi yakında aktif olacak...
          </p>
          
          <!-- Kullanıcı Bilgileri -->
          <div style="max-width: 400px; margin: 0 auto; background: #f8f9fa; border-radius: 10px; padding: 20px;">
            <h3 style="font-weight: 600; color: #333; margin-bottom: 15px;">Kullanıcı Bilgileri</h3>
            <div style="text-align: left; color: #555;">
              <div style="margin-bottom: 8px;"><strong>Kullanıcı Adı:</strong> {{ getKullaniciAdi() }}</div>
              <div style="margin-bottom: 8px;"><strong>Rol:</strong> {{ getRole() }}</div>
              <div><strong>Giriş Tarihi:</strong> {{ getCurrentDate() }}</div>
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
export class OrdersComponent implements OnInit {

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Component başlatıldığında yapılacak işlemler
  }

  logout(): void {
    this.authService.logout();
  }

  getKullaniciAdi(): string {
    return this.authService.getKullaniciAdi() || 'Kullanıcı';
  }

  getRole(): string {
    return this.authService.getRole() || 'Kullanıcı';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('tr-TR');
  }
}