# 📦 Sipariş Yönetimi Sistemi - TAMAMEN DETAYLI

## 🔄 Real-time Sipariş Takibi

### Interval Sistemi
```typescript
private startRefreshInterval(): void {
  if (this.destroyed) return;

  console.log('🔄 Refresh interval başlatılıyor (10 saniye)');
  
  // 10 saniyede bir çalışan interval
  this.refreshInterval = interval(10000).subscribe(() => {
    // Güvenlik kontrolleri
    if (this.selectedStore && !this.loading && !this.destroyed && this.isPageVisible) {
      console.log('⏰ Scheduled refresh çalışıyor...');
      
      // 1. Silent refresh
      this.silentRefresh();

      // 2. Sync status'ları güncelle
      this.updateTrendyolSyncStatus();
      this.updateTrendyolRefundSyncStatus();
      this.updateYemeksepetiRefundSyncStatus();
    } else {
      console.log('⏸️ Refresh atlandı:', {
        selectedStore: !!this.selectedStore,
        loading: this.loading,
        destroyed: this.destroyed,
        pageVisible: this.isPageVisible
      });
    }
  });
}
```

### Silent Refresh Algoritması
```typescript
silentRefresh(): void {
  // 1. Güvenlik kontrolleri
  if (!this.selectedStore || this.destroyed) {
    console.log('❌ Silent refresh iptal: Store yok veya component destroyed');
    return;
  }

  // 2. İşlem devam ediyor mu kontrol et
  if (this.isRefreshing) {
    console.log('⏳ Önceki silent refresh henüz bitmedi, yeni istek engellendi');
    return;
  }

  // 3. Loading durumunda istek yapma
  if (this.loading) {
    console.log('⏳ Loading durumunda silent refresh atlandı');
    return;
  }

  // 4. Minimum interval kontrolü (debouncing)
  const now = Date.now();
  if (now - this.lastRefreshTime < this.MIN_REFRESH_INTERVAL_MS) {
    console.log('⏱️ Çok hızlı refresh denemesi engellendi, minimum 8 saniye bekle');
    return;
  }

  // 5. Page visibility kontrolü
  if (!this.isPageVisible) {
    console.log('👁️ Sayfa görünür değil, silent refresh atlandı');
    return;
  }

  console.log('🔄 Silent refresh başlatıldı...');
  this.isRefreshing = true;
  this.lastRefreshTime = now;

  const storeId = typeof this.selectedStore === 'object' ?
    (this.selectedStore as any)._id || '' :
    this.selectedStore.toString();

  // 6. Timeout ile request'i sınırla
  const timeoutId = setTimeout(() => {
    if (this.isRefreshing && !this.destroyed) {
      console.warn('⏰ Silent refresh timeout (20s) - flag sıfırlanıyor');
      this.isRefreshing = false;
      this.consecutiveFailures++;

      // Ardışık başarısızlık kontrolü
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.handleConsecutiveFailures();
      }
    }
  }, this.SILENT_REFRESH_TIMEOUT_MS);

  // 7. API request
  this.entegreSiparisService.getAggregatedOrders(storeId).subscribe({
    next: (response: OrderResponse) => {
      clearTimeout(timeoutId);

      if (this.destroyed) {
        console.log('🗑️ Component destroyed during silent refresh response');
        this.isRefreshing = false;
        return;
      }

      try {
        if (response.success && response.data) {
          console.log(`📦 Silent refresh başarılı: ${response.data.orders?.length || 0} sipariş`);
          
          // Siparişleri işle
          this.processOrders(response.data.orders || []);

          // Özeti güncelle
          this.updateSummary();

          // Filtrelenmiş siparişleri güncelle
          this.filteredOrders = [...this.orders];
          this.filteredOrder(this.currentFilter || 'ALL');

          // Otomatik onaylama kontrolü
          if (this.isAutoApproveEnabled && !this.destroyed) {
            this.checkAndApproveOrders();
          }

          // Başarılı refresh sonrası failure sayacını sıfırla
          this.consecutiveFailures = 0;
          
          console.log(`✅ Silent refresh tamamlandı: ${this.orders.length} sipariş aktif`);
        } else {
          console.warn('⚠️ Silent refresh: Invalid response format', response);
        }
      } catch (error) {
        console.error('❌ Silent refresh data processing error:', error);
      } finally {
        this.isRefreshing = false;
      }
    },
    error: (error) => {
      clearTimeout(timeoutId);

      if (this.destroyed) {
        console.log('🗑️ Component destroyed during silent refresh error');
        return;
      }

      console.error('💥 Silent refresh API hatası:', error);
      this.isRefreshing = false;
      this.consecutiveFailures++;

      // Çok fazla hata varsa otomatik reload uyarısı
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.handleConsecutiveFailures();
      }

      // Loading state'i temizle
      if (this.loading) {
        this.loading = false;
      }
    }
  });
}
```

