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
  magazalar: Magaza[];
  email?: string;
  telefon?: string;
  adSoyad?: string;
  profilResmi?: string;
  sonGirisTarihi?: string;
  aktifMi?: boolean;
  yetkiler?: string[];
}

export interface Magaza {
  _id: string;
  magazaAdi: string;
  adres?: string;
  telefon?: string;
  aktifMi?: boolean;
  logo?: string;
  ayarlar?: any;
}

export interface UserProfile {
  _id: string;
  kullaniciAdi: string;
  email?: string;
  telefon?: string;
  adSoyad?: string;
  role: string;
  profilResmi?: string;
  sonGirisTarihi?: string;
  aktifMi: boolean;
  egitimTamamlandiMi: boolean;
  magazalar: Magaza[];
  selectedStore?: string;
  yetkiler?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly baseUrl = environment.baseappurl;
  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<UserProfile | null>(this.loadUserProfile());
  public userProfile$ = this.userProfileSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private loadUserProfile(): UserProfile | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const userId = localStorage.getItem('userId');
      const kullaniciAdi = localStorage.getItem('kullaniciAdi');
      const role = localStorage.getItem('role');
      const email = localStorage.getItem('email');
      const telefon = localStorage.getItem('telefon');
      const adSoyad = localStorage.getItem('adSoyad');
      const profilResmi = localStorage.getItem('profilResmi');
      const sonGirisTarihi = localStorage.getItem('sonGirisTarihi');
      const aktifMi = localStorage.getItem('aktifMi') === 'true';
      const egitimTamamlandiMi = localStorage.getItem('egitimTamamlandiMi') === 'true';
      const selectedStore = localStorage.getItem('selectedStore');
      const yetkilerStr = localStorage.getItem('yetkiler');
      const magazalarStr = localStorage.getItem('magazalar');

      if (!userId || !kullaniciAdi || !role) return null;

      const yetkiler = yetkilerStr ? JSON.parse(yetkilerStr) : [];
      const magazalar = magazalarStr ? JSON.parse(magazalarStr) : [];

