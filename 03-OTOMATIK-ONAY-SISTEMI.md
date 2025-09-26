# ⚡ Otomatik Onay Sistemi - TAMAMEN DETAYLI

## 🎯 Otomatik Onay Algoritması

### Ana Kontrol Sistemi
```typescript
private checkAndApproveOrders(): void {
  if (this.destroyed) {
    console.log('🗑️ Component destroyed, otomatik onay atlanıyor');
    return;
  }

  if (!this.orders || this.orders.length === 0) {
    console.log('📭 Onaylanacak sipariş bulunamadı');
    this.isRefreshing = false;
    return;
  }

  if (!this.isAutoApproveEnabled) {
    console.log('🔇 Otomatik onay kapalı');
    this.isRefreshing = false;
    return;
  }

  console.log('🤖 Otomatik onaylama kontrolleri başlatılıyor...');
  console.log(`📊 Toplam sipariş: ${this.orders.length}, Yeni: ${this.orders.filter(o => this.isNewOrder(o)).length}`);
  
  // Performans metrikleri
  const metrics = {
    totalOrders: this.orders.length,
    eligibleOrders: 0,
    pendingApprovals: 0,
    completedApprovals: 0,
    failedApprovals: 0,
    skippedOrders: 0,
    reasons: {
      alreadyApproved: 0,
      noMapping: 0,
      noPaymentMapping: 0,
      wrongStatus: 0,
      maxLimitReached: 0
    }
  };

  const startTime = Date.now();

  this.orders.forEach((order, index) => {
    if (this.destroyed || metrics.pendingApprovals >= this.MAX_AUTO_APPROVALS_PER_CYCLE) {
      if (metrics.pendingApprovals >= this.MAX_AUTO_APPROVALS_PER_CYCLE) {
        metrics.reasons.maxLimitReached++;
      }
      return;
    }

    const orderId = this.getOrderId(order);
    console.log(`🔍 Sipariş kontrol ediliyor [${index + 1}/${this.orders.length}]: ${orderId}`);

    // Zaten onaylanmış mı?
    if (this.approvedOrders.has(orderId)) {
      console.log(`⏭️ Zaten onaylanmış: ${orderId}`);
      metrics.reasons.alreadyApproved++;
      metrics.skippedOrders++;
      return;
    }

    // Onaylama koşullarını kontrol et
    const approvalCheck = this.performApprovalChecks(order);
    
    if (approvalCheck.canApprove) {
      metrics.eligibleOrders++;
      metrics.pendingApprovals++;
      
      console.log(`✅ Sipariş onaylanabilir: ${orderId}`, approvalCheck.details);
      
      // Siparişi onayla
      this.performAutoApproval(order, metrics).then(() => {
        metrics.completedApprovals++;
        this.checkAutoApprovalCompletion(metrics, startTime);
      }).catch(error => {
        metrics.failedApprovals++;
        console.error(`❌ Otomatik onay hatası: ${orderId}`, error);
        this.checkAutoApprovalCompletion(metrics, startTime);
      });
    } else {
      console.log(`❌ Sipariş onaylanamaz: ${orderId} - ${approvalCheck.reason}`);
      metrics.skippedOrders++;
      
      // Reason tracking
      if (approvalCheck.reason.includes('eşleştirme')) {
        metrics.reasons.noMapping++;
      } else if (approvalCheck.reason.includes('ödeme')) {
        metrics.reasons.noPaymentMapping++;
      } else if (approvalCheck.reason.includes('durum')) {
        metrics.reasons.wrongStatus++;
      }
    }
  });

  // Sonuç raporu
  if (metrics.pendingApprovals === 0) {
    console.log('ℹ️ Otomatik onaylanacak sipariş bulunamadı');
    console.log('📊 Skip nedenleri:', metrics.reasons);
    this.isRefreshing = false;
  } else {
    console.log(`🤖 ${metrics.pendingApprovals} sipariş otomatik onaylanmak üzere işleme alındı`);
  }
}
```