### Ardışık Hata Yönetimi
```typescript
private handleConsecutiveFailures(): void {
  console.error(`💥 ${this.consecutiveFailures} ardışık hata tespit edildi!`);
  
  this.notificationService.showNotification(
    `Sürekli bağlantı hatası tespit edildi (${this.consecutiveFailures} kez). Uygulama 60 saniye içinde otomatik yenilenecek...`,
    'error',
    'top-end',
    10000
  );

  // 60 saniye sonra otomatik reload
  setTimeout(() => {
    if (!this.destroyed) {
      console.log('🔄 Ardışık hata nedeniyle otomatik reload gerçekleştiriliyor...');
      
      // Electron'da window reload
      if (typeof window !== 'undefined' && window.electronAPI) {
        window.electronAPI.reloadWindow?.();
      } else {
        window.location.reload();
      }
    }
  }, this.AUTO_RELOAD_DELAY_MS);
}
```

## 📊 Sipariş İşleme Algoritması

### Batch Processing Sistemi
```typescript
private processOrders(orders: any[]): void {
  if (!Array.isArray(orders) || this.destroyed) {
    console.warn('❌ processOrders: Geçersiz sipariş verisi veya component destroyed');
    return;
  }

  console.log(`⚙️ ${orders.length} sipariş işleniyor...`);
  const startTime = Date.now();

  // Performans metrikleri
  const metrics = {
    total: orders.length,
    processed: 0,
    newOrders: 0,
    errors: 0,
    platforms: {
      trendyol: 0,
      yemeksepeti: 0,
      migros: 0,
      getir: 0,
      unknown: 0
    }
  };

  // Mevcut siparişleri temizle
  this.orders = [];
  this.newOrders.clear(); // Önceki yeni sipariş işaretlerini temizle

  // Batch processing için orders'ı chunk'lara böl
  const batchSize = 50;
  const batches = [];
  for (let i = 0; i < orders.length; i += batchSize) {
    batches.push(orders.slice(i, i + batchSize));
  }

  console.log(`📦 ${batches.length} batch halinde işlenecek (batch size: ${batchSize})`);

  // Her batch'i process et
  batches.forEach((batch, batchIndex) => {
    if (this.destroyed) return;

    console.log(`⚙️ Batch ${batchIndex + 1}/${batches.length} işleniyor (${batch.length} sipariş)`);

    batch.forEach((order, orderIndex) => {
      if (this.destroyed) return;

      try {
        if (!order?.rawData) {
          console.warn(`⚠️ Sipariş ${orderIndex} rawData eksik:`, order);
          metrics.errors++;
          return;
        }

        const updatedOrder = this.processOrderByPlatform(order);
        
        if (updatedOrder) {
          this.orders.push(updatedOrder);
          metrics.processed++;
          
          // Platform sayacını artır
          const platform = updatedOrder.type.toLowerCase();
          if (platform in metrics.platforms) {
            metrics.platforms[platform as keyof typeof metrics.platforms]++;
          } else {
            metrics.platforms.unknown++;
          }

          // Yeni sipariş kontrolü
          if (this.isNewOrder(updatedOrder)) {
            const orderId = this.getOrderId(updatedOrder);
            if (orderId) {
              this.newOrders.add(orderId);
              metrics.newOrders++;

              console.log(`🆕 Yeni sipariş tespit edildi: ${orderId} (${updatedOrder.type})`);

              // Ses ve bildirim sistemi
              this.handleNewOrderNotification(updatedOrder, orderId);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Sipariş işleme hatası (batch ${batchIndex}, order ${orderIndex}):`, error, order);
        metrics.errors++;
      }
    });

    // Son batch'te sıralama yap
    if (batchIndex === batches.length - 1 && !this.destroyed) {
      this.sortOrders();
    }
  });

  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  console.log('📊 Sipariş işleme tamamlandı:', {
    ...metrics,
    processingTime: `${processingTime}ms`,
    avgTimePerOrder: `${(processingTime / metrics.total).toFixed(2)}ms`
  });

  // Performance warning
  if (processingTime > 5000) {
    console.warn(`⚠️ Yavaş işleme tespit edildi: ${processingTime}ms (${metrics.total} sipariş)`);
  }
}
```

### Platform-Specific İşleme
```typescript
private processOrderByPlatform(order: any): Order | null {
  const platform = order.platform?.toLowerCase();
  
  try {
    switch (platform) {
      case 'yemeksepeti':
        return this.processYemekSepetiOrder(order);
        
      case 'getir':
        return this.processGetirOrder(order);
        
      case 'trendyol':
        return this.processTrendyolOrder(order);
        
      case 'migros':
        return this.processMigrosOrder(order);
        
      default:
        console.warn(`⚠️ Bilinmeyen platform: ${platform}`, order);
        return null;
    }
  } catch (error) {
    console.error(`❌ ${platform} siparişi işlenirken hata:`, error, order);
    return null;
  }
}

