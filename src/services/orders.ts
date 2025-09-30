const API_BASE_URL = 'https://api.easycorest.com:5555/api';

// Ana Angular projeden: Performance optimized logging
const debugLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message, data);
  }
};

const errorLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.error(message, data); // Production'da error logları da kaldır
  }
};

const warnLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(message, data); // Production'da warning logları da kaldır
  }
};

// Ana Angular projeden: Background Sync değişkenleri
let trendyolSyncInterval: NodeJS.Timeout | null = null;
let trendyolRefundSyncInterval: NodeJS.Timeout | null = null;
let yemeksepetiRefundSyncInterval: NodeJS.Timeout | null = null;
let currentStoreId = '';
let isTrendyolSyncRunning = false;
let isTrendyolRefundSyncRunning = false;
let isYemeksepetiRefundSyncRunning = false;

// Ana Angular projeden: Progress kontrol değişkenleri
let trendyolSyncInProgress = false;
let trendyolRefundSyncInProgress = false;
let yemeksepetiRefundSyncInProgress = false;
let ordersLoadInProgress = false;

// Global API lock - aynı anda sadece 1 request
let globalApiLock = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // 2 saniye minimum aralık

export interface Order {
  _id: string;
  type: 'YEMEKSEPETI' | 'TRENDYOL' | 'MIGROS' | 'GETIR';
  platform?: string;
  status: string;
  createdAt: string;
  rawData: any;
}

export interface OrderResponse {
  success: boolean;
  data: {
    orders: Order[];
    summary: {
      total: number;
      byType: {
        yemeksepeti: number;
        trendyol: number;
        migros: number;
        getir: number;
      };
    };
  };
}

export class OrderService {
  static async getOrders(storeId: string): Promise<OrderResponse> {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      // Ana Angular projeden: Global API lock kontrolü
      const now = Date.now();
      if (globalApiLock || (now - lastRequestTime < MIN_REQUEST_INTERVAL)) {
        warnLog('🔒 Global API lock aktif, request engellendi');
        throw new Error('API lock aktif');
      }

      // Ana Angular projeden: Progress kontrolü - bir request bitmeden diğerini atma
      if (ordersLoadInProgress) {
        warnLog('⏳ Önceki sipariş yükleme henüz bitmedi, yeni istek engellendi');
        throw new Error('Önceki request devam ediyor');
      }

      globalApiLock = true;
      ordersLoadInProgress = true;
      lastRequestTime = now;
      debugLog(`📦 Sipariş API çağrısı: ${storeId}`);

      // Ana Angular projeden: Timeout kontrolü (15 saniye)
      const timeoutId = setTimeout(() => {
        if (ordersLoadInProgress) {
          console.warn('⏰ Sipariş yükleme timeout (15s)');
          ordersLoadInProgress = false;
        }
      }, 15000);

      const response = await fetch(`${API_BASE_URL}/aggregated-orders/${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('📦 Raw API Response:', {
        success: data.success,
        hasData: !!data.data,
        orderCount: data.data?.orders?.length || 0
      });

        // Debug: Sipariş detaylarını logla ve type'ı normalize et
        if (data.success && data.data?.orders?.length > 0) {
          data.data.orders.forEach((order: Order, index: number) => {
            // Type normalization - backend'den platform field'ı geliyorsa type'a çevir
            if (!order.type && order.platform) {
              const platform = order.platform.toLowerCase();
              switch (platform) {
                case 'yemeksepeti':
                  order.type = 'YEMEKSEPETI';
                  break;
                case 'trendyol':
                  order.type = 'TRENDYOL';
                  break;
                case 'migros':
                  order.type = 'MIGROS';
                  break;
                case 'getir':
                  order.type = 'GETIR';
                  break;
                default:
                  console.warn(`⚠️ Bilinmeyen platform: ${platform}`);
                  order.type = 'YEMEKSEPETI'; // Fallback
              }
              console.log(`🔄 Type normalize edildi: ${order.platform} → ${order.type}`);
            }

        // Sadece ilk 3 sipariş için debug (spam önleme)
        if (index < 3) {
          debugLog(`📋 Sipariş ${index + 1}:`, {
            originalPlatform: order.platform,
            normalizedType: order.type,
            status: order.status,
            hasRawData: !!order.rawData,
            rawDataKeys: order.rawData ? Object.keys(order.rawData) : []
          });
        }
          });
        }

      // Summary oluştur (yoksa)
      if (data.success && data.data && !data.data.summary) {
        const orders = data.data.orders || [];
        data.data.summary = {
          total: orders.length,
          byType: {
            yemeksepeti: orders.filter((o: Order) => (o.type?.toLowerCase() === 'yemeksepeti')).length,
            trendyol: orders.filter((o: Order) => (o.type?.toLowerCase() === 'trendyol')).length,
            migros: orders.filter((o: Order) => (o.type?.toLowerCase() === 'migros')).length,
            getir: orders.filter((o: Order) => (o.type?.toLowerCase() === 'getir')).length
          }
        };
      }

      return data;
      
    } catch (error) {
      console.error('❌ Sipariş getirme API hatası:', error);
      return {
        success: false,
        data: {
          orders: [],
          summary: {
            total: 0,
            byType: { yemeksepeti: 0, trendyol: 0, migros: 0, getir: 0 }
          }
        }
      };
    } finally {
      // Ana Angular projeden: Her durumda progress'i false yap
      ordersLoadInProgress = false;
      globalApiLock = false;
    }
  }

  static async approveOrder(order: Order): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const orderId = OrderService.getOrderId(order);
      debugLog(`🚀 Sipariş onaylama başlatılıyor: ${orderId} (${order.type})`);

      // Ana Angular projeden: Platform-specific order ID alma
      let platformOrderId = '';
      
      switch (order.type) {
        case 'YEMEKSEPETI':
          platformOrderId = order.rawData.code;
          break;
        case 'TRENDYOL':
          platformOrderId = order.rawData.orderNumber;
          break;
        case 'MIGROS':
          platformOrderId = order.rawData.orderId?.toString();
          break;
        case 'GETIR':
          platformOrderId = order.rawData.orderId?.toString() || order.rawData.confirmationId;
          break;
        default:
          console.error(`❌ Bilinmeyen platform için onaylama: ${order.type}`);
          return false;
      }

      if (!platformOrderId) {
        console.error(`❌ Platform order ID bulunamadı: ${orderId}`);
        return false;
      }

      // Ana Angular projeden: Kompleks approval data (MD dosyasındaki TAM sistem)
      debugLog('📦 prepareLocalOrder başlatılıyor...');
      const localOrderData = OrderService.prepareLocalOrder(order);
      
      debugLog('📊 Hazırlanan veri:', {
        urunSayisi: localOrderData.urunler?.length || 0,
        toplamFiyat: localOrderData.toplamVergiliFiyat,
        odemeVar: !!localOrderData.odeme,
        musteriAdi: localOrderData.musteri?.ad
      });

      // API için approval data oluştur
      const approvalData: any = {
        platform: order.type.toLowerCase(),
        orderId: OrderService.getOrderId(order),
        action: 'verify' as const,
        urunler: localOrderData.urunler
      };

      // Ödeme bilgisi varsa ekle
      if (localOrderData.odeme) {
        approvalData.odeme = localOrderData.odeme;
      }

      // Ana Angular projeden: Platform-specific data
      switch (order.type) {
        case 'TRENDYOL':
          approvalData.packageStatus = order.rawData.packageStatus;
          break;
          
        case 'GETIR':
          approvalData.isScheduled = order.rawData?.isScheduled || false;
          if (order.rawData?.scheduledDate) {
            approvalData.scheduledDate = order.rawData.scheduledDate;
          }
          break;
          
        case 'YEMEKSEPETI':
          approvalData.expeditionType = order.rawData.expeditionType;
          break;
          
        case 'MIGROS':
          approvalData.deliveryProvider = order.rawData.deliveryProvider;
          break;
      }

      console.log('📤 Onay verisi hazırlandı:', {
        orderId: approvalData.orderId,
        platform: approvalData.platform,
        action: approvalData.action,
        urunlerCount: approvalData.urunler?.length || 0,
        odemeVar: !!approvalData.odeme,
        payloadSize: JSON.stringify(approvalData).length
      });

      // FULL PAYLOAD DEBUG (MD dosyasından) - Sadece development'ta
      debugLog('🔍 FULL APPROVAL PAYLOAD:', JSON.stringify(approvalData, null, 2));

      // Ana Angular projeden: API call
      const response = await fetch(`${API_BASE_URL}/order-approval/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(approvalData)
      });

      const result = await response.json();
      
