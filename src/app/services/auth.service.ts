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
  magazalar: any[];
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

  login(kullaniciAdi: string, password: string): Observable<LoginResponse> {
    const loginData = { kullaniciAdi, sifre: password };

    return this.http.post<LoginResponse>(`${this.baseUrl}/api/auth/login`, loginData)
      .pipe(
        tap((response: LoginResponse) => {
          if (response && response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('userId', response._id);
            localStorage.setItem('kullaniciAdi', response.kullaniciAdi);
            localStorage.setItem('role', response.role);
            
            if (response.magazalar && response.magazalar.length > 0) {
              localStorage.setItem('magazalar', JSON.stringify(response.magazalar));
              localStorage.setItem('selectedStore', response.magazalar[0]._id);
            }

            this.isLoggedInSubject.next(true);
          }
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
    return magazalar ? JSON.parse(magazalar) : [];
  }
}