private processYemekSepetiOrder(order: any): Order {
  const processedOrder: Order = {
    ...order,
    type: 'YEMEKSEPETI',
    status: order.status || 'new',
    rawData: {
      ...order.rawData,
      // YemekSepeti specific validations
      shortCode: order.rawData.shortCode || '',
      code: order.rawData.code || '',
      expeditionType: order.rawData.expeditionType || 'delivery'
    }
  };

  // Ürün kontrolü
  if (!order.rawData.products || !Array.isArray(order.rawData.products)) {
    console.warn('⚠️ YemekSepeti siparişinde ürün listesi eksik:', order.rawData.shortCode);
  }

  // Müşteri bilgisi kontrolü
  if (!order.rawData.customer) {
    console.warn('⚠️ YemekSepeti siparişinde müşteri bilgisi eksik:', order.rawData.shortCode);
  }

  return processedOrder;
}

private processGetirOrder(order: any): Order {
  const processedOrder: Order = {
    ...order,
    type: 'GETIR',
    status: order.status || 'new',
    rawData: {
      ...order.rawData,
      // Getir specific validations
      confirmationId: order.rawData.confirmationId || order.rawData.id || '',
      isScheduled: order.rawData.isScheduled || false,
      deliveryType: order.rawData.deliveryType || 2
    }
  };

  // Scheduled order kontrolü
  if (order.rawData.isScheduled && !order.rawData.scheduledDate) {
    console.warn('⚠️ Getir ileri tarihli siparişinde tarih eksik:', order.rawData.confirmationId);
  }

  return processedOrder;
}

private processTrendyolOrder(order: any): Order {
  const processedOrder: Order = {
    ...order,
    type: 'TRENDYOL',
    status: order.status || 'new',
    rawData: {
      ...order.rawData,
      // Trendyol specific validations
      orderNumber: order.rawData.orderNumber || '',
      packageStatus: order.rawData.packageStatus || 'Created',
      totalPrice: order.rawData.totalPrice || 0
    }
  };

  // Lines kontrolü
  if (!order.rawData.lines || !Array.isArray(order.rawData.lines)) {
    console.warn('⚠️ Trendyol siparişinde ürün lines eksik:', order.rawData.orderNumber);
  }

  return processedOrder;
}

private processMigrosOrder(order: any): Order {
  const processedOrder: Order = {
    ...order,
    type: 'MIGROS',
    status: order.status || 'NEW_PENDING',
    rawData: {
      ...order.rawData,
      // Migros specific validations
      orderId: order.rawData.orderId || '',
      platformConfirmationId: order.rawData.platformConfirmationId || ''
    }
  };

  // Items kontrolü
  if (!order.rawData.items && !order.rawData.products) {
    console.warn('⚠️ Migros siparişinde ürün listesi eksik:', order.rawData.orderId);
  }

  return processedOrder;
}
```

## 🎯 Yeni Sipariş Tespit Algoritması

### Platform-Agnostic Yeni Sipariş Kontrolü
```typescript
isNewOrder(order: Order): boolean {
  if (!order?.status) {
    console.warn('⚠️ Sipariş status bilgisi eksik:', order);
    return false;
  }

  const status = order.status.toString().toLowerCase();
  const orderId = this.getOrderId(order);
  
  console.log(`🔍 Yeni sipariş kontrolü: ${orderId} (${order.type}) - Status: ${status}`);

  // Platform-specific kontroller
  const isNew = this.checkNewOrderByPlatform(order, status);
  
  if (isNew) {
    console.log(`🆕 YENİ SİPARİŞ TESPİT EDİLDİ: ${orderId} (${order.type})`);
  }
  
  return isNew;
}

