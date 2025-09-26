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
        // Token'ı kaydet
        localStorage.setItem('token', data.token);
        localStorage.setItem('kullaniciAdi', username);
        
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
}