### Onaylama Koşulları Kontrol Sistemi
```typescript
private performApprovalChecks(order: Order): {
  canApprove: boolean;
  reason: string;
  details: any;
} {
  const orderId = this.getOrderId(order);
  
  // 1. Temel kontroller
  if (!order) {
    return { canApprove: false, reason: 'Sipariş objesi null', details: {} };
  }

  // 2. Eşleştirme kontrolü
  if (this.hasAnyMapping(order)) {
    const mappingDetails = this.getMappingDetails(order);
    return { 
      canApprove: false, 
      reason: 'Ürün eşleştirme eksikliği var', 
      details: { mappingDetails } 
    };
  }

  // 3. Ödeme eşleştirmesi kontrolü
  if (!this.hasPaymentMapping(order)) {
    return { 
      canApprove: false, 
      reason: 'Ödeme eşleştirmesi yok', 
      details: { paymentType: this.getPaymentType(order) } 
    };
  }

  // 4. Zaten onaylanmış mı?
  const currentStatus = order?.status?.toString().toLowerCase();
  if (['accepted', '200', 'approved', 'picking', 'preparing'].includes(currentStatus)) {
    return { 
      canApprove: false, 
      reason: 'Sipariş zaten onaylanmış', 
      details: { currentStatus } 
    };
  }

  // 5. Platform-specific durum kontrolü
  const platformCheck = this.checkPlatformSpecificApproval(order);
  
  if (!platformCheck.canApprove) {
    return { 
      canApprove: false, 
      reason: `Platform durum kontrolü başarısız: ${platformCheck.reason}`, 
      details: platformCheck.details 
    };
  }

  // 6. Son kontroller
  const finalChecks = this.performFinalApprovalChecks(order);
  
  return {
    canApprove: finalChecks.canApprove,
    reason: finalChecks.reason,
    details: {
      orderId,
      platform: order.type,
      status: currentStatus,
      amount: this.getOrderAmount(order),
      customerName: this.getCustomerName(order),
      productCount: this.getProducts(order).length,
      ...platformCheck.details,
      ...finalChecks.details
    }
  };
}

private checkPlatformSpecificApproval(order: Order): {
  canApprove: boolean;
  reason: string;
  details: any;
} {
  const status = order?.status?.toString().toLowerCase();
  
  switch (order.type) {
    case 'YEMEKSEPETI':
      const canApproveYS = ['processed', 'received'].includes(status);
      return {
        canApprove: canApproveYS,
        reason: canApproveYS ? 'YemekSepeti onay koşulları sağlandı' : `YemekSepeti durum uygun değil: ${status}`,
        details: { 
          expectedStatuses: ['processed', 'received'],
          currentStatus: status,
          expeditionType: order.rawData?.expeditionType
        }
      };

    case 'GETIR':
      const isScheduled = order.rawData?.isScheduled;
      let canApproveGetir = false;
      let reason = '';
      
      if (isScheduled) {
        canApproveGetir = ['325', '1600'].includes(status);
        reason = canApproveGetir ? 
          'Getir ileri tarihli sipariş onay koşulları sağlandı' : 
          `Getir ileri tarihli durum uygun değil: ${status}`;
      } else {
        canApproveGetir = status === '400';
        reason = canApproveGetir ? 
          'Getir normal sipariş onay koşulları sağlandı' : 
          `Getir normal durum uygun değil: ${status}`;
      }
      
      return {
        canApprove: canApproveGetir,
        reason,
        details: {
          isScheduled,
          expectedStatuses: isScheduled ? ['325', '1600'] : ['400'],
          currentStatus: status,
          scheduledDate: order.rawData?.scheduledDate,
          deliveryType: order.rawData?.deliveryType
        }
      };

    case 'TRENDYOL':
      const packageStatus = order.rawData?.packageStatus?.toLowerCase();
      const canApproveTY = packageStatus === 'created';
      
      return {
        canApprove: canApproveTY,
        reason: canApproveTY ? 
          'Trendyol onay koşulları sağlandı' : 
          `Trendyol package status uygun değil: ${packageStatus}`,
        details: {
          packageStatus,
          expectedPackageStatus: 'created',
          orderStatus: status,
          deliveryType: order.rawData?.deliveryType
        }
      };

    case 'MIGROS':
      const canApproveMigros = status === 'new_pending' || status.includes('new');
      
      return {
        canApprove: canApproveMigros,
        reason: canApproveMigros ? 
          'Migros onay koşulları sağlandı' : 
          `Migros durum uygun değil: ${status}`,
        details: {
          expectedStatuses: ['new_pending', 'new'],
          currentStatus: status,
          deliveryProvider: order.rawData?.deliveryProvider
        }
      };

    default:
      return {
        canApprove: false,
        reason: `Bilinmeyen platform: ${order.type}`,
        details: { platform: order.type }
      };
  }
}

private performFinalApprovalChecks(order: Order): {
  canApprove: boolean;
  reason: string;
  details: any;
} {
  // 1. Ürün sayısı kontrolü
  const products = this.getProducts(order);
  if (products.length === 0) {
    return {
      canApprove: false,
      reason: 'Sipariş ürün içermiyor',
      details: { productCount: 0 }
    };
  }

  // 2. Fiyat kontrolü
  const amount = this.getOrderAmount(order);
  if (amount <= 0) {
    return {
      canApprove: false,
      reason: 'Sipariş tutarı geçersiz',
      details: { amount }
    };
  }

  // 3. Müşteri bilgisi kontrolü
  const customerName = this.getCustomerName(order);
  if (!customerName || customerName === 'Müşteri Bilgisi Yok') {
    console.warn(`⚠️ Müşteri bilgisi eksik ama onaylanabilir: ${this.getOrderId(order)}`);
  }

  return {
    canApprove: true,
    reason: 'Tüm kontroller başarılı',
    details: {
      productCount: products.length,
      amount,
      customerName: customerName || 'Bilinmiyor'
    }
  };
}
```

