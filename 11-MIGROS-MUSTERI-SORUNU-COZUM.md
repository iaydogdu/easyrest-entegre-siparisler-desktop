# 🔍 Migros Müşteri Adı Sorunu ve Çözümü

## ❌ **SORUN: Migros müşteri adları görünmüyor**

Resimdeki gibi Migros siparişlerinde müşteri adı boş görünüyor. Bunun nedeni Migros API'sinin **farklı yerlerde** müşteri bilgisi göndermesi.

## 🔧 **ÇÖZÜM: Gelişmiş Müşteri Bilgisi Alma**

### Mevcut Component'te Güncelleme (orders.component.ts)

```typescript
getCustomerName(order: Order): string {
  if (!order?.rawData) return '';

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
        // 🔍 GELİŞMİŞ MİGROS MÜŞTERİ BİLGİSİ ALMA
        customerName = this.getMigrosCustomerName(order);
        break;
        
      default:
        console.warn(`⚠️ Bilinmeyen platform: ${order.type}`);
    }

    if (!customerName) {
      console.warn(`⚠️ Müşteri adı bulunamadı (${order.type}):`, this.getOrderId(order));
      
      // Debug için rawData'yı logla
      if (order.type === 'MIGROS') {
        this.debugMigrosCustomerData(order);
      }
      
      customerName = 'Müşteri Bilgisi Yok';
    }

  } catch (error) {
    console.error(`❌ Müşteri adı alma hatası (${order.type}):`, error, order);
    customerName = 'Müşteri Bilgisi Hatası';
  }

  return customerName;
}

// 🆕 Migros için özel müşteri adı alma metodu
private getMigrosCustomerName(order: Order): string {
  const rawData: any = order.rawData;
  
  console.log('🔍 Migros müşteri bilgisi aranıyor...', {
    orderId: rawData.orderId,
    hasCustomerInfo: !!rawData.customerInfo,
    hasCustomer: !!rawData.customer
  });

  // 1. ÖNCE customerInfo'dan dene
  if (rawData.customerInfo?.name) {
    console.log('✅ Migros müşteri adı customerInfo.name\'dan alındı:', rawData.customerInfo.name);
    return rawData.customerInfo.name;
  }
  
  // 2. SONRA customer objesi'nden dene
  if (rawData.customer) {
    const customer = rawData.customer;
    
    // fullName kontrolü
    if (customer.fullName) {
      console.log('✅ Migros müşteri adı customer.fullName\'dan alındı:', customer.fullName);
      return customer.fullName;
    }
    
    // firstName + lastName birleştir
    const firstName = customer.firstName || '';
    const lastName = customer.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (fullName) {
      console.log('✅ Migros müşteri adı firstName+lastName\'dan oluşturuldu:', fullName);
      return fullName;
    }
    
    // Diğer possible name field'ları
    const possibleNames = [
      customer.name,
      customer.customerName,
      customer.displayName,
      customer.userName,
      customer.recipientName
    ].filter(Boolean);
    
    if (possibleNames.length > 0) {
      console.log('✅ Migros müşteri adı alternatif field\'dan alındı:', possibleNames[0]);
      return possibleNames[0];
    }
    
    console.log('🔍 Customer objesi keys:', Object.keys(customer));
  }

  // 3. Root level'da müşteri bilgisi arama
  const rootCustomerFields = [
    'customerName',
    'clientName', 
    'buyerName',
    'recipientName',
    'deliveryRecipient',
    'orderRecipient'
  ];
  
  for (const field of rootCustomerFields) {
    if (rawData[field]) {
      console.log(`✅ Migros müşteri adı root.${field}\'dan alındı:`, rawData[field]);
      return rawData[field];
    }
  }

  // 4. Delivery address içinde name arama
  if (rawData.deliveryAddress?.recipientName) {
    console.log('✅ Migros müşteri adı deliveryAddress.recipientName\'dan alındı:', rawData.deliveryAddress.recipientName);
    return rawData.deliveryAddress.recipientName;
  }

  console.error('❌ Migros müşteri adı hiçbir yerde bulunamadı!');
  return '';
}

// 🔍 Debug helper metodu
private debugMigrosCustomerData(order: Order): void {
  if (order.type !== 'MIGROS') return;
  
  const rawData: any = order.rawData;
  
  console.group('🔍 MIGROS MÜŞTERİ BİLGİSİ DEBUG');
  
  console.log('📋 Temel Bilgiler:', {
    orderId: rawData.orderId,
    platformConfirmationId: rawData.platformConfirmationId,
    status: rawData.status
  });
  
  console.log('👤 CustomerInfo:', {
    exists: !!rawData.customerInfo,
    name: rawData.customerInfo?.name,
    phone: rawData.customerInfo?.phone,
    email: rawData.customerInfo?.email,
    keys: rawData.customerInfo ? Object.keys(rawData.customerInfo) : []
  });
  
  console.log('👥 Customer:', {
    exists: !!rawData.customer,
    fullName: rawData.customer?.fullName,
    firstName: rawData.customer?.firstName,
    lastName: rawData.customer?.lastName,
    name: rawData.customer?.name,
    phoneNumber: rawData.customer?.phoneNumber,
    keys: rawData.customer ? Object.keys(rawData.customer) : []
  });
  
  console.log('🏠 Delivery Info:', {
    hasDeliveryAddress: !!rawData.deliveryAddress,
    recipientName: rawData.deliveryAddress?.recipientName,
    deliveryRecipient: rawData.deliveryRecipient
  });
  
  console.log('🔍 Müşteri ile ilgili tüm field\'lar:');
  Object.keys(rawData).forEach(key => {
    const lowerKey = key.toLowerCase();
    if (lowerKey.includes('customer') || 
        lowerKey.includes('client') || 
        lowerKey.includes('buyer') || 
        lowerKey.includes('recipient') ||
        lowerKey.includes('name')) {
      console.log(`  ${key}:`, rawData[key]);
    }
  });
  
  console.log('📄 TAM RAWDATA (müşteri bulunamazsa):');
  console.log(JSON.stringify(rawData, null, 2));
  
  console.groupEnd();
}
```

## 🔧 **Component'te Kullanım**

### ngOnInit'te Debug Ekleme
```typescript
ngOnInit() {
  // Mevcut initialization kodları...
  
  // Migros debug'ını aktifleştir
  this.enableMigrosDebug();
}