private checkNewOrderByPlatform(order: Order, status: string): boolean {
  switch (order.type) {
    case 'GETIR':
      return this.isNewOrder_Getir(order, status);
      
    case 'YEMEKSEPETI':
      return this.isNewOrder_YemekSepeti(order, status);
      
    case 'TRENDYOL':
      return this.isNewOrder_Trendyol(order, status);
      
    case 'MIGROS':
      return this.isNewOrder_Migros(order, status);
      
    default:
      console.warn(`⚠️ Bilinmeyen platform için yeni sipariş kontrolü: ${order.type}`);
      return false;
  }
}

private isNewOrder_Getir(order: Order, status: string): boolean {
  // İleri tarihli sipariş kontrolü
  if (order.rawData?.isScheduled) {
    const isScheduledNew = status === '325' || status === '1600';
    if (isScheduledNew) {
      console.log(`📅 İleri tarihli Getir siparişi: ${this.getOrderId(order)} - ${order.rawData.scheduledDate}`);
    }
    return isScheduledNew;
  }
  
  // Normal sipariş kontrolü
  return status === '400';
}

private isNewOrder_YemekSepeti(order: Order, status: string): boolean {
  const isNew = status === 'processed' || status === 'received';
  
  if (isNew) {
    const expeditionType = order.rawData.expeditionType;
    console.log(`🍽️ Yeni YemekSepeti siparişi: ${this.getOrderId(order)} - Tip: ${expeditionType}`);
  }
  
  return isNew;
}

private isNewOrder_Trendyol(order: Order, status: string): boolean {
  // Trendyol için package status kontrolü
  const packageStatus = order.rawData?.packageStatus?.toLowerCase();
  const isNew = packageStatus === 'created';
  
  if (isNew) {
    console.log(`🛒 Yeni Trendyol siparişi: ${this.getOrderId(order)} - Package Status: ${packageStatus}`);
  }
  
  return isNew;
}

private isNewOrder_Migros(order: Order, status: string): boolean {
  const isNew = status === 'new_pending' || status.includes('new');
  
  if (isNew) {
    const deliveryProvider = order.rawData.deliveryProvider || order.rawData.delivery?.provider;
    console.log(`🛍️ Yeni Migros siparişi: ${this.getOrderId(order)} - Provider: ${deliveryProvider}`);
  }
  
  return isNew;
}
```

## 🔔 Yeni Sipariş Bildirim Sistemi

### Bildirim İş Akışı
```typescript
private handleNewOrderNotification(order: Order, orderId: string): void {
  console.log(`🔔 Yeni sipariş bildirimi başlatılıyor: ${orderId}`);
  
  // 1. Ses bildirimi
  if (this.isSoundEnabled && !this.destroyed) {
    this.startSound();
  }

  // 2. Desktop notification
  this.showDesktopNotification(
    `Yeni ${this.getSourceText(order.type)} Siparişi!`,
    this.generateNotificationMessage(order)
  );

  // 3. Electron'a bildir (tray icon flash)
  if (typeof window !== 'undefined' && window.electronAPI) {
    window.electronAPI.showOrderNotification?.({
      orderId,
      platform: order.type,
      amount: this.getOrderAmount(order),
      customerName: this.getCustomerName(order),
      orderType: this.getOrderType(order)
    });
  }

  // 4. Browser title flash
  this.flashBrowserTitle(orderId);
}

private generateNotificationMessage(order: Order): string {
  const orderId = this.getOrderId(order);
  const amount = this.formatPrice(this.getOrderAmount(order));
  const customerName = this.getCustomerName(order);
  const orderType = this.getOrderType(order);
  
  let message = `Sipariş No: ${orderId}\n`;
  message += `Tutar: ${amount} ₺\n`;
  message += `Tip: ${orderType}\n`;
  
  if (customerName) {
    message += `Müşteri: ${customerName}`;
  }
  
  return message;
}