### Eşleştirme Kontrolü
```typescript
hasAnyMapping(order: Order | null): boolean {
  if (!order) return true; // Sipariş yoksa mapping var sayalım

  const products = this.getProducts(order);
  const mappingCheck = {
    totalProducts: products.length,
    unmappedProducts: 0,
    unmappedItems: [] as string[]
  };

  console.log(`🔍 Eşleştirme kontrolü başlatılıyor: ${this.getOrderId(order)} (${products.length} ürün)`);

  for (const product of products) {
    const productName = this.getProductName(product);
    
    // Ana ürün eşleştirmesi
    const hasMainMapping = this.checkMainProductMapping(order, product);
    
    if (!hasMainMapping) {
      mappingCheck.unmappedProducts++;
      mappingCheck.unmappedItems.push(`Ana ürün: ${productName}`);
      console.log(`❌ Ana ürün eşleştirmesi eksik: ${productName}`);
    }

    // Platform-specific sub-item kontrolleri
    const subItemCheck = this.checkSubItemMappings(order, product, productName);
    mappingCheck.unmappedProducts += subItemCheck.unmappedCount;
    mappingCheck.unmappedItems.push(...subItemCheck.unmappedItems);
  }

  const hasAnyMissing = mappingCheck.unmappedProducts > 0;
  
  console.log(`📊 Eşleştirme kontrolü sonucu:`, {
    orderId: this.getOrderId(order),
    totalProducts: mappingCheck.totalProducts,
    unmappedCount: mappingCheck.unmappedProducts,
    hasAnyMissing,
    unmappedItems: mappingCheck.unmappedItems
  });

  return hasAnyMissing;
}

private checkMainProductMapping(order: Order, product: any): boolean {
  if (order.type === 'TRENDYOL') {
    return !!product.mapping?.eslestirilenUrun;
  } else {
    return !!product.mapping?.localProduct;
  }
}

private checkSubItemMappings(order: Order, product: any, productName: string): {
  unmappedCount: number;
  unmappedItems: string[];
} {
  const result = {
    unmappedCount: 0,
    unmappedItems: [] as string[]
  };

  switch (order.type) {
    case 'TRENDYOL':
      return this.checkTrendyolSubMappings(product, productName);
      
    case 'GETIR':
      return this.checkGetirSubMappings(product, productName);
      
    case 'YEMEKSEPETI':
      return this.checkYemekSepetiSubMappings(product, productName);
      
    case 'MIGROS':
      return this.checkMigrosSubMappings(product, productName);
      
    default:
      return result;
  }
}

private checkTrendyolSubMappings(product: any, productName: string): {
  unmappedCount: number;
  unmappedItems: string[];
} {
  const result = { unmappedCount: 0, unmappedItems: [] as string[] };

  // Modifier products kontrolü
  if (product.modifierProducts && Array.isArray(product.modifierProducts)) {
    product.modifierProducts.forEach((modifier: any) => {
      if (!modifier.mapping?.eslestirilenUrun) {
        result.unmappedCount++;
        result.unmappedItems.push(`${productName} > Modifier: ${modifier.name}`);
      }

      // Alt modifier kontrolü
      if (modifier.modifierProducts && Array.isArray(modifier.modifierProducts)) {
        modifier.modifierProducts.forEach((subModifier: any) => {
          if (!subModifier.mapping?.eslestirilenUrun) {
            result.unmappedCount++;
            result.unmappedItems.push(`${productName} > ${modifier.name} > ${subModifier.name}`);
          }
        });
      }
    });
  }

  return result;
}

private checkGetirSubMappings(product: any, productName: string): {
  unmappedCount: number;
  unmappedItems: string[];
} {
  const result = { unmappedCount: 0, unmappedItems: [] as string[] };

  if (product.options && Array.isArray(product.options)) {
    product.options.forEach((category: any) => {
      if (category.options && Array.isArray(category.options)) {
        category.options.forEach((option: any) => {
          if (!option.mapping?.localProduct) {
            result.unmappedCount++;
            result.unmappedItems.push(`${productName} > ${category.name?.tr || category.name?.en} > ${option.name?.tr || option.name?.en}`);
          }

          // Alt kategori kontrolü
          if (option.optionCategories && Array.isArray(option.optionCategories)) {
            option.optionCategories.forEach((subCategory: any) => {
              if (subCategory.options && Array.isArray(subCategory.options)) {
                subCategory.options.forEach((subOption: any) => {
                  if (!subOption.mapping?.localProduct) {
                    result.unmappedCount++;
                    result.unmappedItems.push(`${productName} > ${option.name?.tr} > ${subCategory.name?.tr} > ${subOption.name?.tr}`);
                  }
                });
              }
            });
          }
        });
      }
    });
  }

  return result;
}

private checkYemekSepetiSubMappings(product: any, productName: string): {
  unmappedCount: number;
  unmappedItems: string[];
} {
  const result = { unmappedCount: 0, unmappedItems: [] as string[] };

  if (product.selectedToppings && Array.isArray(product.selectedToppings)) {
    product.selectedToppings.forEach((topping: any) => {
      if (!topping.mapping?.localProduct) {
        result.unmappedCount++;
        result.unmappedItems.push(`${productName} > Topping: ${topping.name}`);
      }

      // Children kontrolü
      if (topping.children && Array.isArray(topping.children)) {
        topping.children.forEach((child: any) => {
          if (!child.mapping?.localProduct) {
            result.unmappedCount++;
            result.unmappedItems.push(`${productName} > ${topping.name} > ${child.name}`);
          }
        });
      }
    });
  }

  return result;
}

private checkMigrosSubMappings(product: any, productName: string): {
  unmappedCount: number;
  unmappedItems: string[];
} {
  const result = { unmappedCount: 0, unmappedItems: [] as string[] };

  if (product.options && Array.isArray(product.options)) {
    product.options.forEach((option: any) => {
      if (!option.mapping?.localProduct) {
        result.unmappedCount++;
        result.unmappedItems.push(`${productName} > Option: ${option.itemNames}`);
      }

      // SubOptions kontrolü
      if (option.subOptions && Array.isArray(option.subOptions)) {
        option.subOptions.forEach((subOption: any) => {
          if (!subOption.mapping?.localProduct) {
            result.unmappedCount++;
            result.unmappedItems.push(`${productName} > ${option.headerName} > ${subOption.itemNames}`);
          }
        });
      }
    });
  }

  return result;
}
```