      return {
        _id: userId,
        kullaniciAdi,
        email: email || undefined,
        telefon: telefon || undefined,
        adSoyad: adSoyad || undefined,
        role,
        profilResmi: profilResmi || undefined,
        sonGirisTarihi: sonGirisTarihi || undefined,
        aktifMi,
        egitimTamamlandiMi,
        magazalar,
        selectedStore: selectedStore || undefined,
        yetkiler
      };
    } catch (error) {
      console.error('Kullanıcı profili yüklenirken hata:', error);
      return null;
    }
  }

  login(kullaniciAdi: string, password: string): Observable<LoginResponse> {
    const loginData = { kullaniciAdi, password };

    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, loginData)
      .pipe(
        tap((response: LoginResponse) => {
          if (response && response.token) {
            // Token ve temel bilgileri kaydet
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response._id);
            localStorage.setItem('kullaniciAdi', response.kullaniciAdi);
            localStorage.setItem('role', response.role);
            localStorage.setItem('egitimTamamlandiMi', response.egitimTamamlandiMi.toString());
            
            // Opsiyonel bilgileri kaydet
            if (response.email) localStorage.setItem('email', response.email);
            if (response.telefon) localStorage.setItem('telefon', response.telefon);
            if (response.adSoyad) localStorage.setItem('adSoyad', response.adSoyad);
            if (response.profilResmi) localStorage.setItem('profilResmi', response.profilResmi);
            if (response.sonGirisTarihi) localStorage.setItem('sonGirisTarihi', response.sonGirisTarihi);
            if (response.aktifMi !== undefined) localStorage.setItem('aktifMi', response.aktifMi.toString());
            if (response.yetkiler) localStorage.setItem('yetkiler', JSON.stringify(response.yetkiler));
            
            // Mağaza bilgilerini kaydet
            if (response.magazalar && response.magazalar.length > 0) {
              localStorage.setItem('magazalar', JSON.stringify(response.magazalar));
              localStorage.setItem('selectedStore', response.magazalar[0]._id);
            }

            // Son giriş tarihini güncelle
            localStorage.setItem('sonGirisTarihi', new Date().toISOString());

            // Subjects'leri güncelle
            this.isLoggedInSubject.next(true);
            this.userProfileSubject.next(this.loadUserProfile());
          }
        })
      );
  }

  logout(): void {
    // Tüm kullanıcı bilgilerini temizle
    const keysToRemove = [
      'token', 'userId', 'kullaniciAdi', 'role', 'email', 'telefon', 
      'adSoyad', 'profilResmi', 'sonGirisTarihi', 'aktifMi', 
      'egitimTamamlandiMi', 'magazalar', 'selectedStore', 'yetkiler'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Subjects'leri sıfırla
    this.isLoggedInSubject.next(false);
    this.userProfileSubject.next(null);
    
    // Login sayfasına yönlendir
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isAuthenticated(): boolean {
    return this.hasToken();
  }

  getKullaniciAdi(): string | null {
    return localStorage.getItem('kullaniciAdi');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getEmail(): string | null {
    return localStorage.getItem('email');
  }

  getTelefon(): string | null {
    return localStorage.getItem('telefon');
  }

  getAdSoyad(): string | null {
    return localStorage.getItem('adSoyad');
  }

  getProfilResmi(): string | null {
    return localStorage.getItem('profilResmi');
  }

  getMagazalar(): Magaza[] {
    const magazalar = localStorage.getItem('magazalar');
    return magazalar ? JSON.parse(magazalar) : [];
  }

  getSelectedStore(): string | null {
    return localStorage.getItem('selectedStore');
  }

  setSelectedStore(storeId: string): void {
    localStorage.setItem('selectedStore', storeId);
    const currentProfile = this.userProfileSubject.value;
    if (currentProfile) {
      currentProfile.selectedStore = storeId;
      this.userProfileSubject.next({ ...currentProfile });
    }
  }

  getUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  updateUserProfile(updates: Partial<UserProfile>): void {
    const currentProfile = this.userProfileSubject.value;
    if (currentProfile) {
      const updatedProfile = { ...currentProfile, ...updates };
      
      // LocalStorage'ı güncelle
      if (updates.email) localStorage.setItem('email', updates.email);
      if (updates.telefon) localStorage.setItem('telefon', updates.telefon);
      if (updates.adSoyad) localStorage.setItem('adSoyad', updates.adSoyad);
      if (updates.profilResmi) localStorage.setItem('profilResmi', updates.profilResmi);
      if (updates.selectedStore) localStorage.setItem('selectedStore', updates.selectedStore);
      
      this.userProfileSubject.next(updatedProfile);
    }
  }

  hasPermission(permission: string): boolean {
    const profile = this.userProfileSubject.value;
    if (!profile || !profile.yetkiler) return false;
    
    return profile.yetkiler.includes(permission) || profile.role === 'admin';
  }

  isAdmin(): boolean {
    const role = this.getRole();
    return role === 'admin' || role === 'superadmin';
  }

  getDisplayName(): string {
    const adSoyad = this.getAdSoyad();
    const kullaniciAdi = this.getKullaniciAdi();
    
    return adSoyad || kullaniciAdi || 'Kullanıcı';
  }

  getLastLoginDate(): Date | null {
    const lastLogin = localStorage.getItem('sonGirisTarihi');
    return lastLogin ? new Date(lastLogin) : null;
  }

  refreshUserProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.baseUrl}/api/user/profile`)
      .pipe(
        tap((profile: UserProfile) => {
          this.userProfileSubject.next(profile);
          
          // LocalStorage'ı güncelle
          if (profile.email) localStorage.setItem('email', profile.email);
          if (profile.telefon) localStorage.setItem('telefon', profile.telefon);
          if (profile.adSoyad) localStorage.setItem('adSoyad', profile.adSoyad);
          if (profile.profilResmi) localStorage.setItem('profilResmi', profile.profilResmi);
        })
      );
  }
}
