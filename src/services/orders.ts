const API_BASE_URL = 'https://api.easycorest.com:5555/api';

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

      console.log(`📦 Sipariş API çağrısı: ${storeId}`);

      const response = await fetch(`${API_BASE_URL}/aggregated-orders/${storeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

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

            console.log(`📋 Sipariş ${index + 1}:`, {
              originalPlatform: order.platform,
              normalizedType: order.type,
              status: order.status,
              hasRawData: !!order.rawData,
              rawDataKeys: order.rawData ? Object.keys(order.rawData) : []
            });
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
    }
  }

  static async approveOrder(order: Order): Promise<boolean> {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      console.log(`✅ Sipariş onaylama: ${OrderService.getOrderId(order)} (${order.type})`);

      const response = await fetch(`${API_BASE_URL}/order-approval/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orderId: order._id,
          platform: order.type,
          rawData: order.rawData
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Sipariş onaylandı:', OrderService.getOrderId(order));
        return true;
      } else {
        console.error('❌ Sipariş onaylama hatası:', result.message);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Sipariş onaylama API hatası:', error);
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

  static getCustomerName(order: Order): string {
    if (!order?.rawData) return 'Müşteri Bilgisi Yok';

    let customerName = '';

    try {
      switch (order.type) {
        case 'YEMEKSEPETI':
          const ysCustomer = order.rawData.customer;
          customerName = `${ysCustomer?.firstName || ''} ${ysCustomer?.lastName || ''}`.trim();
          break;
          
        case 'GETIR':
          customerName = order.rawData.client?.name || '';
          break;
          
        case 'TRENDYOL':
          const tyCustomer = order.rawData.customer;
          customerName = `${tyCustomer?.firstName || ''} ${tyCustomer?.lastName || ''}`.trim();
          break;
          
        case 'MIGROS':
          customerName = OrderService.getMigrosCustomerName(order);
          break;
          
        default:
          console.warn(`⚠️ Bilinmeyen platform: ${order.type}`);
      }

      if (!customerName) {
        console.warn(`⚠️ Müşteri adı bulunamadı (${order.type}):`, OrderService.getOrderId(order));
        customerName = 'Müşteri Bilgisi Yok';
      }

    } catch (error) {
      console.error(`❌ Müşteri adı alma hatası (${order.type}):`, error, order);
      customerName = 'Müşteri Bilgisi Hatası';
    }

    return customerName;
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

  // Ürün listesi alma (platform-specific)
  static getProducts(order: Order): any[] {
    if (!order?.rawData) return [];

    try {
      switch (order.type) {
        case 'YEMEKSEPETI':
          return order.rawData.products || [];
          
        case 'GETIR':
          return order.rawData.products || [];
          
        case 'TRENDYOL':
          return order.rawData.lines || [];
          
        case 'MIGROS':
          return order.rawData.items || order.rawData.products || [];
          
        default:
          console.warn(`⚠️ Bilinmeyen platform için ürün listesi: ${order.type}`);
          return [];
      }
    } catch (error) {
      console.error(`❌ Ürün listesi alma hatası (${order.type}):`, error);
      return [];
    }
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

  static getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'new': 'Yeni',
      'received': 'Alındı',
      'processed': 'İşleniyor',
      'accepted': 'Onaylandı',
      'preparing': 'Hazırlanıyor',
      'ready': 'Hazır',
      'completed': 'Tamamlandı',
      'cancelled': 'İptal',
      'ONAYLANDI': 'Onaylandı',
      'HAZIRLANYOR': 'Hazırlanıyor'
    };

    return statusMap[status] || status;
  }

  static getPlatformLogo(type: string): string {
    const logoMap: { [key: string]: string } = {
      'YEMEKSEPETI': '/assets/images/yemek-sepeti.png',
      'TRENDYOL': '/assets/images/trendyollogo.png',
      'MIGROS': '/assets/images/migros-yemek.png',
      'GETIR': '/assets/images/getir.png'
    };

    return logoMap[type] || '/assets/images/logo.svg';
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

  static getPaymentType(order: Order): string {
    if (!order?.rawData) return '';

    try {
      // Önce mapping'den al
      const mapping = order.rawData.payment?.mapping?.localPaymentType;
      if (mapping?.odemeAdi) {
        return mapping.odemeAdi;
      }

      // Platform-specific payment handling
      switch (order.type) {
        case 'GETIR':
          return order.rawData.paymentMethodText?.tr || 
                 order.rawData.payment?.text?.tr || 
                 'Kredi Kartı';
          
        case 'YEMEKSEPETI':
          return order.rawData.payment?.text?.tr || 'Kredi Kartı';
          
        case 'TRENDYOL':
          // Yemek kartı kontrolü
          if (order.rawData.payment?.type === 'PAY_WITH_MEAL_CARD' && 
              order.rawData.payment?.mealCardType) {
            return `Yemek Kartı (${order.rawData.payment.mealCardType})`;
          } else {
            return order.rawData.payment?.text?.tr || 'Kredi Kartı';
          }
          
        case 'MIGROS':
          return 'Kredi Kartı'; // Migros default
          
        default:
          return 'Bilinmeyen Ödeme Tipi';
      }
    } catch (error) {
      console.error(`❌ Ödeme tipi alma hatası (${order.type}):`, error);
      return 'Ödeme Tipi Hatası';
    }
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
    
    console.log(`🔍 Yeni sipariş kontrolü: ${orderId} (${order.type}) - Status: ${status}`);

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
}