### Ödeme Eşleştirme Kontrolü
```typescript
hasPaymentMapping(order: Order | null): boolean {
  if (!order?.rawData) return false;

  const paymentMapping = order.rawData.payment?.mapping?.localPaymentType;
  const hasMapping = !!paymentMapping;
  
  console.log(`💳 Ödeme eşleştirme kontrolü: ${this.getOrderId(order)}`, {
    hasMapping,
    paymentType: this.getPaymentType(order),
    mappingName: paymentMapping?.odemeAdi || 'Yok'
  });

  return hasMapping;
}

getPaymentMappingName(order: Order | null): string {
  if (!order?.rawData) return '';
  
  const mappingName = order.rawData.payment?.mapping?.localPaymentType?.odemeAdi || '';
  
  if (!mappingName) {
    console.warn(`⚠️ Ödeme eşleştirme adı bulunamadı: ${this.getOrderId(order)}`);
  }
  
  return mappingName;
}
```

## 🚀 Sipariş Onaylama İşlemi

### Ana Onaylama Metodu
```typescript
approveOrder(order: Order): Promise<void> {
  return new Promise((resolve) => {
    if (!order) {
      console.error('❌ approveOrder: Sipariş null');
      resolve();
      return;
    }

    const orderId = this.getOrderId(order);
    console.log(`🚀 Sipariş onaylama başlatılıyor: ${orderId}`);

    // Zaten onaylanmış mı kontrol et
    if (this.approvedOrders.has(orderId)) {
      console.log('⚠️ Bu sipariş zaten onaylanmış:', orderId);
      resolve();
      return;
    }

    // Performance tracking
    const startTime = Date.now();

    try {
      // 1. Yerel sipariş verisini hazırla
      console.log('📦 Yerel sipariş verisi hazırlanıyor...');
      const localOrderData = this.prepareLocalOrder(order);
      
      // 2. Onay verisini oluştur
      const approvalData = this.createApprovalData(order, localOrderData);
      
      console.log('📤 Onay verisi hazırlandı:', {
        orderId,
        platform: approvalData.platform,
        productCount: localOrderData.urunler?.length || 0,
        totalAmount: localOrderData.toplamVergiliFiyat || 0
      });

      // 3. API'ye gönder
      this.entegreSiparisService.approveOrder(approvalData).subscribe({
        next: (response: any) => {
          const endTime = Date.now();
          console.log(`✅ Sipariş onaylandı: ${orderId} (${endTime - startTime}ms)`, response);

          // 4. Başarılı işlem sonrası
          this.handleSuccessfulApproval(order, orderId, response);
          resolve();
        },
        error: (error) => {
          const endTime = Date.now();
          console.error(`❌ Sipariş onaylama hatası: ${orderId} (${endTime - startTime}ms)`, error);
          
          this.handleApprovalError(order, orderId, error);
          resolve();
        }
      });

    } catch (error) {
      console.error(`❌ Sipariş onaylama preparation hatası: ${orderId}`, error);
      this.notificationService.showNotification(
        `Sipariş onaylama hazırlığında hata: ${orderId}`,
        'error',
        'top-end'
      );
      resolve();
    }
  });
}

private createApprovalData(order: Order, localOrderData: any): any {
  const platform = order.type.toLowerCase();
  const orderId = this.getOrderId(order);

  const approvalData: any = {
    platform,
    orderId,
    action: 'verify' as const,
    urunler: localOrderData.urunler
  };

  // Ödeme bilgisi varsa ekle
  if (localOrderData.odeme) {
    approvalData.odeme = localOrderData.odeme;
  }

  // Platform-specific data
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

  return approvalData;
}
```

