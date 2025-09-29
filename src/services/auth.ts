const API_BASE_URL = 'https://api.easycorest.com:5555/api';

export interface LoginResponse {
  success: boolean;
  token?: string;
  message?: string;
}

export interface User {
  _id: string;
  kullaniciAdi: string;
  email: string;
  role: { name: string };
  magaza: Array<{
    _id: string;
    magazaAdi: string;
    verilenmagazakodu?: string;
  }>;
}

export class AuthService {
  static async login(username: string, password: string): Promise<LoginResponse> {
    try {
      console.log('🔐 Login isteği gönderiliyor...');
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kullaniciAdi: username,
          sifre: password
        })
      });

      const data = await response.json();
      
      console.log('🔐 Login API Response:', data);
      
      // Token varsa başarılı
      if (data.token) {
        // Token'ı kaydet ve expiry time ekle (24 saat)
        localStorage.setItem('token', data.token);
        localStorage.setItem('kullaniciAdi', username);
        localStorage.setItem('tokenExpiry', (Date.now() + 24 * 60 * 60 * 1000).toString()); // 24 saat sonra
        
        console.log('✅ Login başarılı, kullanıcı bilgileri alınıyor...');
        
        // Kullanıcı bilgilerini al
        const userInfo = await this.getUserInfo();
        if (userInfo) {
          // Mağazaları kaydet
          localStorage.setItem('magazalar', JSON.stringify(userInfo.magaza || []));
          
          // Son seçilen mağazayı kontrol et, yoksa ilkini seç
          const savedStore = localStorage.getItem('selectedStore');
          const isValidStore = savedStore && userInfo.magaza.some(m => m._id === savedStore);
          
          if (!isValidStore && userInfo.magaza && userInfo.magaza.length > 0) {
            const firstStore = userInfo.magaza[0];
            localStorage.setItem('selectedStore', firstStore._id);
            console.log('✅ İlk mağaza seçildi:', firstStore.magazaAdi);
          } else if (isValidStore) {
            const selectedStore = userInfo.magaza.find(m => m._id === savedStore);
            console.log('✅ Son seçilen mağaza korundu:', selectedStore?.magazaAdi);
          }
        }
        
        return { success: true, token: data.token };
      }
      
      return { success: false, message: data.message || 'Login failed' };
      
    } catch (error) {
      console.error('❌ Login hatası:', error);
      return { success: false, message: 'Network error' };
    }
  }

  static async getUserInfo(): Promise<User | null> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;

      const response = await fetch(`${API_BASE_URL}/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ Kullanıcı bilgileri alındı:', {
          kullaniciAdi: userData.kullaniciAdi,
          magazaCount: userData.magaza?.length || 0
        });
        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Kullanıcı bilgisi alma hatası:', error);
      return null;
    }
  }

  static logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('kullaniciAdi');
    localStorage.removeItem('magazalar');
    localStorage.removeItem('selectedStore');
    localStorage.removeItem('soundEnabled');
    localStorage.removeItem('autoApproveEnabled');
    console.log('✅ Logout tamamlandı');
  }

  static isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  static getStores(): any[] {
    try {
      const stores = localStorage.getItem('magazalar');
      return stores ? JSON.parse(stores) : [];
    } catch {
      return [];
    }
  }

  static getSelectedStore(): string | null {
    return localStorage.getItem('selectedStore');
  }

  static setSelectedStore(storeId: string): void {
    localStorage.setItem('selectedStore', storeId);
  }

  static getUsername(): string {
    return localStorage.getItem('kullaniciAdi') || 'Kullanıcı';
  }

  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  // Token süresi kontrolü (24 saat)
  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem('tokenExpiry');
    if (!expiry) return true;
    
    const expiryTime = parseInt(expiry);
    const now = Date.now();
    
    console.log('🕐 Token expiry check:', {
      now: new Date(now).toLocaleString(),
      expiry: new Date(expiryTime).toLocaleString(),
      expired: now > expiryTime,
      remainingHours: Math.round((expiryTime - now) / (60 * 60 * 1000))
    });
    
    return now > expiryTime;
  }

  // Otomatik token refresh (kayıtlı kullanıcı adı/şifre ile)
  static async refreshTokenIfExpired(): Promise<boolean> {
    if (!this.isTokenExpired()) {
      console.log('✅ Token hâlâ geçerli');
      return true;
    }

    console.log('⏰ Token süresi dolmuş, otomatik refresh başlatılıyor...');
    
    // Kayıtlı bilgileri al
    const savedUsername = localStorage.getItem('rememberedUsername');
    const savedPassword = localStorage.getItem('rememberedPassword');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (!rememberMe || !savedUsername || !savedPassword) {
      console.log('❌ Otomatik refresh için kayıtlı bilgi yok');
      return false;
    }

    try {
      console.log('🔄 Otomatik token refresh:', savedUsername);
      const result = await this.login(savedUsername, savedPassword);
      
      if (result.success) {
        console.log('✅ Token otomatik refresh başarılı!');
        return true;
      } else {
        console.log('❌ Token refresh başarısız:', result.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Token refresh hatası:', error);
      return false;
    }
  }
}