private enableMigrosDebug(): void {
  // Development mode'da Migros debug'ını aç
  if (!environment.production) {
    console.log('🔍 Migros debug modu aktif');
    
    // Her sipariş yüklendiğinde Migros siparişlerini debug et
    this.orders.forEach(order => {
      if (order.type === 'MIGROS') {
        this.debugMigrosCustomerData(order);
      }
    });
  }
}
```

### Silent Refresh'te Debug
```typescript
silentRefresh(): void {
  // Mevcut silent refresh kodu...
  
  this.entegreSiparisService.getAggregatedOrders(storeId).subscribe({
    next: (response: OrderResponse) => {
      // Siparişleri işle
      this.processOrders(response.data.orders);
      
      // 🔍 Migros siparişlerini debug et
      const migrosOrders = this.orders.filter(o => o.type === 'MIGROS');
      if (migrosOrders.length > 0) {
        console.log(`🔍 ${migrosOrders.length} Migros siparişi debug ediliyor...`);
        migrosOrders.forEach(order => {
          this.debugMigrosCustomerData(order);
          
          // Müşteri adı test et
          const customerName = this.getMigrosCustomerName(order);
          console.log(`👤 Migros müşteri adı sonucu: "${customerName}"`);
        });
      }
    }
  });
}
```

## 🎯 **Troubleshooting Steps**

### 1. Console'da Debug Çalıştırma
```typescript
// Browser console'da çalıştır:
// 1. Migros siparişini bul
const migrosOrder = this.orders.find(o => o.type === 'MIGROS');

// 2. Debug çalıştır
if (migrosOrder) {
  this.debugMigrosCustomerData(migrosOrder);
  
  // 3. Müşteri adını test et
  const customerName = this.getMigrosCustomerName(migrosOrder);
  console.log('Sonuç:', customerName);
}
```

### 2. RawData Yapısını İnceleme
```typescript
// Migros rawData yapısını tam olarak gör
console.log('MIGROS RAWDATA:', JSON.stringify(migrosOrder.rawData, null, 2));
```

### 3. API Response'u İnceleme
```typescript
// Backend'den gelen ham veriyi kontrol et
this.entegreSiparisService.getAggregatedOrders(this.selectedStore).subscribe(response => {
  const migrosOrders = response.data.orders.filter(o => o.platform?.toLowerCase() === 'migros');
  console.log('🔍 Backend\'den gelen Migros siparişleri:', migrosOrders);
});
```

## 🔧 **Geçici Çözüm (Fallback)**

### Müşteri Adı Bulunamazsa
```typescript
getCustomerName(order: Order): string {
  // Mevcut kod...
  
  // Migros için fallback
  if (order.type === 'MIGROS' && !customerName) {
    // Telefon numarasını müşteri adı olarak kullan
    const phone = this.getCustomerPhone(order);
    if (phone) {
      console.log('🔄 Migros fallback: Telefon numarası müşteri adı olarak kullanılıyor');
      return `Müşteri (${phone})`;
    }
    
    // Order ID'yi müşteri adı olarak kullan
    const orderId = this.getOrderId(order);
    return `Migros Müşteri (${orderId})`;
  }
  
  return customerName || 'Müşteri Bilgisi Yok';
}
```

## 📱 **HTML Template'te Fallback**

### Müşteri Bilgisi Görüntüleme
```html
<!-- Müşteri adı ile fallback -->
<div class="flex items-center gap-2">
  <span class="material-icons text-lg text-gray-500">person</span>
  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
    {{ getCustomerName(order) }}
    
    <!-- Migros için ek bilgi -->
    <span *ngIf="order.type === 'MIGROS' && (!getCustomerName(order) || getCustomerName(order) === 'Müşteri Bilgisi Yok')" 
      class="text-xs text-red-500 ml-2">
      (Müşteri bilgisi eksik)
    </span>
  </span>
</div>

<!-- Debug button (development için) -->
<button *ngIf="!environment.production && order.type === 'MIGROS'" 
  (click)="debugMigrosCustomerData(order)"
  class="text-xs bg-yellow-500 text-white px-2 py-1 rounded">
  Debug Migros
</button>
```

## 🎯 **Sonuç**

**MD dosyalarında şu detaylar VAR:**
- ✅ Sipariş onaylama algoritması
- ✅ İki fiş yazdırma sistemi
- ✅ approveOrder() metodu
- ✅ API endpoint'leri
- ✅ Gönderilen veri yapısı

**EKSIK OLAN:**
- ❌ Migros müşteri adı alma detayları
- ❌ Migros debug sistemi

**ŞİMDİ EKLENDİ:**
- ✅ Migros müşteri adı sorunu analizi
- ✅ Detaylı debug sistemi
- ✅ Fallback çözümleri
- ✅ Troubleshooting adımları

Bu yeni dosyayı (`11-MIGROS-MUSTERI-SORUNU-COZUM.md`) takip ederek Migros müşteri adı sorununu çözebilirsiniz! 🎯