### Başarılı Onay İşlemi
```typescript
private handleSuccessfulApproval(order: Order, orderId: string, response: any): void {
  // 1. Onaylanmış olarak işaretle
  this.approvedOrders.add(orderId);

  // 2. UI'da sipariş durumunu güncelle
  this.updateOrderStatusInUI(order, orderId);

  // 3. Bildirim göster
  this.notificationService.showNotification(
    `Sipariş onaylandı: ${orderId}`,
    'success',
    'top-end'
  );

  // 4. Detay penceresini kapat
  if (this.selectedOrder && this.getOrderId(this.selectedOrder) === orderId) {
    this.closeOrderDetails();
  }

  // 5. Ses ve animasyonları kontrol et
  this.checkSoundAndAnimations();

  // 6. Termal yazdırma
  this.printToThermalPrinter(order);

  // 7. Hesap fişi yazdırma
  if (response?.newOrderId) {
    this.printAccountReceipt(order, response.newOrderId);
  }

  // 8. Başarı sesi çal
  this.playSound('success');

  console.log(`🎉 Sipariş onaylama işlemi tamamlandı: ${orderId}`);
}

private updateOrderStatusInUI(order: Order, orderId: string): void {
  const index = this.orders.findIndex(o => this.getOrderId(o) === orderId);
  
  if (index !== -1) {
    // Platform-specific status update
    switch (order.type) {
      case 'GETIR':
        this.orders[index].status = '200';
        break;
      case 'YEMEKSEPETI':
        this.orders[index].status = 'accepted';
        break;
      case 'TRENDYOL':
        this.orders[index].status = 'picking';
        break;
      case 'MIGROS':
        this.orders[index].status = 'approved';
        break;
    }

    // Yeni siparişler listesinden kaldır
    this.newOrders.delete(orderId);

    console.log(`🔄 UI'da sipariş durumu güncellendi: ${orderId} -> ${this.orders[index].status}`);
  }
}