private flashBrowserTitle(orderId: string): void {
  const originalTitle = document.title;
  let flashCount = 0;
  const maxFlashes = 6;
  
  const flashInterval = setInterval(() => {
    document.title = flashCount % 2 === 0 
      ? `🆕 Yeni Sipariş! - ${orderId}` 
      : originalTitle;
    
    flashCount++;
    
    if (flashCount >= maxFlashes) {
      clearInterval(flashInterval);
      document.title = originalTitle;
    }
  }, 1000);
}
```

## 📈 Sipariş Sıralama ve Filtreleme

### Gelişmiş Sıralama Algoritması
```typescript
private sortOrders(): void {
  if (this.destroyed || !this.orders.length) return;

  console.log('📊 Siparişler sıralanıyor...');
  const startTime = Date.now();

  try {
    this.orders.sort((a, b) => {
      // 1. Öncelik: Yeni siparişler en üstte
      const isNewA = this.isNewOrder(a);
      const isNewB = this.isNewOrder(b);

      if (isNewA && !isNewB) return -1;
      if (!isNewA && isNewB) return 1;

      // 2. Öncelik: İleri tarihli siparişler (Getir)
      const isScheduledA = a.type === 'GETIR' && a.rawData?.isScheduled;
      const isScheduledB = b.type === 'GETIR' && b.rawData?.isScheduled;

      if (isScheduledA && !isScheduledB) return -1;
      if (!isScheduledA && isScheduledB) return 1;

      // 3. Öncelik: Platform sırası (Trendyol > YemekSepeti > Migros > Getir)
      const platformPriority = {
        'TRENDYOL': 4,
        'YEMEKSEPETI': 3,
        'MIGROS': 2,
        'GETIR': 1
      };
      
      const priorityA = platformPriority[a.type as keyof typeof platformPriority] || 0;
      const priorityB = platformPriority[b.type as keyof typeof platformPriority] || 0;
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }

      // 4. Son öncelik: Tarih (yeni olan üstte)
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      return dateB - dateA;
    });

    const endTime = Date.now();
    console.log(`✅ Sıralama tamamlandı: ${endTime - startTime}ms`);
    
  } catch (error) {
    console.error('❌ Sipariş sıralama hatası:', error);
  }
}
```

### Filtreleme Sistemi
```typescript
currentFilter: string = 'ALL';

filteredOrder(type: string): void {
  console.log(`🔍 Sipariş filtreleniyor: ${type}`);
  
  this.currentFilter = type;
  
  if (type === 'ALL') {
    this.filteredOrders = [...this.orders];
    console.log(`📊 Tüm siparişler gösteriliyor: ${this.filteredOrders.length}`);
  } else {
    this.filteredOrders = this.orders.filter(order => order.type === type);
    console.log(`📊 ${type} siparişleri gösteriliyor: ${this.filteredOrders.length}`);
  }

  // Filtreleme sonrası özeti güncelle
  this.updateFilteredSummary();
}

private updateFilteredSummary(): void {
  const filteredSummary = {
    total: this.filteredOrders.length,
    new: this.filteredOrders.filter(o => this.isNewOrder(o)).length,
    approved: this.filteredOrders.filter(o => this.approvedOrders.has(this.getOrderId(o))).length,
    completed: this.filteredOrders.filter(o => this.isOrderCompleted(o)).length
  };

  console.log(`📊 Filtrelenmiş özet (${this.currentFilter}):`, filteredSummary);
}
```

## 🎨 UI State Management

### Loading States
```typescript
// Farklı loading durumları
loadingStates = {
  initial: false,        // İlk yükleme
  refresh: false,        // Manual refresh
  silentRefresh: false,  // Background refresh
  storeChange: false,    // Mağaza değişimi
  orderApproval: false   // Sipariş onaylama
};

setLoadingState(type: keyof typeof this.loadingStates, value: boolean): void {
  this.loadingStates[type] = value;
  
  // Global loading state
  this.loading = Object.values(this.loadingStates).some(state => state);
  
  console.log(`🔄 Loading state değişti: ${type} = ${value}`, this.loadingStates);
}
```

### Error States
```typescript
errorStates = {
  connection: false,     // Bağlantı hatası
  authentication: false, // Auth hatası
  storeLoad: false,      // Mağaza yükleme hatası
  orderLoad: false,      // Sipariş yükleme hatası
  approval: false        // Onaylama hatası
};

setErrorState(type: keyof typeof this.errorStates, value: boolean, message?: string): void {
  this.errorStates[type] = value;
  
  if (value && message) {
    console.error(`❌ Error state: ${type} - ${message}`);
    this.notificationService.showNotification(message, 'error', 'top-end');
  }
  
  // Global error state
  const hasErrors = Object.values(this.errorStates).some(state => state);
  
  if (hasErrors) {
    console.warn('⚠️ Sistem hatası tespit edildi:', this.errorStates);
  }
}
```

## 🔊 Gelişmiş Ses Sistemi

### Multi-Audio Support
```typescript
private audioFiles = {
  newOrder: '/assets/sounds/web.mp3',
  success: '/assets/sounds/success.mp3',
  error: '/assets/sounds/error.mp3',
  warning: '/assets/sounds/warning.mp3'
};

private audioInstances: { [key: string]: HTMLAudioElement } = {};