      if (response.ok && result) {
        console.log(`✅ Sipariş onaylandı: ${orderId}`, result);
        return true;
      } else {
        console.error(`❌ Sipariş onaylama hatası: ${orderId}`, result);
        return false;
      }
      
    } catch (error) {
      console.error(`❌ Sipariş onaylama API hatası: ${OrderService.getOrderId(order)}`, error);
      return false;
    }
  }

  // Helper metodları
  static getOrderId(order: Order): string {
    if (!order?.rawData) return '';

    switch (order.type) {
      case 'YEMEKSEPETI':
        const shortCode = order.rawData.shortCode || '';
        const code = order.rawData.code || '';
        return shortCode ? `${shortCode} (${code})` : code;
        
      case 'GETIR':
        return order.rawData.confirmationId || order.rawData.id || '';
        
      case 'TRENDYOL':
        const orderNumber = order.rawData.orderNumber || '';
        const orderCode = order.rawData.orderCode || '';
        return orderCode ? `${orderNumber} (${orderCode})` : orderNumber;
        
      case 'MIGROS':
        const migrosOrderId = order.rawData.orderId || '';
        const confirmationId = order.rawData.platformConfirmationId || '';
        return confirmationId ? `${migrosOrderId} (${confirmationId})` : migrosOrderId.toString();
        
      default:
        return order.rawData.id || order.rawData.orderNumber || order.rawData.orderId || '';
    }
  }

  // Ana Angular projeden: getCustomerName (birebir kopya)
  static getCustomerName(order: Order): string {
    if (!order?.rawData) return '';

    if (order.type === 'YEMEKSEPETI') {
      const customer = order.rawData.customer;
      return `${customer?.firstName || ''} ${customer?.lastName || ''}`;
    } else if (order.type === 'GETIR') {
      return order.rawData.client?.name || '';
    } else if (order.type === 'TRENDYOL') {
      const customer = order.rawData.customer;
      return `${customer?.firstName || ''} ${customer?.lastName || ''}`;
    } else if (order.type === 'MIGROS') {
      // Önce customerInfo'dan deneyelim, sonra customer'dan
      if (order.rawData.customerInfo?.name) {
        return order.rawData.customerInfo.name;
      } else if (order.rawData.customer) {
        const customer: any = order.rawData.customer;
        return customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`;
      }
      return '';
    }
    return '';
  }

  // Migros müşteri adı alma (gelişmiş)
  private static getMigrosCustomerName(order: Order): string {
    const rawData = order.rawData;
    
    // 1. customerInfo'dan dene
    if (rawData.customerInfo?.name) {
      return rawData.customerInfo.name;
    }
    
    // 2. customer objesi'nden dene
    if (rawData.customer) {
      const customer = rawData.customer;
      
      if (customer.fullName) return customer.fullName;
      
      const fullName = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
      if (fullName) return fullName;
      
      const possibleNames = [
        customer.name,
        customer.customerName,
        customer.displayName,
        customer.userName,
        customer.recipientName
      ].filter(Boolean);
      
      if (possibleNames.length > 0) return possibleNames[0];
    }

    // 3. Root level arama
    const rootFields = ['customerName', 'clientName', 'buyerName', 'recipientName'];
    for (const field of rootFields) {
      if (rawData[field]) return rawData[field];
    }

    // 4. Delivery address
    if (rawData.deliveryAddress?.recipientName) {
      return rawData.deliveryAddress.recipientName;
    }

    return 'Müşteri Bilgisi Yok';
  }

  // Ana Angular projeden: getProducts (birebir kopya)
  static getProducts(order: Order | null): any[] {
    if (!order?.rawData) return [];

    if (order.type === 'YEMEKSEPETI') {
      if (Array.isArray(order.rawData.products)) {
        return order.rawData.products;
      }
      return [];
    }
    else if (order.type === 'TRENDYOL') {
      if (Array.isArray(order.rawData.lines)) {
        // Her bir ürün için items dizisinin uzunluğunu miktar olarak ekleyelim
        return order.rawData.lines.map((line: any) => {
          // Ürün nesnesini değiştirmeden önce kopyasını oluştur
          const processedLine = { ...line };

          // Eğer items dizisi varsa, uzunluğunu quantity olarak ekle
          if (Array.isArray(processedLine.items) && processedLine.items.length > 0) {
            processedLine.quantity = processedLine.items.length;
          } else {
            // Varsayılan miktar
            processedLine.quantity = 1;
          }

          return processedLine;
        });
      }
      return [];
    }
    else if (order.type === 'GETIR') {
      if (Array.isArray(order.rawData.products)) {
        return order.rawData.products;
      }
      return [];
    }
    else if (order.type === 'MIGROS') {
      // Migros için önce items'ı kontrol et, yoksa products array'ini kullan
      if (Array.isArray(order.rawData.items)) {
        return order.rawData.items;
      }
      else if (Array.isArray((order.rawData as any).products)) {
        return (order.rawData as any).products;
      }
      return [];
    }
    return [];
  }

  // Ürün adı alma (platform-specific)
  static getProductName(product: any): string {
    if (!product) return 'Ürün Adı Bilinmiyor';

    try {
      // Çoklu dil desteği
      if (typeof product.name === 'object') {
        return product.name.tr || product.name.en || 'Ürün Adı Bilinmiyor';
      }
      
      return product.name || 'Ürün Adı Bilinmiyor';
    } catch (error) {
      console.error('❌ Ürün adı alma hatası:', error, product);
      return 'Ürün Adı Hatası';
    }
  }

  // Ürün miktarı alma
  static getProductQuantity(product: any): number {
    if (!product) return 0;
    
    try {
      // Farklı quantity field'ları
      if (product.count !== undefined) return Number(product.count) || 0;
      if (product.amount !== undefined) return Number(product.amount) || 0;
      if (product.quantity !== undefined) return Number(product.quantity) || 0;
      
      return 1; // Varsayılan
    } catch (error) {
      console.error('❌ Ürün miktarı alma hatası:', error, product);
      return 0;
    }
  }

  static getOrderAmount(order: Order): number {
    if (!order?.rawData) {
      console.warn('⚠️ getOrderAmount: rawData eksik');
      return 0;
    }

    let amount = 0;

    try {
      switch (order.type) {
        case 'YEMEKSEPETI':
          amount = OrderService.calculateYemekSepetiAmount(order);
          break;
          
        case 'GETIR':
          amount = OrderService.calculateGetirAmount(order);
          break;
          
        case 'TRENDYOL':
          amount = OrderService.calculateTrendyolAmount(order);
          break;
          
        case 'MIGROS':
          amount = OrderService.calculateMigrosAmount(order);
          break;
          
        default:
          console.warn(`⚠️ Bilinmeyen platform için fiyat hesaplama: ${order.type}`);
          amount = 0;
      }

      // Fiyat validasyonu
      if (isNaN(amount) || amount < 0) {
        console.error(`❌ Geçersiz fiyat hesaplandı: ${amount}`, order);
        amount = 0;
      }

      // 2 ondalık basamağa yuvarla
      amount = Math.round(amount * 100) / 100;
      
      console.log(`💰 Fiyat hesaplandı (${order.type}): ${amount} ₺`);
      
    } catch (error) {
      console.error(`❌ Fiyat hesaplama hatası (${order.type}):`, error, order);
      amount = 0;
    }

    return amount;
  }

  private static calculateYemekSepetiAmount(order: Order): number {
    return order.rawData.price?.grandTotal || 0;
  }

  private static calculateGetirAmount(order: Order): number {
    // Önce indirimli fiyatı kontrol et
    if (order.rawData.totalDiscountedPrice !== undefined && order.rawData.totalDiscountedPrice !== null) {
      return Number(order.rawData.totalDiscountedPrice) || 0;
    }
    
    // Sonra diğer fiyat alanlarını kontrol et
    return order.rawData.discountedAmount || 
           order.rawData.totalPrice || 
           order.rawData.totalAmount || 0;
  }

  private static calculateTrendyolAmount(order: Order): number {
    let totalDiscount = 0;
    const basePrice = order.rawData.totalPrice || 0;

    // İndirim hesaplama
    if (order.rawData?.lines && Array.isArray(order.rawData.lines)) {
      order.rawData.lines.forEach((line: any) => {
        if (line.items && Array.isArray(line.items)) {
          line.items.forEach((item: any) => {
            // Seller promosyon indirimleri
            if (item.promotions && Array.isArray(item.promotions)) {
              item.promotions.forEach((promo: any) => {
                if (promo.amount && promo.amount.seller) {
                  totalDiscount += Number(promo.amount.seller) || 0;
                }
              });
            }

            // Seller kupon indirimleri
            if (item.coupon && item.coupon.amount && item.coupon.amount.seller) {
              totalDiscount += Number(item.coupon.amount.seller) || 0;
            }
          });
        }
      });
    }

    const finalAmount = basePrice - totalDiscount;
    console.log(`💰 Trendyol fiyat hesaplandı: ${basePrice} - ${totalDiscount} = ${finalAmount}`);
    
    return finalAmount;
  }

  private static calculateMigrosAmount(order: Order): number {
    const rawData: any = order.rawData;
    
    // Önce direkt amount alanlarını kontrol et
    if (rawData.totalAmount || rawData.discountedAmount) {
      return Number(rawData.discountedAmount) || Number(rawData.totalAmount) || 0;
    }
    
    // Prices objesi kontrolü (penny'den TL'ye çevir)
    if (rawData.prices) {
      if (rawData.prices.restaurantDiscounted?.amountAsPenny) {
        return Math.round((rawData.prices.restaurantDiscounted.amountAsPenny / 100) * 100) / 100;
      }
      else if (rawData.prices.discounted?.amountAsPenny) {
        return Math.round((rawData.prices.discounted.amountAsPenny / 100) * 100) / 100;
      }
      else if (rawData.prices.total?.amountAsPenny) {
        return Math.round((rawData.prices.total.amountAsPenny / 100) * 100) / 100;
      }
    }

    console.warn('⚠️ Migros siparişinde fiyat bilgisi bulunamadı:', rawData.orderId);
    return 0;
  }


  // Logo cache for async loading
  private static logoCache: { [key: string]: string } = {};

  static getPlatformLogo(type: string): string {
    // Cache'den varsa döndür
    if (this.logoCache[type]) {
      return this.logoCache[type];
    }

    // Electron API kullan (artık doğru path döndürüyor)
    const isElectron = typeof window !== 'undefined' && window.electronAPI;
    if (isElectron && (window.electronAPI as any).getAssetPath) {
      // Async olarak yükle ve cache'le
      const logoFiles: { [key: string]: string } = {
        'YEMEKSEPETI': 'images/yemek-sepeti.png',
        'TRENDYOL': 'images/trendyollogo.png',
        'MIGROS': 'images/migros-yemek.png',
        'GETIR': 'images/getir.png'
      };
      
      const logoFile = logoFiles[type] || 'images/logo.svg';
      (window.electronAPI as any).getAssetPath(logoFile).then((path: string) => {
        console.log(`🏷️ Electron logo path (${type}):`, path);
        this.logoCache[type] = path;
        // Force re-render by triggering a custom event
        window.dispatchEvent(new CustomEvent('logo-loaded', { detail: { type, path } }));
      });
      
      // Fallback olarak default logo döndür
      return '/assets/images/logo.svg';
    } else {
      // Web browser için fallback path
      const basePath = `${process.env.PUBLIC_URL || ''}/assets/images`;
      const logoMap: { [key: string]: string } = {
        'YEMEKSEPETI': `${basePath}/yemek-sepeti.png`,
        'TRENDYOL': `${basePath}/trendyollogo.png`,
        'MIGROS': `${basePath}/migros-yemek.png`,
        'GETIR': `${basePath}/getir.png`
      };
      
      const logoPath = logoMap[type] || `${basePath}/logo.svg`;
      console.log(`🏷️ Browser logo path (${type}):`, logoPath);
      this.logoCache[type] = logoPath;
      return logoPath;
    }
  }

  static getOrderType(order: Order): string {
    if (!order?.rawData) return '';

    try {
      switch (order.type) {
        case 'YEMEKSEPETI':
          const expeditionType = order.rawData.expeditionType;
          if (expeditionType === 'pickup') return 'Gel Al';
          if (expeditionType === 'vendor') return 'Vendor';
          return 'Paket Siparişi';
          
        case 'GETIR':
          const deliveryType = order.rawData.deliveryType;
          if (deliveryType === 1) return 'Getir Getirsin';
          if (deliveryType === 2) return 'Restoran Getirsin';
          return 'Paket Siparişi';
          
        case 'TRENDYOL':
          const tyDeliveryType = order.rawData.deliveryType;
          if (tyDeliveryType === 'STORE_PICKUP') return 'Mağazadan Teslim';
          return 'Paket Siparişi';
          
        case 'MIGROS':
          const deliveryProvider = order.rawData.deliveryProvider;
          if (deliveryProvider === 'PICKUP') return 'Gel Al';
          if (deliveryProvider === 'MIGROS') return 'Migros Teslimat';
          return 'Paket Siparişi';
          
        default:
          return 'Paket Siparişi';
      }
    } catch (error) {
      console.error(`❌ Sipariş tipi alma hatası (${order.type}):`, error);
      return 'Paket Siparişi';
    }
  }

  // Ana Angular projeden: getPaymentType
  // Ana Angular projeden: prepareLocalOrder (TAM DETAY)
  static prepareLocalOrder(order: Order): any {
    console.log(`📦 prepareLocalOrder başlatılıyor: ${OrderService.getOrderId(order)} (${order.type})`);

    // 1. ANA ORDER ŞEMASI
    const localOrderData: any = {
      magazaKodu: localStorage.getItem('selectedStore'),
      siparisTarihi: new Date().toISOString(),
      urunler: [], // En önemli kısım - ürünler burada toplanacak
      toplamVergiliFiyat: 0,
      toplamVergisizFiyat: 0,
      toplamIndirim: 0,
    };

    // 2. MÜŞTERİ BİLGİLERİ
    const customerName = OrderService.getCustomerName(order);
    const phone = OrderService.getCustomerPhone(order);
    
    localOrderData.musteri = {
      ad: customerName || '',
      soyad: '', // Genelde boş
      telefon: phone || '',
    };

    console.log('👤 Müşteri bilgileri:', localOrderData.musteri);

    // 3. ADRES BİLGİLERİ
    const addressObj = OrderService.getDeliveryAddress(order);
    localOrderData.siparisAdresi = {
      adres: addressObj.address || '',
      adresAciklama: addressObj.description || '',
    };

    console.log('🏠 Adres bilgileri:', localOrderData.siparisAdresi);

    // 4. ÖDEME BİLGİLERİ (Eşleştirme varsa)
    if (order?.rawData?.payment?.mapping?.localPaymentType) {
      localOrderData.odeme = OrderService.preparePaymentData(order);
      console.log('💳 Ödeme bilgileri:', localOrderData.odeme);
    }

    // 5. ÜRÜN İŞLEME (Platform-specific)
    const urunler = OrderService.processProductsByPlatform(order);
    localOrderData.urunler = urunler;

    // 6. TOPLAM FİYAT HESAPLAMA
    localOrderData.toplamVergiliFiyat = urunler.reduce((total: number, urun: any) => {
      return total + (urun.vergiliFiyat * urun.miktar);
    }, 0);

    // Vergisiz fiyat (KDV %20)
    const kdvOrani = 20;
    const kdvCarpani = 1 + kdvOrani / 100;
    localOrderData.toplamVergisizFiyat = localOrderData.toplamVergiliFiyat / kdvCarpani;

    console.log('💰 Fiyat hesaplaması:', {
      toplamVergiliFiyat: localOrderData.toplamVergiliFiyat,
      toplamVergisizFiyat: localOrderData.toplamVergisizFiyat,
      urunSayisi: urunler.length
    });

    return localOrderData;
  }

  // Ana Angular projeden: preparePaymentData
  static preparePaymentData(order: Order): any {
    let totalAmount = 0;

    // Platform türüne göre totalAmount hesapla
    switch (order.type) {
      case 'YEMEKSEPETI':
        const grandTotal = order.rawData.price?.grandTotal?.toString() || '0';
        totalAmount = parseFloat(grandTotal);
        console.log('💳 YemekSepeti ödeme tutarı:', totalAmount);
        break;

      case 'GETIR':
        // Önce totalDiscountedPrice kontrolü
        if (order.rawData.totalDiscountedPrice !== undefined && order.rawData.totalDiscountedPrice !== null) {
          if (typeof order.rawData.totalDiscountedPrice === 'number') {
            totalAmount = order.rawData.totalDiscountedPrice;
          } else if (typeof order.rawData.totalDiscountedPrice === 'string') {
            totalAmount = parseFloat(order.rawData.totalDiscountedPrice || '0');
          }
        }
        // totalDiscountedPrice yoksa totalPrice kullan
        else if (typeof order.rawData.totalPrice === 'number') {
          totalAmount = order.rawData.totalPrice;
        } else if (typeof order.rawData.totalPrice === 'string') {
          totalAmount = parseFloat(order.rawData.totalPrice || '0');
        }
        console.log('💳 Getir ödeme tutarı:', totalAmount);
        break;

      case 'TRENDYOL':
        // Trendyol için indirim hesaplaması
        const basePrice = order.rawData.totalPrice || 0;
        const discount = OrderService.calculateTrendyolDiscount(order);
        totalAmount = basePrice - discount;
        console.log('💳 Trendyol ödeme tutarı:', { basePrice, discount, final: totalAmount });
        break;

      case 'MIGROS':
        // Migros için penny'den TL'ye çevir
        const migrosRawData = order.rawData as any;
        if (migrosRawData.prices?.restaurantDiscounted?.amountAsPenny) {
          totalAmount = migrosRawData.prices.restaurantDiscounted.amountAsPenny / 100;
        } else if (migrosRawData.prices?.discounted?.amountAsPenny) {
          totalAmount = migrosRawData.prices.discounted.amountAsPenny / 100;
        } else if (migrosRawData.prices?.total?.amountAsPenny) {
          totalAmount = migrosRawData.prices.total.amountAsPenny / 100;
        } else {
          const amount = OrderService.getOrderAmount(order);
          totalAmount = typeof amount === 'string' ? parseFloat((amount as string).replace(',', '.')) : (amount as number);
        }
        console.log('💳 Migros ödeme tutarı:', totalAmount);
        break;
    }

    // Ödeme objesi oluştur
    const paymentMapping = order.rawData.payment.mapping.localPaymentType;
    
    return {
      odemeTipi: paymentMapping._id,
      odemeAdi: paymentMapping.odemeAdi,
      muhasebeKodu: paymentMapping.muhasebeKodu || '',
      entegrasyonKodu: paymentMapping.entegrasyonKodu || '',
      totalAmount: totalAmount
    };
  }

  static calculateTrendyolDiscount(order: Order): number {
    let totalDiscount = 0;

    if (order.rawData?.lines && Array.isArray(order.rawData.lines)) {
      order.rawData.lines.forEach((line: any) => {
        if (line.items && Array.isArray(line.items)) {
          line.items.forEach((item: any) => {
            // Promosyon indirimleri
            if (item.promotions && Array.isArray(item.promotions)) {
              item.promotions.forEach((promo: any) => {
                if (promo.amount?.seller) {
                  totalDiscount += promo.amount.seller;
                }
              });
            }
            
            // Kupon indirimleri
            if (item.coupon?.amount?.seller) {
              totalDiscount += item.coupon.amount.seller;
            }
          });
        }
      });
    }

    return totalDiscount;
  }

  static processProductsByPlatform(order: Order): any[] {
    console.log(`⚙️ Platform-specific ürün işleme: ${order.type}`);

    switch (order.type) {
      case 'TRENDYOL':
        return OrderService.processTrendyolProducts(order);
      case 'YEMEKSEPETI':
        return OrderService.processYemekSepetiProducts(order);
      case 'GETIR':
        return OrderService.processGetirProducts(order);
      case 'MIGROS':
        return OrderService.processMigrosProducts(order);
      default:
        console.warn(`⚠️ Bilinmeyen platform: ${order.type}`);
        return [];
    }
  }

  static getPaymentType(order: Order): string {
    if (!order?.rawData) return '';

    let paymentType = '';

    try {
      // Önce mapping'den al
      const mapping = order.rawData.payment?.mapping?.localPaymentType;
      if (mapping?.odemeAdi) {
        return mapping.odemeAdi;
      }

      // Platform-specific payment handling
      switch (order.type) {
        case 'GETIR':
          paymentType = order.rawData.paymentMethodText?.tr || 
                       order.rawData.payment?.text?.tr || 
                       'Kredi Kartı';
          break;
          
        case 'YEMEKSEPETI':
          paymentType = order.rawData.payment?.text?.tr || 'Kredi Kartı';
          break;
          
        case 'TRENDYOL':
          // Yemek kartı kontrolü
          if (order.rawData.payment?.type === 'PAY_WITH_MEAL_CARD' && 
              order.rawData.payment?.mealCardType) {
            paymentType = `Yemek Kartı (${order.rawData.payment.mealCardType})`;
          } else {
            paymentType = order.rawData.payment?.text?.tr || 'Kredi Kartı';
          }
          break;
          
        case 'MIGROS':
          paymentType = 'Kredi Kartı'; // Migros default
          break;
          
        default:
          paymentType = 'Bilinmeyen Ödeme Tipi';
      }

      if (!paymentType) {
        console.warn(`⚠️ Ödeme tipi bulunamadı (${order.type}):`, OrderService.getOrderId(order));
        paymentType = 'Ödeme Tipi Bilinmiyor';
      }

    } catch (error) {
      console.error(`❌ Ödeme tipi alma hatası (${order.type}):`, error);
      paymentType = 'Ödeme Tipi Hatası';
    }

    return paymentType;
  }

  // Ana Angular projeden: YemekSepeti ürün işleme
  static processYemekSepetiProducts(order: Order): any[] {
    if (!order.rawData.products || !Array.isArray(order.rawData.products)) {
      console.warn('⚠️ YemekSepeti siparişinde ürün listesi eksik');
      return [];
    }

    console.log(`🍽️ YemekSepeti ürünleri işleniyor: ${order.rawData.products.length} ürün`);
    const processedProducts = [];

    for (const product of order.rawData.products) {
      try {
        // Ana ürün eşleştirme kontrolü
        if (!product.mapping?.localProduct) {
          console.warn(`⚠️ YemekSepeti ürün eşleştirmesi eksik: ${product.name}`);
          
          // Ana Angular projeden: Eşleştirme yoksa RAW DATA gönder
          const productObj: any = {
            urunId: null,
            urunAdi: product.name || 'Ürün Adı Bilinmiyor',
            miktar: product.quantity || 1,
            vergiliFiyat: product.price || 0,
            vergisizFiyat: (product.price || 0) / 1.2,
            isOneriliMenu: false,
            yapildimi: 'gonderildi',
            items: [] as any[],
            // Ana Angular projeden: Raw product data ekle
            rawData: {
              name: product.name,
              price: product.price,
              quantity: product.quantity,
              selectedToppings: product.selectedToppings || []
            }
          };
          
          processedProducts.push(productObj);
          continue;
        }

        const localProduct = product.mapping.localProduct;
        const quantity = product.quantity || 1;

        // Ana ürün objesi
        const productObj: any = {
          urunId: localProduct._id,
          urunAdi: localProduct.urunAdi,
          miktar: quantity,
          vergiliFiyat: product.price || 0,
          vergisizFiyat: (product.price || 0) / 1.2,
          isOneriliMenu: false,
          yapildimi: 'gonderildi',
          items: [] as any[]
        };

        // Selected toppings işle
        if (product.selectedToppings && Array.isArray(product.selectedToppings)) {
          productObj.items = OrderService.processYemekSepetiToppings(product.selectedToppings);
        }

        processedProducts.push(productObj);
        console.log(`✅ YemekSepeti ürün işlendi: ${localProduct.urunAdi} x${quantity}`);
        
      } catch (error) {
        console.error(`❌ YemekSepeti ürün işleme hatası:`, error, product);
      }
    }

    console.log(`📊 YemekSepeti ürün işleme tamamlandı: ${processedProducts.length} ürün`);
    return processedProducts;
  }

  // Ana Angular projeden: YemekSepeti toppings işleme
  static processYemekSepetiToppings(toppings: any[]): any[] {
    const toppingItems = [];

    for (const topping of toppings) {
      try {
        if (!topping.mapping?.localProduct) continue;

        const localProduct = topping.mapping.localProduct;
        const toppingItem: any = {
          tip: topping.mapping.localProductType || 'Urun',
          itemId: localProduct._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat: topping.price || 0,
          selected: true,
          istenmeyen: false,
          items: [] as any[],
          itemDetails: {
            urunAdi: localProduct.urunAdi,
            kategori: {},
            altKategori: {},
            items: [] as any[],
            urunItems: [] as any[]
          }
        };

        // Children işle
        if (topping.children && Array.isArray(topping.children)) {
          for (const child of topping.children) {
            if (child.mapping?.localProduct) {
              const childItem: any = {
                tip: child.mapping.localProductType || 'SKU',
                itemId: child.mapping.localProduct._id,
                miktar: 1,
                birim: 'adet',
                ekFiyat: child.price || 0,
                selected: true,
                istenmeyen: child.name?.toLowerCase().includes('istemiyorum') || false,
                items: [] as any[],
                itemDetails: {
                  urunAdi: child.mapping.localProduct.urunAdi,
                  kategori: {},
                  altKategori: {},
                  items: [] as any[],
                  urunItems: [] as any[]
                }
              };
              toppingItem.itemDetails.items.push(childItem);
            }
          }
        }

        toppingItems.push(toppingItem);
        
      } catch (error) {
        console.error(`❌ YemekSepeti topping işleme hatası:`, error, topping);
      }
    }

    return toppingItems;
  }

  // Ana Angular projeden: YemekSepeti ödeme işleme
  static processYemekSepetiPayment(order: Order): any {
    if (!order.rawData.payment?.mapping?.localPaymentType) {
      return null;
    }

    const paymentMapping = order.rawData.payment.mapping.localPaymentType;
    return {
      odemeTipi: paymentMapping._id,
      odemeAdi: paymentMapping.odemeAdi,
      muhasebeKodu: paymentMapping.muhasebeKodu || '',
      entegrasyonKodu: paymentMapping.entegrasyonKodu || '',
      totalAmount: order.rawData.price?.grandTotal || 0
    };
  }

  // Ana Angular projeden: Trendyol ürün işleme (MD dosyasından)
  static processTrendyolProducts(order: Order): any[] {
    if (!Array.isArray(order.rawData.lines)) {
      console.warn('⚠️ Trendyol lines array eksik');
      return [];
    }

    console.log(`🍊 Trendyol ürünleri işleniyor: ${order.rawData.lines.length} line`);
    const urunler = [];

    // İstenmeyen ürünleri filtrele
    const mainProducts = order.rawData.lines.filter((line: any) => {
      if (line.name &&
          (line.name.toLowerCase().startsWith('promosyon') ||
           line.name.toLowerCase().startsWith('ekstra')) &&
          line.name.toLowerCase().endsWith('istemiyorum')) {
        console.log(`🚫 Trendyol istenmeyen ürün filtrelendi: ${line.name}`);
        return false;
      }
      return line.mapping?.eslestirilenUrun;
    });

    for (const mainProduct of mainProducts) {
      const localMainProd = mainProduct.mapping.eslestirilenUrun;
      if (!localMainProd) continue;

      // Miktar hesaplama (items dizisinin uzunluğu)
      let productQuantity = 1;
      if (Array.isArray(mainProduct.items) && mainProduct.items.length > 0) {
        productQuantity = mainProduct.items.length;
      }

      // Ana ürün objesi
      const productObj: any = {
        urunId: localMainProd._id,
        urunAdi: localMainProd.urunAdi,
        miktar: productQuantity,
        vergiliFiyat: mainProduct.price || 0,
        vergisizFiyat: (mainProduct.price || 0) / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: [] as any[] // Modifier'lar burada toplanacak
      };

      // Modifier products işle
      if (Array.isArray(mainProduct.modifierProducts)) {
        const modifierItems = OrderService.processTrendyolModifiers(mainProduct.modifierProducts);
        productObj.items = modifierItems;
      }

      urunler.push(productObj);
      console.log(`✅ Trendyol ürün eklendi: ${localMainProd.urunAdi} x${productQuantity}`);
    }

    return urunler;
  }

  // Ana Angular projeden: Trendyol modifiers işleme
  static processTrendyolModifiers(modifiers: any[]): any[] {
    const modifierItems = [];

    for (const modifier of modifiers) {
      if (!modifier.mapping?.eslestirilenUrun) {
        console.warn(`⚠️ Trendyol modifier eşleştirmesi eksik: ${modifier.name}`);
        continue;
      }

      const modifierName = modifier.name || '';
      const isUnwanted = modifierName.toLowerCase().includes('istemiyorum');

      if (isUnwanted) {
        // İstenmeyen modifier - direkt ekle
        const unwantedItem = {
          tip: modifier.mapping.eslestirilenUrunTipi || 'SKU',
          itemId: modifier.mapping.eslestirilenUrun._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          selected: true,
          istenmeyen: true
        };
        
        modifierItems.push(unwantedItem);
        console.log(`🚫 Trendyol istenmeyen modifier: ${modifierName}`);
      } else {
        // Normal modifier
        const modifierItem: any = {
          tip: modifier.mapping.eslestirilenUrunTipi || 'Urun',
          itemId: modifier.mapping.eslestirilenUrun._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          selected: true,
          istenmeyen: false,
          items: [] as any[],
          itemDetails: {
            urunAdi: modifier.mapping.eslestirilenUrun.urunAdi,
            kategori: {},
            altKategori: {},
            items: [] as any[], // İstenmeyen alt modifierlar
            urunItems: [] as any[] // Normal alt modifierlar
          }
        };

        // Alt modifier'ları işle
        if (Array.isArray(modifier.modifierProducts)) {
          for (const subMod of modifier.modifierProducts) {
            if (!subMod.mapping?.eslestirilenUrun) continue;

            const subName = subMod.name || '';
            const subIsUnwanted = subName.toLowerCase().includes('istemiyorum') || 
                                 subName.toLowerCase().includes('i̇stemiyorum');

            if (subIsUnwanted) {
              // İstenmeyen alt modifier
              const unwantedSubItem = {
                tip: subMod.mapping.eslestirilenUrunTipi || 'SKU',
                itemId: subMod.mapping.eslestirilenUrun._id,
                miktar: 1,
                birim: 'adet',
                ekFiyat: 0,
                selected: true,
                istenmeyen: true
              };

              modifierItem.itemDetails.items.push(unwantedSubItem);
              console.log(`🚫 Trendyol istenmeyen alt modifier: ${subName}`);
            } else {
              // Normal alt modifier
              const normalSubItem = {
                tip: subMod.mapping.eslestirilenUrunTipi || 'SKU',
                itemId: {
                  _id: subMod.mapping.eslestirilenUrun._id,
                  urunAdi: subMod.mapping.eslestirilenUrun.urunAdi
                },
                miktar: 1,
                birim: 'adet',
                ekFiyat: 0,
                selected: true
              };

              // Wrapper objesi
              const wrapperItem = {
                miktar: 1,
                birim: 'adet',
                ekFiyat: 0,
                items: [normalSubItem]
              };

              modifierItem.itemDetails.urunItems.push(wrapperItem);
              console.log(`✅ Trendyol normal alt modifier: ${subName}`);
            }
          }
        }

        modifierItems.push(modifierItem);
        console.log(`✅ Trendyol normal modifier: ${modifierName}`);
      }
    }

    return modifierItems;
  }

  static processTrendyolPayment(order: Order): any {
    if (!order.rawData.payment?.mapping?.localPaymentType) {
      console.warn('⚠️ Trendyol ödeme eşleştirmesi eksik');
      return null;
    }

    const paymentMapping = order.rawData.payment.mapping.localPaymentType;
    
    // Trendyol için indirim hesaplaması
    const basePrice = order.rawData.totalPrice || 0;
    const discount = OrderService.calculateTrendyolDiscount(order);
    const totalAmount = basePrice - discount;
    
    return {
      odemeTipi: paymentMapping._id,
      odemeAdi: paymentMapping.odemeAdi,
      muhasebeKodu: paymentMapping.muhasebeKodu || '',
      entegrasyonKodu: paymentMapping.entegrasyonKodu || '',
      totalAmount: totalAmount
    };
  }

  // Ana Angular projeden: Getir ürün işleme (MD dosyasından)
  static processGetirProducts(order: Order): any[] {
    const products = order.rawData.products || [];
    if (!Array.isArray(products)) {
      console.warn('⚠️ Getir products array eksik');
      return [];
    }

    console.log(`🟣 Getir ürünleri işleniyor: ${products.length} ürün`);
    const urunler = [];

    for (const product of products) {
      const localProd = product.mapping?.localProduct;
      if (!localProd) {
        console.warn(`⚠️ Getir ürün eşleştirmesi eksik: ${product.name}`);
        continue;
      }

      const miktar = product.quantity || 1;
      const unitPrice = product.price || 0;

      // Ana ürün objesi
      const urunItem: any = {
        urunId: localProd._id,
        urunAdi: localProd.urunAdi,
        miktar,
        vergiliFiyat: unitPrice,
        vergisizFiyat: unitPrice / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: [] as any[] // Options burada toplanacak
      };

      // Options işle
      if (product.options && Array.isArray(product.options)) {
        const optionItems = OrderService.processGetirOptions(product.options);
        urunItem.items = optionItems;
      }

      urunler.push(urunItem);
      console.log(`✅ Getir ürün eklendi: ${localProd.urunAdi} x${miktar}`);
    }

    return urunler;
  }

  // Ana Angular projeden: Getir options işleme
  static processGetirOptions(options: any[]): any[] {
    const optionItems = [];

    for (const category of options) {
      if (!Array.isArray(category.options)) continue;

      for (const option of category.options) {
        const localProd = option.mapping?.localProduct;
        if (!localProd) {
          console.warn(`⚠️ Getir option eşleştirmesi eksik: ${option.name?.tr}`);
          continue;
        }

        const type = option.mapping?.localProductType || 'Recipe';
        const ekFiyat = parseFloat(option.price || '0');

        // Ana option item
        const optionItem: any = {
          tip: type,
          itemId: localProd._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat,
          selected: true,
          istenmeyen: false,
          items: [] as any[],
          itemDetails: {
            urunAdi: localProd.urunAdi || option.name?.tr,
            kategori: {},
            altKategori: {},
            items: [] as any[], // Çıkarılacak malzemeler
            urunItems: [] as any[] // Normal seçimler
          }
        };

        // Option categories işle (soslar, çıkarılacak malzemeler)
        if (option.optionCategories && Array.isArray(option.optionCategories)) {
          option.optionCategories.forEach((optionCategory: any) => {
            const categoryName = optionCategory.name?.tr || '';
            const isUnwantedCategory = categoryName.toLowerCase().includes('çıkarılacak') || 
                                     categoryName.toLowerCase().includes('remove');

            if (optionCategory.options && Array.isArray(optionCategory.options)) {
              optionCategory.options.forEach((subOption: any) => {
                const subLocalProd = subOption.mapping?.localProduct;
                const subItemId = subLocalProd ? subLocalProd._id : subOption.product;
                const subProductName = subLocalProd ? subLocalProd.urunAdi : subOption.name?.tr;

                if (isUnwantedCategory) {
                  // Çıkarılacak malzemeler
                  const unwantedItem = {
                    tip: subOption.mapping?.localProductType || 'Recipe',
                    itemId: subItemId,
                    miktar: 1,
                    birim: 'adet',
                    ekFiyat: 0,
                    selected: true,
                    istenmeyen: true,
                    itemDetails: {
                      urunAdi: subProductName,
                      kategori: {},
                      altKategori: {},
                      items: [] as any[],
                      urunItems: [] as any[]
                    }
                  };
                  
                  optionItem.itemDetails.items.push(unwantedItem);
                  console.log(`🚫 Getir çıkarılacak malzeme: ${subOption.name?.tr}`);
                } else {
                  // Normal customer seçimi
                  const customerChoiceItem = {
                    miktar: 1,
                    birim: 'adet',
                    ekFiyat: 0,
                    items: [
                      {
                        tip: subOption.mapping?.localProductType || 'Recipe',
                        itemId: subLocalProd ? {
                          _id: subItemId,
                          urunAdi: subProductName
                        } : subItemId,
                        miktar: 1,
                        birim: 'adet',
                        ekFiyat: 0,
                        selected: true
                      }
                    ]
                  };

                  optionItem.itemDetails.urunItems.push(customerChoiceItem);
                  console.log(`✅ Getir normal seçim: ${subOption.name?.tr}`);
                }
              });
            }
          });
        }

        optionItems.push(optionItem);
      }
    }

    return optionItems;
  }

  static processGetirPayment(order: Order): any {
    if (!order.rawData.payment?.mapping?.localPaymentType) {
      console.warn('⚠️ Getir ödeme eşleştirmesi eksik');
      return null;
    }

    const paymentMapping = order.rawData.payment.mapping.localPaymentType;
    
    // Getir için totalDiscountedPrice veya totalPrice
    let totalAmount = 0;
    if (order.rawData.totalDiscountedPrice !== undefined && order.rawData.totalDiscountedPrice !== null) {
      totalAmount = typeof order.rawData.totalDiscountedPrice === 'number' 
        ? order.rawData.totalDiscountedPrice 
        : parseFloat(order.rawData.totalDiscountedPrice || '0');
    } else {
      totalAmount = typeof order.rawData.totalPrice === 'number' 
        ? order.rawData.totalPrice 
        : parseFloat(order.rawData.totalPrice || '0');
    }
    
    return {
      odemeTipi: paymentMapping._id,
      odemeAdi: paymentMapping.odemeAdi,
      muhasebeKodu: paymentMapping.muhasebeKodu || '',
      entegrasyonKodu: paymentMapping.entegrasyonKodu || '',
      totalAmount: totalAmount
    };
  }

  // Ana Angular projeden: Migros ürün işleme (MD dosyasından)
  static processMigrosProducts(order: Order): any[] {
    const rawData: any = order.rawData;
    const products = rawData.items || rawData.products || [];

    if (!Array.isArray(products)) {
      console.warn('⚠️ Migros products array eksik');
      return [];
    }

    console.log(`🟢 Migros ürünleri işleniyor: ${products.length} ürün`);
    const urunler = [];

    for (const product of products) {
      const localProd = product.mapping?.localProduct;
      if (!localProd) {
        console.warn(`⚠️ Migros ürün eşleştirmesi eksik: ${product.name}`);
        continue;
      }

      const miktar = product.amount || product.quantity || 1;
      const unitPrice = product.price || 0;

      // Ana ürün objesi
      const urunItem: any = {
        urunId: localProd._id,
        urunAdi: localProd.urunAdi,
        miktar,
        vergiliFiyat: unitPrice,
        vergisizFiyat: unitPrice / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: [] as any[] // Options burada toplanacak
      };

      // Options işle
      if (product.options && Array.isArray(product.options)) {
        const optionItems = OrderService.processMigrosOptions(product.options);
        urunItem.items = optionItems;
      }

      urunler.push(urunItem);
      console.log(`✅ Migros ürün eklendi: ${localProd.urunAdi} x${miktar}`);
    }

    return urunler;
  }

  // Ana Angular projeden: Migros options işleme
  static processMigrosOptions(options: any[]): any[] {
    const optionItems = [];

    for (const option of options) {
      if (!option.mapping?.localProduct) {
        console.warn(`⚠️ Migros option eşleştirmesi eksik: ${option.itemNames}`);
        continue;
      }

      const localProduct = option.mapping.localProduct;
      const localType = option.mapping.localProductType || 'Urun';

      // Ana option item
      const optionItem: any = {
        tip: localType,
        itemId: localProduct._id,
        miktar: 1,
        birim: 'adet',
        ekFiyat: 0,
        selected: true,
        istenmeyen: false,
        itemDetails: {
          urunAdi: localProduct.urunAdi || option.itemNames,
          kategori: {},
          altKategori: {},
          items: [] as any[], // İstenmeyen subOptions
          urunItems: [] as any[] // Normal subOptions
        }
      };

      // SubOptions işle
      if (option.subOptions && Array.isArray(option.subOptions)) {
        for (const subOption of option.subOptions) {
          if (!subOption.mapping?.localProduct) continue;

          const subLocalProduct = subOption.mapping.localProduct;
          const subLocalType = subOption.mapping.localProductType || 'Recipe';
          const subName = subOption.itemNames || '';

          // String normalize (Türkçe karakter problemi için)
          const normalizedText = subName.toString().toLowerCase()
            .replace(/i̇/g, 'i')
            .replace(/ı/g, 'i')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

          const hasEkstra = normalizedText.includes("ekstra");
          const hasIstemiyorum = normalizedText.includes("istemiyorum");

          // "Ekstra" + "İstemiyorum" kombinasyonunu atla
          if (hasEkstra && hasIstemiyorum) {
            console.log(`🚫 Migros ekstra istemiyorum atlandı: ${subName}`);
            continue;
          }

          // İstenmeyen kontrolü
          const isIngredient = subOption.optionType === 'INGREDIENT';
          const isUnwanted = (hasIstemiyorum && !hasEkstra) || isIngredient;

          if (isUnwanted) {
            // İstenmeyen subOption
            const unwantedSubItem = {
              tip: subLocalType,
              itemId: subLocalProduct._id,
              miktar: 1,
              birim: 'adet',
              ekFiyat: 0,
              selected: true,
              istenmeyen: true,
              itemDetails: {
                urunAdi: subLocalProduct.urunAdi || subName,
                kategori: {},
                altKategori: {},
                items: [] as any[],
                urunItems: [] as any[]
              }
            };

            optionItem.itemDetails.items.push(unwantedSubItem);
            console.log(`🚫 Migros istenmeyen: ${subName}`);
          } else {
            // Normal customer seçimi
            const customerChoiceItem = {
              miktar: 1,
              birim: 'adet',
              ekFiyat: 0,
              items: [
                {
                  tip: subLocalType,
                  itemId: {
                    _id: subLocalProduct._id,
                    urunAdi: subLocalProduct.urunAdi
                  },
                  miktar: 1,
                  birim: 'adet',
                  ekFiyat: 0,
                  selected: true
                }
              ]
            };

            optionItem.itemDetails.urunItems.push(customerChoiceItem);
            console.log(`✅ Migros normal seçim: ${subName}`);
          }
        }
      }

      optionItems.push(optionItem);
    }

    return optionItems;
  }

  static processMigrosPayment(order: Order): any {
    if (!order.rawData.payment?.mapping?.localPaymentType) {
      console.warn('⚠️ Migros ödeme eşleştirmesi eksik');
      return null;
    }

    const paymentMapping = order.rawData.payment.mapping.localPaymentType;
    
    // Migros için penny'den TL'ye çevir
    const migrosRawData = order.rawData as any;
    let totalAmount = 0;
    
    if (migrosRawData.prices?.restaurantDiscounted?.amountAsPenny) {
      totalAmount = migrosRawData.prices.restaurantDiscounted.amountAsPenny / 100;
    } else if (migrosRawData.prices?.discounted?.amountAsPenny) {
      totalAmount = migrosRawData.prices.discounted.amountAsPenny / 100;
    } else if (migrosRawData.prices?.total?.amountAsPenny) {
      totalAmount = migrosRawData.prices.total.amountAsPenny / 100;
    } else {
      const amount = OrderService.getOrderAmount(order);
      totalAmount = typeof amount === 'string' ? parseFloat((amount as string).replace(',', '.')) : (amount as number);
    }
    
    return {
      odemeTipi: paymentMapping._id,
      odemeAdi: paymentMapping.odemeAdi,
      muhasebeKodu: paymentMapping.muhasebeKodu || '',
      entegrasyonKodu: paymentMapping.entegrasyonKodu || '',
      totalAmount: totalAmount
    };
  }

  // Ana Angular projeden: Background Sync Sistemleri
  static startBackgroundSyncs(storeId: string): void {
    if (!storeId) return;
    
    console.log('🚀 Background sync sistemleri başlatılıyor...', storeId);
    currentStoreId = storeId;
    
    // Trendyol Sync - Her 11 saniyede bir
    OrderService.startTrendyolSync(storeId);
    console.log('✅ Trendyol Sync başlatıldı (11 saniye interval)');
    
    // Trendyol Refund Sync - Her 1 saatte bir
    OrderService.startTrendyolRefundSync(storeId);
    console.log('✅ Trendyol Refund Sync başlatıldı (1 saat interval)');
    
    // YemekSepeti Refund Sync - Her 3 saatte bir
    OrderService.startYemeksepetiRefundSync(storeId);
    console.log('✅ YemekSepeti Refund Sync başlatıldı (3 saat interval)');
    
    console.log('🎯 Tüm background sync sistemleri aktif!');
  }

  static stopBackgroundSyncs(): void {
    console.log('🛑 Background sync sistemleri durduruluyor...');
    
    if (trendyolSyncInterval) {
      clearInterval(trendyolSyncInterval);
      trendyolSyncInterval = null;
      isTrendyolSyncRunning = false;
    }
    
    if (trendyolRefundSyncInterval) {
      clearInterval(trendyolRefundSyncInterval);
      trendyolRefundSyncInterval = null;
      isTrendyolRefundSyncRunning = false;
    }
    
    if (yemeksepetiRefundSyncInterval) {
      clearInterval(yemeksepetiRefundSyncInterval);
      yemeksepetiRefundSyncInterval = null;
      isYemeksepetiRefundSyncRunning = false;
    }
    
    console.log('✅ Tüm background sync sistemleri durduruldu');
  }

  // Ana Angular projeden: Trendyol Sync
  static startTrendyolSync(storeId: string): void {
    if (!storeId || isTrendyolSyncRunning) return;
    
    isTrendyolSyncRunning = true;

    trendyolSyncInterval = setInterval(async () => {
      if (!isTrendyolSyncRunning) return;
      
      // Ana Angular projeden: Progress kontrolü - bir request bitmeden diğerini atma
      if (trendyolSyncInProgress) {
        console.log('⏳ Önceki Trendyol sync henüz bitmedi, yeni istek engellendi');
        return;
      }
      
      trendyolSyncInProgress = true;
      
      // Ana Angular projeden: Timeout kontrolü (30 saniye)
      const timeoutId = setTimeout(() => {
        if (trendyolSyncInProgress) {
          console.warn('⏰ Trendyol sync timeout (30s)');
          trendyolSyncInProgress = false;
        }
      }, 30000);
      
      try {
        const syncUrl = `${API_BASE_URL}/trendyol-orders/sync/${storeId}?packageStatuses=Created`;
        if (process.env.NODE_ENV === 'development') {
          console.log(`🍊 Trendyol sync başlatılıyor: ${storeId}`);
        }
        
        const response = await fetch(syncUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({})
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (process.env.NODE_ENV === 'development') {
          console.log('✅ Trendyol sync başarılı:', result);
        }
        } else {
          console.warn('⚠️ Trendyol sync hatası:', response.status);
        }
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('❌ Trendyol sync hatası:', error);
      } finally {
        // Ana Angular projeden: Her durumda progress'i false yap
        trendyolSyncInProgress = false;
      }
    }, 11000);
  }

  // Ana Angular projeden: Trendyol Refund Sync
  static startTrendyolRefundSync(storeId: string): void {
    if (!storeId || isTrendyolRefundSyncRunning) return;
    
    isTrendyolRefundSyncRunning = true;

    trendyolRefundSyncInterval = setInterval(async () => {
      if (!isTrendyolRefundSyncRunning) return;
      
      try {
        const now = Date.now();
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        
        const refundUrl = `${API_BASE_URL}/trendyol-orders-diger/${storeId}/iades?size=100&storeId=${storeId}&createdStartDate=${oneDayAgo}&createdEndDate=${now}`;
        console.log(`🔄 Trendyol refund sync başlatılıyor: ${storeId}`);
        
        const response = await fetch(refundUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Trendyol refund sync başarılı:', {
            cancelledOrderCount: result?.data?.length || 0
          });
        } else {
          console.warn('⚠️ Trendyol refund sync hatası:', response.status);
        }
      } catch (error) {
        console.error('❌ Trendyol refund sync hatası:', error);
      }
    }, 60 * 60 * 1000); // 1 saat
  }

  // Ana Angular projeden: YemekSepeti Refund Sync
  static startYemeksepetiRefundSync(storeId: string): void {
    if (!storeId || isYemeksepetiRefundSyncRunning) return;
    
    isYemeksepetiRefundSyncRunning = true;

    yemeksepetiRefundSyncInterval = setInterval(async () => {
      if (!isYemeksepetiRefundSyncRunning) return;
      
      try {
        const refundUrl = `${API_BASE_URL}/yemeksepetideliveryhero/siparisRaporu?status=cancelled&pastNumberOfHours=24`;
        console.log(`🍽️ YemekSepeti refund sync başlatılıyor: ${storeId}`);
        
        const response = await fetch(refundUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ YemekSepeti refund sync başarılı:', {
            cancelledOrderCount: result?.data?.length || 0
          });
        } else {
          console.warn('⚠️ YemekSepeti refund sync hatası:', response.status);
        }
      } catch (error) {
        console.error('❌ YemekSepeti refund sync hatası:', error);
      }
    }, 3 * 60 * 60 * 1000); // 3 saat
  }

  static getSyncStatus(): any {
    return {
      trendyol: {
        isRunning: isTrendyolSyncRunning,
        storeId: currentStoreId
      },
      trendyolRefund: {
        isRunning: isTrendyolRefundSyncRunning,
        storeId: currentStoreId
      },
      yemeksepetiRefund: {
        isRunning: isYemeksepetiRefundSyncRunning,
        storeId: currentStoreId
      }
    };
  }

  // Ana Angular projeden: getCustomerPhone
  static getCustomerPhone(order: Order): string {
    if (!order?.rawData) return '';

    switch (order.type) {
      case 'YEMEKSEPETI':
        return order.rawData.customer?.mobilePhone || '';
        
      case 'GETIR':
        return order.rawData.client?.contactPhoneNumber || '';
        
      case 'TRENDYOL':
        return order.rawData.callCenterPhone || order.rawData.address?.phone || '';
        
      case 'MIGROS':
        // Önce customerInfo'dan deneyelim, sonra customer'dan
        if (order.rawData.customerInfo?.phone) {
          return order.rawData.customerInfo.phone;
        } else if (order.rawData.customer) {
          const customer: any = order.rawData.customer;
          return customer.phoneNumber || '';
        }
        return '';
        
      default:
        return '';
    }
  }

  // Ana Angular projeden: getDeliveryAddress
  static getDeliveryAddress(order: Order): {
    address?: string;
    doorNo?: string;
    floor?: string;
    description?: string;
    fullAddress?: string;
  } {
    if (!order?.rawData) return {};

    try {
      switch (order.type) {
        case 'GETIR':
          const getirAddress = order.rawData.client?.deliveryAddress;
          if (!getirAddress) return {};
          
          const fullAddress = [
            getirAddress.address,
            getirAddress.district,
            getirAddress.city
          ].filter(Boolean).join(', ');

          return {
            address: fullAddress,
            doorNo: getirAddress.doorNo || '',
            floor: getirAddress.floor || '',
            description: getirAddress.description || '',
            fullAddress
          };
          
        case 'YEMEKSEPETI':
          const ysAddress = order.rawData.delivery?.address;
          if (!ysAddress) return {};

          let addressLine = '';
          const components = [
            ysAddress.street,
            ysAddress.number ? `No:${ysAddress.number}` : null,
            ysAddress.building,
            ysAddress.city,
            ysAddress.postcode
          ].filter(Boolean);
          
          addressLine = components.join(', ');
          
          if (ysAddress.company) {
            addressLine += ` (${ysAddress.company})`;
          }

          return {
            address: addressLine.trim(),
            doorNo: ysAddress.flatNumber || '',
            floor: ysAddress.floor || '',
            description: ysAddress.deliveryInstructions || order.rawData.comments?.customerComment || '',
            fullAddress: addressLine.trim()
          };
          
        case 'TRENDYOL':
          const tyAddress = order.rawData.address;
          if (!tyAddress) return {};

          const tyComponents = [
            tyAddress.address1,
            tyAddress.address2,
            tyAddress.neighborhood,
            tyAddress.district,
            tyAddress.city
          ].filter(Boolean);
          
          const tyFullAddress = tyComponents.join(', ');

          return {
            address: tyFullAddress,
            doorNo: tyAddress.doorNumber || tyAddress.apartmentNumber || '',
            floor: tyAddress.floor || '',
            description: tyAddress.addressDescription || order.rawData.customerNote || '',
            fullAddress: tyFullAddress
          };
          
        case 'MIGROS':
          const migrosRawData: any = order.rawData;
          
          // CustomerInfo'dan adres
          if (migrosRawData.customerInfo?.address) {
            const address = migrosRawData.customerInfo.address;
            const addressLine = [
              address.street,
              address.number ? `No:${address.number}` : null,
              address.detail
            ].filter(Boolean).join(', ');

            return {
              address: addressLine,
              doorNo: address.door || '',
              floor: address.floor || '',
              description: address.direction || '',
              fullAddress: addressLine
            };
          }
          
          // Customer.deliveryAddress'ten adres
          if (migrosRawData.customer?.deliveryAddress) {
            const address = migrosRawData.customer.deliveryAddress;
            
            let addressLine = address.detail || address.address || '';
            
            if (!addressLine) {
              const components = [
                address.streetName,
                address.buildingNumber ? `No:${address.buildingNumber}` : null,
                address.district,
                address.city
              ].filter(Boolean);
              
              addressLine = components.join(', ');
            }

            return {
              address: addressLine,
              doorNo: address.doorNumber || '',
              floor: address.floorNumber || '',
              description: address.direction || '',
              fullAddress: addressLine
            };
          }

          return {};
          
        default:
          return {};
      }
    } catch (error) {
      console.error(`❌ Adres işleme hatası (${order.type}):`, error);
      return {};
    }
  }

  // MD dosyalarından: Platform-specific yeni sipariş kontrolü
  static isOrderReceived(order: Order): boolean {
    if (!order?.status) {
      console.warn('⚠️ Sipariş status bilgisi eksik:', order);
      return false;
    }
    
    const status = order.status.toString().toLowerCase();
    const orderId = OrderService.getOrderId(order);
    
    // Sadece yeni siparişler için log (spam önleme)
    // debugLog(`🔍 Yeni sipariş kontrolü: ${orderId} (${order.type}) - Status: ${status}`);

    // Platform-specific kontroller
    const isNew = OrderService.checkNewOrderByPlatform(order, status);
    
    if (isNew) {
      console.log(`🆕 YENİ SİPARİŞ TESPİT EDİLDİ: ${orderId} (${order.type})`);
    }
    
    return isNew;
  }

  private static checkNewOrderByPlatform(order: Order, status: string): boolean {
    switch (order.type) {
      case 'GETIR':
        return OrderService.isNewOrder_Getir(order, status);
        
      case 'YEMEKSEPETI':
        return OrderService.isNewOrder_YemekSepeti(order, status);
        
      case 'TRENDYOL':
        return OrderService.isNewOrder_Trendyol(order, status);
        
      case 'MIGROS':
        return OrderService.isNewOrder_Migros(order, status);
        
      default:
        console.warn(`⚠️ Bilinmeyen platform için yeni sipariş kontrolü: ${order.type}`);
        return false;
    }
  }

  private static isNewOrder_Getir(order: Order, status: string): boolean {
    // İleri tarihli sipariş kontrolü
    if (order.rawData?.isScheduled) {
      const isScheduledNew = status === '325' || status === '1600';
      if (isScheduledNew) {
        console.log(`📅 İleri tarihli Getir siparişi: ${OrderService.getOrderId(order)} - ${order.rawData.scheduledDate}`);
      }
      return isScheduledNew;
    }
    
    // Normal sipariş kontrolü
    return status === '400';
  }

  private static isNewOrder_YemekSepeti(order: Order, status: string): boolean {
    const isNew = status === 'processed' || status === 'received';
    
    if (isNew) {
      const expeditionType = order.rawData.expeditionType;
      console.log(`🍽️ Yeni YemekSepeti siparişi: ${OrderService.getOrderId(order)} - Tip: ${expeditionType}`);
    }
    
    return isNew;
  }

  private static isNewOrder_Trendyol(order: Order, status: string): boolean {
    // Trendyol için package status kontrolü
    const packageStatus = order.rawData?.packageStatus?.toLowerCase();
    const isNew = packageStatus === 'created';
    
    if (isNew) {
      console.log(`🛒 Yeni Trendyol siparişi: ${OrderService.getOrderId(order)} - Package Status: ${packageStatus}`);
    }
    
    return isNew;
  }

  private static isNewOrder_Migros(order: Order, status: string): boolean {
    const isNew = status === 'new_pending' || status.includes('new');
    
    if (isNew) {
      const deliveryProvider = order.rawData.deliveryProvider || order.rawData.delivery?.provider;
      console.log(`🛍️ Yeni Migros siparişi: ${OrderService.getOrderId(order)} - Provider: ${deliveryProvider}`);
    }
    
    return isNew;
  }

  // Ana Angular projeden: getSourceLogo
  static getSourceLogo(type: string | undefined): string {
    if (!type) return `${process.env.PUBLIC_URL || ''}/assets/images/logo.svg`;

    const basePath = `${process.env.PUBLIC_URL || ''}/assets/images`;
    switch (type.toUpperCase()) {
      case 'YEMEKSEPETI':
        return `${basePath}/yemek-sepeti.png`;
      case 'TRENDYOL':
        return `${basePath}/trendyollogo.png`;
      case 'MIGROS':
        return `${basePath}/migros-yemek.png`;
      case 'GETIR':
        return `${basePath}/getir.png`;
      default:
        return `${basePath}/logo.svg`;
    }
  }

  // Ana Angular projeden: getStatusText
  static getStatusText(status: string | number | undefined, order?: any): string {
    if (!status) return 'Durum Belirsiz';

    const statusStr = status.toString().toLowerCase();
    switch (statusStr) {
      case 'received':
      case '400': // Getir için
        return 'Yeni Sipariş';
      case '325': // Getir için ileri tarihli
        return order?.rawData?.isScheduled ? 'İleri Tarihli Sipariş' : 'Yeni Sipariş';
      case '1600': // Getir için ileri tarihli hatırlatma
        return order?.rawData?.isScheduled ? 'İleri Tarihli Sipariş' : 'Yeni Sipariş';
      case '200': // Getir için onaylanmış
        return 'Onaylandı';
      case 'processed': // YemekSepeti için yeni sipariş
        return 'Yeni Sipariş';
      case 'accepted': // YemekSepeti için onaylanmış sipariş
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'new':
        return 'Yeni Sipariş';
      // Trendyol durumları
      case 'created': // Trendyol için yeni sipariş
        return 'Yeni Sipariş';
      case 'preparing': // Trendyol için hazırlanıyor
      case 'picking': // Trendyol için toplama aşamasında
        return 'Hazırlanıyor';
      case 'invoiced': // Trendyol için fatura kesildi
        return 'Fatura Kesildi';
      case 'cancelled': // Trendyol için iptal edilmiş
        return 'İptal Edildi';
      case 'unsupplied': // Trendyol için tedarik edilemedi
        return 'Tedarik Edilemedi';
      case 'shipped': // Trendyol için gönderildi
        return 'Gönderildi';
      case 'delivered': // Trendyol için teslim edildi
        return 'Teslim Edildi';
      // Migros durumları
      case 'new_pending':
        return 'Yeni Sipariş';
      case 'approved':
        return 'Onaylandı';
      case 'cancelled_by_customer':
        return 'Müşteri Tarafından İptal Edildi';
      case 'cancelled_by_restaurant':
        return 'Restoran Tarafından İptal Edildi';
      default:
        // Eğer durum new kelimesini içeriyorsa, 'Yeni Sipariş' olarak göster
        if (statusStr.includes('new')) {
          return 'Yeni Sipariş';
        }
        // Eğer durum approve kelimesini içeriyorsa, 'Onaylandı' olarak göster
        if (statusStr.includes('approve')) {
          return 'Onaylandı';
        }
        // Eğer durum cancel kelimesini içeriyorsa, 'İptal Edildi' olarak göster
        if (statusStr.includes('cancel')) {
          return 'İptal Edildi';
        }
        // Eğer durum pending kelimesini içeriyorsa, 'Bekliyor' olarak göster
        if (statusStr.includes('pending')) {
          return 'Bekliyor';
        }

        // Siparişin platform tipine göre farklı bir varsayılan değer gösterelim
        if (order?.type === 'MIGROS') {
          // Bu Migros siparişi ise, durum metni bulunamadığında durum değerini doğrudan göster
          return `Sipariş Durumu: ${status}`;
        }

        return order?.rawData?.isScheduled ? 'İleri Tarihli Sipariş' : 'Durum Belirsiz';
    }
  }

  // Ana Angular projeden: formatDate
  static formatDate(date: string | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleString('tr-TR');
  }
}