private checkSoundAndAnimations(): void {
  // Onaylanmamış sipariş var mı kontrol et
  const unconfirmedOrders = this.orders.filter(order => this.isNewOrder(order));
  const hasUnconfirmed = unconfirmedOrders.length > 0;

  console.log(`🔊 Ses ve animasyon kontrolü: ${unconfirmedOrders.length} onaylanmamış sipariş`);

  if (!hasUnconfirmed) {
    // Onaylanmamış sipariş yoksa sesi ve animasyonları durdur
    this.stopSound();
    this.stopSoundLoop();
    this.newOrders.clear();
    
    // UI'ı refresh et
    this.filteredOrders = [...this.filteredOrders];
    
    console.log('🔇 Tüm siparişler onaylandı, ses ve animasyonlar durduruldu');
  } else {
    console.log(`🔊 ${unconfirmedOrders.length} onaylanmamış sipariş var, ses devam ediyor`);
  }
}
```

## 📊 Performance Monitoring

### Onaylama Performance Tracking
```typescript
private checkAutoApprovalCompletion(
  metrics: any, 
  startTime: number
): void {
  const totalCompleted = metrics.completedApprovals + metrics.failedApprovals;
  
  if (totalCompleted === metrics.pendingApprovals) {
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Performans metrikleri
    const performanceReport = {
      ...metrics,
      totalTime: `${totalTime}ms`,
      avgTimePerApproval: metrics.pendingApprovals > 0 ? 
        `${(totalTime / metrics.pendingApprovals).toFixed(2)}ms` : '0ms',
      successRate: metrics.pendingApprovals > 0 ? 
        `${((metrics.completedApprovals / metrics.pendingApprovals) * 100).toFixed(1)}%` : '0%'
    };

    console.log('🏁 Otomatik onaylama tamamlandı:', performanceReport);

    // Performance warning
    if (totalTime > 30000) { // 30 saniye
      console.warn(`⚠️ Yavaş onaylama tespit edildi: ${totalTime}ms`);
      this.notificationService.showNotification(
        'Otomatik onaylama yavaş çalışıyor. Sistem performansını kontrol edin.',
        'warning',
        'top-end'
      );
    }

    // Success notification
    if (metrics.completedApprovals > 0) {
      this.notificationService.showNotification(
        `${metrics.completedApprovals} sipariş otomatik onaylandı`,
        'success',
        'top-end'
      );
    }

    this.isRefreshing = false;
  }
}
```

### Memory Management
```typescript
private performMemoryCleanup(): void {
  // 1. Eski onaylanmış siparişleri temizle (1 saatten eski)
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  const oldApprovedOrders = Array.from(this.approvedOrders).filter(orderId => {
    const order = this.orders.find(o => this.getOrderId(o) === orderId);
    if (order) {
      const orderTime = new Date(order.createdAt).getTime();
      return orderTime < oneHourAgo;
    }
    return true; // Order bulunamazsa temizle
  });

  oldApprovedOrders.forEach(orderId => {
    this.approvedOrders.delete(orderId);
  });

  if (oldApprovedOrders.length > 0) {
    console.log(`🧹 ${oldApprovedOrders.length} eski onaylanmış sipariş temizlendi`);
  }

  // 2. Eski yeni sipariş işaretlerini temizle
  const oldNewOrders = Array.from(this.newOrders).filter(orderId => {
    const order = this.orders.find(o => this.getOrderId(o) === orderId);
    if (order) {
      const orderTime = new Date(order.createdAt).getTime();
      return orderTime < oneHourAgo;
    }
    return true;
  });

  oldNewOrders.forEach(orderId => {
    this.newOrders.delete(orderId);
  });

  if (oldNewOrders.length > 0) {
    console.log(`🧹 ${oldNewOrders.length} eski yeni sipariş işareti temizlendi`);
  }

  // 3. Memory usage log
  const memoryUsage = {
    orders: this.orders.length,
    filteredOrders: this.filteredOrders.length,
    newOrders: this.newOrders.size,
    approvedOrders: this.approvedOrders.size,
    stores: this.stores.length
  };

  console.log('📊 Memory kullanımı:', memoryUsage);
}
```

## 🔄 Background Sync Management

### Sync Status Tracking
```typescript
private updateTrendyolSyncStatus(): void {
  if (!this.destroyed) {
    const oldStatus = { ...this.trendyolSyncStatus };
    this.trendyolSyncStatus = this.entegreSiparisService.getTrendyolSyncStatus();
    
    // Status değişimi log'u
    if (JSON.stringify(oldStatus) !== JSON.stringify(this.trendyolSyncStatus)) {
      console.log('🔄 Trendyol sync status değişti:', {
        old: oldStatus,
        new: this.trendyolSyncStatus
      });
    }
  }
}

