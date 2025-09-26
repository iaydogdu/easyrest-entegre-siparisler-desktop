import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginResponse {
  token: string;
}

export interface UserInfo {
  _id: string;
  kullaniciAdi: string;
  role: string;
  parentUser: string;
  egitimTamamlandiMi: boolean;
  magazalar: any[];
  email?: string;
  telefon?: string;
  adSoyad?: string;
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

  login(kullaniciAdi: string, password: string): Observable<any> {
    const loginData = { kullaniciAdi, sifre: password };

    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, loginData)
      .pipe(
        tap((response: LoginResponse) => {
          if (response && response.token) {
            console.log('Auth Service - Login response:', response);
            
            // Token'ı kaydet
            localStorage.setItem('token', response.token);
            
            // Token ile kullanıcı bilgilerini getir - Promise olarak
            this.getUserFromServer().toPromise().then((userResponse: any) => {
              console.log('User response:', userResponse);
              
              if (userResponse) {
                // Kullanıcı bilgilerini kaydet
                localStorage.setItem('avatar', userResponse.avatar || '');
                localStorage.setItem('parentUser', userResponse.parentUser || '');
                localStorage.setItem('kullaniciAdi', userResponse.kullaniciAdi || kullaniciAdi);
                localStorage.setItem('userid', userResponse._id || '');
                localStorage.setItem('email', userResponse.email || '');
                localStorage.setItem('role', userResponse.role?.name || 'Paket');
                localStorage.setItem('paketAdi', userResponse.paketBilgisi?.paketAdi || '');
                
                // Mağaza bilgilerini kaydet (response.magaza alanından)
                if (userResponse.magaza && userResponse.magaza.length > 0) {
                  console.log('Gerçek magazalar kaydediliyor:', userResponse.magaza.length, 'adet mağaza');
                  
                  // Mağazaları alfabetik sırala
                  const sortedMagazalar = userResponse.magaza.sort((a: any, b: any) => 
                    a.magazaAdi.localeCompare(b.magazaAdi, 'tr')
                  );
                  
                  localStorage.setItem('magazalar', JSON.stringify(sortedMagazalar));
                  
                  // Daha önce seçilmiş mağaza var mı kontrol et
                  const previousSelectedStore = localStorage.getItem('selectedStore');
                  const isValidPreviousStore = previousSelectedStore && 
                    sortedMagazalar.find((m: any) => m._id === previousSelectedStore);
                  
                  if (isValidPreviousStore) {
                    console.log('Önceki seçili mağaza geri yüklendi:', previousSelectedStore);
                  } else {
                    // İlk mağazayı seçili yap
                    localStorage.setItem('selectedStore', sortedMagazalar[0]._id);
                    console.log('İlk mağaza seçili olarak kaydedildi:', sortedMagazalar[0]._id, '-', sortedMagazalar[0].magazaAdi);
                  }
                  
                  console.log('✅ Mağazalar localStorage\'a kaydedildi, login tamamlandı');
                } else {
                  console.warn('Kullanıcıya atanmış mağaza bulunamadı!');
                }
                
                this.isLoggedInSubject.next(true);
              }
            }).catch((error) => {
              console.error('Kullanıcı bilgileri alınamadı:', error);
              // Hata durumunda basic bilgilerle devam et
              localStorage.setItem('kullaniciAdi', kullaniciAdi);
              localStorage.setItem('role', 'Paket');
              this.isLoggedInSubject.next(true);
            });
          }
        })
      );
  }

  // Ana projeden alınan getUserFromServer metodu
  getUserFromServer(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.get(`${this.baseUrl}/api/auth/user`, { headers }).pipe(
      tap((response: any) => {
        console.log('getUserFromServer response:', response);
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

  getKullaniciAdi(): string | null {
    return localStorage.getItem('kullaniciAdi');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getMagazalar(): any[] {
    const magazalar = localStorage.getItem('magazalar');
    const result = magazalar ? JSON.parse(magazalar) : [];
    console.log('getMagazalar() result:', result);
    return result;
  }

  getSelectedStore(): string | null {
    return localStorage.getItem('selectedStore');
  }

  setSelectedStore(storeId: string): void {
    localStorage.setItem('selectedStore', storeId);
  }

  getParentUser(): string | null {
    return localStorage.getItem('parentUser');
  }

  isEgitimTamamlandi(): boolean {
    return localStorage.getItem('egitimTamamlandiMi') === 'true';
  }
}