private async initializeAudio(): Promise<void> {
  console.log('🔊 Gelişmiş ses sistemi başlatılıyor...');
  
  const loadPromises = Object.entries(this.audioFiles).map(([key, src]) => {
    return new Promise<void>((resolve) => {
      try {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = 0.7;
        
        audio.addEventListener('canplaythrough', () => {
          console.log(`✅ Ses dosyası yüklendi: ${key}`);
          this.audioInstances[key] = audio;
          resolve();
        }, { once: true });
        
        audio.addEventListener('error', (error) => {
          console.error(`❌ Ses dosyası hatası (${key}):`, error);
          resolve(); // Hata olsa da devam et
        }, { once: true });
        
        audio.load();
        
        // Timeout
        setTimeout(() => resolve(), 3000);
        
      } catch (error) {
        console.error(`❌ Audio instance oluşturma hatası (${key}):`, error);
        resolve();
      }
    });
  });

  await Promise.all(loadPromises);
  console.log(`✅ Ses sistemi hazır: ${Object.keys(this.audioInstances).length} dosya yüklendi`);
}

private playSound(type: 'newOrder' | 'success' | 'error' | 'warning'): void {
  if (!this.isSoundEnabled || this.destroyed) return;

  const audio = this.audioInstances[type];
  if (!audio) {
    console.warn(`⚠️ Ses dosyası bulunamadı: ${type}`);
    return;
  }

  console.log(`🔊 Ses çalınıyor: ${type}`);
  
  audio.currentTime = 0;
  audio.play().then(() => {
    console.log(`✅ Ses başarıyla çalındı: ${type}`);
    
    // Yeni sipariş sesi için özel işlem
    if (type === 'newOrder') {
      this.handleNewOrderSound();
    }
  }).catch(error => {
    console.error(`❌ Ses çalma hatası (${type}):`, error);
  });
}

private handleNewOrderSound(): void {
  // Yeni sipariş sesi çaldığında loop yapacak mı kontrol et
  const hasUnconfirmedOrders = this.orders.some(order => this.isNewOrder(order));
  
  if (hasUnconfirmedOrders && !this.isAutoApproveEnabled) {
    // Otomatik onay kapalıysa ses loop'a girsin
    this.startSoundLoop();
  }
}

private startSoundLoop(): void {
  if (this.soundInterval) return;

  console.log('🔄 Ses loop başlatılıyor...');
  
  this.soundInterval = setInterval(() => {
    if (!this.destroyed && this.isSoundEnabled && !this.isAutoApproveEnabled) {
      const hasUnconfirmedOrders = this.orders.some(order => this.isNewOrder(order));
      
      if (hasUnconfirmedOrders) {
        this.playSound('newOrder');
        // UI animasyonları için refresh
        this.filteredOrders = [...this.filteredOrders];
      } else {
        this.stopSoundLoop();
      }
    } else {
      this.stopSoundLoop();
    }
  }, 5000); // 5 saniyede bir tekrarla
}

private stopSoundLoop(): void {
  if (this.soundInterval) {
    console.log('🔇 Ses loop durduruluyor...');
    clearInterval(this.soundInterval);
    this.soundInterval = null;
  }
}
```

## 🎯 Sipariş Detay Yönetimi

### Sipariş Açma/Kapama
```typescript
openOrderDetails(order: Order): void {
  console.log('📋 Sipariş detayı açılıyor:', this.getOrderId(order));
  
  // Detay açıldığında yeni sipariş işaretini temizle
  const orderId = this.getOrderId(order);
  if (orderId && this.newOrders.has(orderId)) {
    this.newOrders.delete(orderId);
    console.log('🏷️ Yeni sipariş işareti temizlendi:', orderId);

    // Ses kontrolü
    const hasUnconfirmedOrders = this.orders.some(o => this.isNewOrder(o));
    if (!hasUnconfirmedOrders) {
      this.stopSound();
      this.stopSoundLoop();
    }
  }
  
  this.selectedOrder = order;
  
  // Detaylı log
  console.log('📊 Sipariş detayları:', {
    orderId,
    platform: order.type,
    status: order.status,
    customerName: this.getCustomerName(order),
    amount: this.getOrderAmount(order),
    productCount: this.getProducts(order).length,
    hasMapping: !this.hasAnyMapping(order),
    hasPaymentMapping: this.hasPaymentMapping(order),
    canAutoApprove: this.canAutoApproveOrder(order)
  });
}