private updateTrendyolRefundSyncStatus(): void {
  if (!this.destroyed) {
    const oldStatus = { ...this.trendyolRefundSyncStatus };
    this.trendyolRefundSyncStatus = this.entegreSiparisService.getTrendyolRefundSyncStatus();
    
    if (JSON.stringify(oldStatus) !== JSON.stringify(this.trendyolRefundSyncStatus)) {
      console.log('🔄 Trendyol refund sync status değişti:', {
        old: oldStatus,
        new: this.trendyolRefundSyncStatus
      });
    }
  }
}

private updateYemeksepetiRefundSyncStatus(): void {
  if (!this.destroyed) {
    const oldStatus = { ...this.yemeksepetiRefundSyncStatus };
    this.yemeksepetiRefundSyncStatus = this.entegreSiparisService.getYemeksepetiRefundSyncStatus();
    
    if (JSON.stringify(oldStatus) !== JSON.stringify(this.yemeksepetiRefundSyncStatus)) {
      console.log('🔄 YemekSepeti refund sync status değişti:', {
        old: oldStatus,
        new: this.yemeksepetiRefundSyncStatus
      });
    }
  }
}
```

### Sync Error Handling
```typescript
private handleSyncErrors(): void {
  const syncStatuses = [
    { name: 'Trendyol', status: this.trendyolSyncStatus },
    { name: 'Trendyol Refund', status: this.trendyolRefundSyncStatus },
    { name: 'YemekSepeti Refund', status: this.yemeksepetiRefundSyncStatus }
  ];

  syncStatuses.forEach(sync => {
    if (!sync.status.isRunning && this.selectedStore) {
      console.warn(`⚠️ ${sync.name} sync çalışmıyor, yeniden başlatılıyor...`);
      
      // Sync'i yeniden başlat
      switch (sync.name) {
        case 'Trendyol':
          this.entegreSiparisService.startTrendyolSync(this.selectedStore);
          break;
        case 'Trendyol Refund':
          this.entegreSiparisService.startTrendyolRefundSync(this.selectedStore);
          break;
        case 'YemekSepeti Refund':
          this.entegreSiparisService.startYemeksepetiRefundSync(this.selectedStore);
          break;
      }
    }
  });
}
```

Bu dosyada **otomatik onay sisteminin tamamen detaylı** algoritması var! 

**Sıradaki dosyalar:**
- `04-PLATFORM-ENTEGRASYONLARI.md` (Trendyol, YemekSepeti, Migros, Getir detayları)
- `05-TERMAL-YAZDIRMA-SISTEMI.md` (HTML generator, printer API)
- `06-UI-COMPONENTS-DETAY.md` (HTML templates, CSS animations)
- `07-ELECTRON-INTEGRATION.md` (Tray, shortcuts, auto-updater)
- `08-BUILD-DEPLOY-GUIDE.md` (GitHub Actions, release)

Devam edeyim mi? 🚀