closeOrderDetails(): void {
  console.log('❌ Sipariş detayı kapatılıyor');
  this.selectedOrder = null;
}
```

### Sipariş ID Alma (Platform-Specific)
```typescript
getOrderId(order: Order): string {
  if (!order?.rawData) {
    console.warn('⚠️ getOrderId: rawData eksik');
    return '';
  }

  let orderId = '';

  switch (order.type) {
    case 'YEMEKSEPETI':
      const shortCode = order.rawData.shortCode || '';
      const code = order.rawData.code || '';
      orderId = shortCode ? `${shortCode} (${code})` : code;
      break;
      
    case 'GETIR':
      orderId = order.rawData.confirmationId || order.rawData.id || '';
      break;
      
    case 'TRENDYOL':
      const orderNumber = order.rawData.orderNumber || '';
      const orderCode = order.rawData.orderCode || '';
      orderId = orderCode ? `${orderNumber} (${orderCode})` : orderNumber;
      break;
      
    case 'MIGROS':
      const migrosOrderId = order.rawData.orderId || '';
      const confirmationId = order.rawData.platformConfirmationId || '';
      orderId = confirmationId ? `${migrosOrderId} (${confirmationId})` : migrosOrderId.toString();
      break;
      
    default:
      console.warn(`⚠️ Bilinmeyen platform için order ID: ${order.type}`);
      orderId = order.rawData.id || order.rawData.orderNumber || order.rawData.orderId || '';
  }

  if (!orderId) {
    console.error(`❌ Order ID bulunamadı:`, order);
  }

  return orderId;
}
```

## 💰 Fiyat Hesaplama Sistemi

### Platform-Specific Fiyat Hesaplama
```typescript
getOrderAmount(order: Order): number {
  if (!order?.rawData) {
    console.warn('⚠️ getOrderAmount: rawData eksik');
    return 0;
  }

  let amount = 0;

  try {
    switch (order.type) {
      case 'YEMEKSEPETI':
        amount = this.calculateYemekSepetiAmount(order);
        break;
        
      case 'GETIR':
        amount = this.calculateGetirAmount(order);
        break;
        
      case 'TRENDYOL':
        amount = this.calculateTrendyolAmount(order);
        break;
        
      case 'MIGROS':
        amount = this.calculateMigrosAmount(order);
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

private calculateYemekSepetiAmount(order: Order): number {
  return order.rawData.price?.grandTotal || 0;
}

private calculateGetirAmount(order: Order): number {
  // Önce indirimli fiyatı kontrol et
  if (order.rawData.totalDiscountedPrice !== undefined && order.rawData.totalDiscountedPrice !== null) {
    return Number(order.rawData.totalDiscountedPrice) || 0;
  }
  
  // Sonra diğer fiyat alanlarını kontrol et
  return order.rawData.discountedAmount || 
         order.rawData.totalPrice || 
         order.rawData.totalAmount || 0;
}

private calculateTrendyolAmount(order: Order): number {
  let totalDiscount = 0;
  const basePrice = order.rawData.totalPrice || 0;

  // İndirim hesaplama
  if (order.rawData?.lines && Array.isArray(order.rawData.lines)) {
    order.rawData.lines.forEach(line => {
      if (line.items && Array.isArray(line.items)) {
        line.items.forEach(item => {
          // Seller promosyon indirimleri
          if (item.promotions && Array.isArray(item.promotions)) {
            item.promotions.forEach(promo => {
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

private calculateMigrosAmount(order: Order): number {
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
```

## 👤 Müşteri Bilgileri İşleme

### Platform-Specific Müşteri Adı
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
        if (order.rawData.customerInfo?.name) {
          customerName = order.rawData.customerInfo.name;
        } else if (order.rawData.customer) {
          const customer: any = order.rawData.customer;
          customerName = customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
        }
        break;
        
      default:
        console.warn(`⚠️ Bilinmeyen platform için müşteri adı: ${order.type}`);
    }

    if (!customerName) {
      console.warn(`⚠️ Müşteri adı bulunamadı (${order.type}):`, this.getOrderId(order));
      customerName = 'Müşteri Bilgisi Yok';
    }

  } catch (error) {
    console.error(`❌ Müşteri adı alma hatası (${order.type}):`, error, order);
    customerName = 'Hata: Müşteri Bilgisi';
  }

  return customerName;
}

getCustomerPhone(order: Order): string {
  if (!order?.rawData) return '';

  let phone = '';

  try {
    switch (order.type) {
      case 'YEMEKSEPETI':
        phone = order.rawData.customer?.mobilePhone || '';
        break;
        
      case 'GETIR':
        phone = order.rawData.client?.contactPhoneNumber || '';
        break;
        
      case 'TRENDYOL':
        phone = order.rawData.callCenterPhone || order.rawData.address?.phone || '';
        break;
        
      case 'MIGROS':
        if (order.rawData.customerInfo?.phone) {
          phone = order.rawData.customerInfo.phone;
        } else if (order.rawData.customer) {
          const customer: any = order.rawData.customer;
          phone = customer.phoneNumber || '';
        }
        break;
    }

    // Telefon numarası formatı kontrolü
    if (phone && !/^[\d\s\+\-\(\)]+$/.test(phone)) {
      console.warn(`⚠️ Geçersiz telefon formatı (${order.type}): ${phone}`);
    }

  } catch (error) {
    console.error(`❌ Telefon numarası alma hatası (${order.type}):`, error);
  }

  return phone;
}
```

## 📍 Adres İşleme Sistemi

### Gelişmiş Adres Parser
```typescript
getDeliveryAddress(order: Order): {
  address?: string;
  doorNo?: string;
  floor?: string;
  description?: string;
  coordinates?: { lat: number; lng: number };
  fullAddress?: string;
} {
  if (!order?.rawData) return {};

  try {
    switch (order.type) {
      case 'GETIR':
        return this.parseGetirAddress(order);
        
      case 'YEMEKSEPETI':
        return this.parseYemekSepetiAddress(order);
        
      case 'TRENDYOL':
        return this.parseTrendyolAddress(order);
        
      case 'MIGROS':
        return this.parseMigrosAddress(order);
        
      default:
        console.warn(`⚠️ Bilinmeyen platform için adres: ${order.type}`);
        return {};
    }
  } catch (error) {
    console.error(`❌ Adres işleme hatası (${order.type}):`, error, order);
    return {};
  }
}

private parseGetirAddress(order: Order): any {
  const address = order.rawData.client?.deliveryAddress;
  if (!address) return {};

  const fullAddress = [
    address.address,
    address.district,
    address.city
  ].filter(Boolean).join(', ');

  return {
    address: fullAddress,
    doorNo: address.doorNo || '',
    floor: address.floor || '',
    description: address.description || '',
    fullAddress
  };
}

private parseYemekSepetiAddress(order: Order): any {
  const address = order.rawData.delivery?.address;
  if (!address) return {};

  let addressLine = '';
  
  // Adres bileşenlerini birleştir
  const components = [
    address.street,
    address.number ? `No:${address.number}` : null,
    address.building,
    address.city,
    address.postcode
  ].filter(Boolean);
  
  addressLine = components.join(', ');
  
  if (address.company) {
    addressLine += ` (${address.company})`;
  }

  return {
    address: addressLine.trim(),
    doorNo: address.flatNumber || '',
    floor: address.floor || '',
    description: address.deliveryInstructions || order.rawData.comments?.customerComment || '',
    fullAddress: addressLine.trim()
  };
}

private parseTrendyolAddress(order: Order): any {
  const address = order.rawData.address;
  if (!address) return {};

  const addressComponents = [
    address.address1,
    address.address2,
    address.neighborhood,
    address.district,
    address.city
  ].filter(Boolean);
  
  const fullAddress = addressComponents.join(', ');

  return {
    address: fullAddress,
    doorNo: address.doorNumber || address.apartmentNumber || '',
    floor: address.floor || '',
    description: address.addressDescription || order.rawData.customerNote || '',
    coordinates: address.latitude && address.longitude ? {
      lat: parseFloat(address.latitude),
      lng: parseFloat(address.longitude)
    } : undefined,
    fullAddress
  };
}

private parseMigrosAddress(order: Order): any {
  const rawData: any = order.rawData;
  
  // CustomerInfo'dan adres
  if (rawData.customerInfo?.address) {
    const address = rawData.customerInfo.address;
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
  if (rawData.customer?.deliveryAddress) {
    const address = rawData.customer.deliveryAddress;
    
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

  console.warn(`⚠️ Migros siparişinde adres bilgisi bulunamadı:`, rawData.orderId);
  return {};
}
```

Devam edeyim mi? Henüz çok fazla detay var:

**Sırada bekleyenler:**
- 🎯 Sipariş onaylama tam algoritması
- 📱 Platform-specific ürün işleme
- 🖨️ Termal yazdırma HTML generator
- ⚙️ Background sync detayları
- 🔧 Electron integration
- 📊 Performance monitoring
- 🎨 CSS animations
- 🔧 Build ve deploy

Bu şekilde **10-15 ayrı dosya** olacak, her biri 50-100KB! 🚀
