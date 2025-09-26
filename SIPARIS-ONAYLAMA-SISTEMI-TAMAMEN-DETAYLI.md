# 🚀 Sipariş Onaylama Sistemi - TAMAMEN DETAYLI ANALİZ

## 📋 İçindekiler
1. [Onaylama İş Akışı](#onaylama-iş-akışı)
2. [Payload Oluşturma](#payload-oluşturma)
3. [Platform Farklılıkları](#platform-farklılıkları)
4. [prepareLocalOrder Algoritması](#preparelocalorder-algoritması)
5. [Ürün İşleme Detayları](#ürün-işleme-detayları)
6. [Ödeme Sistemi](#ödeme-sistemi)
7. [API İletişimi](#api-iletişimi)
8. [Yazdırma Sistemi](#yazdırma-sistemi)

---

## 🎯 Onaylama İş Akışı

### Ana approveOrder Metodu
```typescript
approveOrder(order: Order): Promise<void> {
    return new Promise((resolve) => {
        if (!order) {
            console.error('❌ Sipariş objesi null');
            resolve();
            return;
        }

        const orderId = this.getOrderId(order);
        console.log(`🚀 Sipariş onaylama başlatılıyor: ${orderId} (${order.type})`);

        // 1. Zaten onaylanmış mı kontrol et
        if (this.approvedOrders.has(orderId)) {
            console.log('⚠️ Bu sipariş zaten onaylanmış:', orderId);
            resolve();
            return;
        }

        try {
            // 2. Yerel sipariş verisini hazırla (EN ÖNEMLİ KISIM)
            console.log('📦 prepareLocalOrder başlatılıyor...');
            const localOrderData = this.prepareLocalOrder(order);
            
            console.log('📊 Hazırlanan veri:', {
                urunSayisi: localOrderData.urunler?.length || 0,
                toplamFiyat: localOrderData.toplamVergiliFiyat,
                odemeVar: !!localOrderData.odeme,
                musteriAdi: localOrderData.musteri?.ad
            });

            // 3. API için approval data oluştur
            const approvalData = this.createApprovalPayload(order, localOrderData);
            
            console.log('📤 API\'ye gönderilecek veri:', approvalData);

            // 4. API'ye gönder
            this.entegreSiparisService.approveOrder(approvalData).subscribe({
                next: (response: any) => {
                    console.log(`✅ Sipariş onaylandı: ${orderId}`, response);
                    this.handleSuccessfulApproval(order, orderId, response);
                    resolve();
                },
                error: (error) => {
                    console.error(`❌ Sipariş onaylama hatası: ${orderId}`, error);
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

private createApprovalPayload(order: Order, localOrderData: any): any {
    const platform = order.type.toLowerCase();
    const orderId = this.getOrderId(order);

    const approvalData: {
        platform: string;
        orderId: string;
        action: 'verify' | 'prepare' | 'handover' | 'cancel';
        cancelReason?: {
            id: string;
            note: string;
        };
        urunler?: any[];
        odeme?: any;
    } = {
        platform,
        orderId,
        action: 'verify' as const,
        urunler: localOrderData.urunler
    };

    // Ödeme bilgisi varsa ekle
    if (localOrderData.odeme) {
        approvalData.odeme = localOrderData.odeme;
    }

    return approvalData;
}
```

---

## 📦 Payload Oluşturma - prepareLocalOrder

### Ana Veri Yapısı
```typescript
private prepareLocalOrder(order: Order): any {
    console.log(`📦 prepareLocalOrder başlatılıyor: ${this.getOrderId(order)} (${order.type})`);

    // 1. ANA ORDER ŞEMASI
    const localOrderData: any = {
        magazaKodu: this.selectedStore,
        siparisTarihi: new Date().toISOString(),
        urunler: [], // En önemli kısım - ürünler burada toplanacak
        toplamVergiliFiyat: 0,
        toplamVergisizFiyat: 0,
        toplamIndirim: 0,
    };

    // 2. MÜŞTERİ BİLGİLERİ
    const customerName = this.getCustomerName(order);
    const phone = this.getCustomerPhone(order);
    
    localOrderData.musteri = {
        ad: customerName || '',
        soyad: '', // Genelde boş
        telefon: phone || '',
    };

    console.log('👤 Müşteri bilgileri:', localOrderData.musteri);

    // 3. ADRES BİLGİLERİ
    const addressObj = this.getDeliveryAddress(order);
    localOrderData.siparisAdresi = {
        adres: addressObj.address || '',
        adresAciklama: addressObj.description || '',
    };

    console.log('🏠 Adres bilgileri:', localOrderData.siparisAdresi);

    // 4. ÖDEME BİLGİLERİ (Eşleştirme varsa)
    if (order?.rawData?.payment?.mapping?.localPaymentType) {
        localOrderData.odeme = this.preparePaymentData(order);
        console.log('💳 Ödeme bilgileri:', localOrderData.odeme);
    }

    // 5. ÜRÜN İŞLEME (Platform-specific)
    const urunler = this.processProductsByPlatform(order);
    localOrderData.urunler = urunler;

    // 6. TOPLAM FİYAT HESAPLAMA
    localOrderData.toplamVergiliFiyat = urunler.reduce((total, urun) => {
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
```

### Ödeme Verisi Hazırlama
```typescript
private preparePaymentData(order: Order): any {
    let totalAmount = 0;

    // Platform türüne göre totalAmount hesapla
    switch (order.type) {
        case 'YEMEKSEPETI':
            const grandTotal = order.rawData.price.grandTotal?.toString() || '0';
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
            const discount = this.calculateTrendyolDiscount(order);
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
                const amount = this.getOrderAmount(order);
                totalAmount = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
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

private calculateTrendyolDiscount(order: Order): number {
    let totalDiscount = 0;

    if (order.rawData?.lines && Array.isArray(order.rawData.lines)) {
        order.rawData.lines.forEach(line => {
            if (line.items && Array.isArray(line.items)) {
                line.items.forEach(item => {
                    // Promosyon indirimleri
                    if (item.promotions && Array.isArray(item.promotions)) {
                        item.promotions.forEach(promo => {
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
```

---

## 🛒 Platform Farklılıkları

### Platform-Specific Ürün İşleme
```typescript
private processProductsByPlatform(order: Order): any[] {
    console.log(`⚙️ Platform-specific ürün işleme: ${order.type}`);

    switch (order.type) {
        case 'TRENDYOL':
            return this.processTrendyolProducts(order);
        case 'YEMEKSEPETI':
            return this.processYemekSepetiProducts(order);
        case 'GETIR':
            return this.processGetirProducts(order);
        case 'MIGROS':
            return this.processMigrosProducts(order);
        default:
            console.warn(`⚠️ Bilinmeyen platform: ${order.type}`);
            return [];
    }
}
```

### 1. Trendyol Ürün İşleme
```typescript
private processTrendyolProducts(order: Order): any[] {
    if (!Array.isArray(order.rawData.lines)) {
        console.warn('⚠️ Trendyol lines array eksik');
        return [];
    }

    console.log(`🍊 Trendyol ürünleri işleniyor: ${order.rawData.lines.length} line`);
    const urunler = [];

    // İstenmeyen ürünleri filtrele
    const mainProducts = order.rawData.lines.filter(line => {
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
        const productObj = {
            urunId: localMainProd._id,
            urunAdi: localMainProd.urunAdi,
            miktar: productQuantity,
            vergiliFiyat: mainProduct.price || 0,
            vergisizFiyat: (mainProduct.price || 0) / 1.2,
            isOneriliMenu: false,
            yapildimi: 'gonderildi',
            items: [] // Modifier'lar burada toplanacak
        };

        // Modifier products işle
        if (Array.isArray(mainProduct.modifierProducts)) {
            const modifierItems = this.processTrendyolModifiers(mainProduct.modifierProducts);
            productObj.items = modifierItems;
        }

        urunler.push(productObj);
        console.log(`✅ Trendyol ürün eklendi: ${localMainProd.urunAdi} x${productQuantity}`);
    }

    return urunler;
}

private processTrendyolModifiers(modifiers: any[]): any[] {
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
            const modifierItem = {
                tip: modifier.mapping.eslestirilenUrunTipi || 'Urun',
                itemId: modifier.mapping.eslestirilenUrun._id,
                miktar: 1,
                birim: 'adet',
                ekFiyat: 0,
                selected: true,
                istenmeyen: false,
                items: [],
                itemDetails: {
                    urunAdi: modifier.mapping.eslestirilenUrun.urunAdi,
                    kategori: {},
                    altKategori: {},
                    items: [], // İstenmeyen alt modifierlar
                    urunItems: [] // Normal alt modifierlar
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
```

### 2. YemekSepeti Ürün İşleme
```typescript
private processYemekSepetiProducts(order: Order): any[] {
    const products = order.rawData.products || [];
    if (!Array.isArray(products)) {
        console.warn('⚠️ YemekSepeti products array eksik');
        return [];
    }

    console.log(`🍽️ YemekSepeti ürünleri işleniyor: ${products.length} ürün`);
    const urunler = [];

    for (const product of products) {
        const localProd = product.mapping?.localProduct;
        if (!localProd) {
            console.warn(`⚠️ YemekSepeti ürün eşleştirmesi eksik: ${product.name}`);
            continue;
        }

        const miktar = product.quantity || 1;
        const unitPrice = product.price || 0;

        // Ana ürün objesi
        const urunItem = {
            urunId: localProd._id,
            urunAdi: localProd.urunAdi,
            miktar,
            vergiliFiyat: unitPrice,
            vergisizFiyat: unitPrice / 1.2,
            isOneriliMenu: false,
            yapildimi: 'gonderildi',
            items: [] // Toppings burada toplanacak
        };

        // Selected toppings işle
        if (product.selectedToppings && Array.isArray(product.selectedToppings)) {
            const toppingItems = this.processYemekSepetiToppings(product.selectedToppings);
            urunItem.items = toppingItems;
        }

        urunler.push(urunItem);
        console.log(`✅ YemekSepeti ürün eklendi: ${localProd.urunAdi} x${miktar}`);
    }

    return urunler;
}

private processYemekSepetiToppings(toppings: any[]): any[] {
    const toppingItems = [];

    for (const topping of toppings) {
        const item = this.parseYemekSepetiTopping(topping);
        if (item) {
            toppingItems.push(item);
        }
    }

    return toppingItems;
}

private parseYemekSepetiTopping(topping: any): any {
    // "İstemiyorum" ürünlerini filtrele
    if (topping.name &&
        (topping.name.toLowerCase().startsWith('promosyon') ||
         topping.name.toLowerCase().startsWith('ekstra')) &&
        topping.name.toLowerCase().endsWith('istemiyorum')) {
        console.log(`🚫 YemekSepeti istemiyorum topping filtrelendi: ${topping.name}`);
        return null;
    }

    if (!topping.mapping?.localProduct) {
        console.warn(`⚠️ YemekSepeti topping eşleştirmesi eksik: ${topping.name}`);
        return null;
    }

    const localProduct = topping.mapping.localProduct;
    const aggregatorType = (topping.type || '').toUpperCase();
    const localType = topping.mapping?.localProductType || 'Recipe';
    const ekFiyat = parseFloat(topping.price || '0');
    const nameLower = (topping.name || '').toLowerCase();
    const isIstemiyorum = nameLower.includes('istemiyorum') || nameLower.includes('i̇stemiyorum');

    // Base item yapısı
    const itemSchema = {
        tip: localType,
        itemId: localProduct._id,
        miktar: 1,
        birim: 'adet',
        ekFiyat,
        selected: true,
        istenmeyen: isIstemiyorum,
        items: [],
        itemDetails: {
            urunAdi: localProduct.urunAdi || topping.name,
            kategori: {},
            altKategori: {},
            items: [],
            urunItems: []
        }
    };

    // Children işle
    if (Array.isArray(topping.children)) {
        const childItems = this.processYemekSepetiChildren(topping.children);
        
        if (aggregatorType === 'PRODUCT') {
            itemSchema.itemDetails.urunItems = childItems;
        } else if (aggregatorType === 'EXTRA') {
            if (isIstemiyorum) {
                itemSchema.itemDetails.items = childItems;
            } else {
                itemSchema.itemDetails.urunItems = childItems;
            }
        }
    }

    console.log(`✅ YemekSepeti topping işlendi: ${topping.name} (${aggregatorType})`);
    return itemSchema;
}
```

### 3. Getir Ürün İşleme
```typescript
private processGetirProducts(order: Order): any[] {
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
        const urunItem = {
            urunId: localProd._id,
            urunAdi: localProd.urunAdi,
            miktar,
            vergiliFiyat: unitPrice,
            vergisizFiyat: unitPrice / 1.2,
            isOneriliMenu: false,
            yapildimi: 'gonderildi',
            items: [] // Options burada toplanacak
        };

        // Options işle
        if (product.options && Array.isArray(product.options)) {
            const optionItems = this.processGetirOptions(product.options);
            urunItem.items = optionItems;
        }

        urunler.push(urunItem);
        console.log(`✅ Getir ürün eklendi: ${localProd.urunAdi} x${miktar}`);
    }

    return urunler;
}

private processGetirOptions(options: any[]): any[] {
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
            const optionItem = {
                tip: type,
                itemId: localProd._id,
                miktar: 1,
                birim: 'adet',
                ekFiyat,
                selected: true,
                istenmeyen: false,
                items: [],
                itemDetails: {
                    urunAdi: localProd.urunAdi || option.name?.tr,
                    kategori: {},
                    altKategori: {},
                    items: [], // Çıkarılacak malzemeler
                    urunItems: [] // Normal seçimler
                }
            };

            // Option categories işle (soslar, çıkarılacak malzemeler)
            if (option.optionCategories && Array.isArray(option.optionCategories)) {
                option.optionCategories.forEach(optionCategory => {
                    const categoryName = optionCategory.name?.tr || '';
                    const isUnwantedCategory = categoryName.toLowerCase().includes('çıkarılacak') || 
                                             categoryName.toLowerCase().includes('remove');

                    if (optionCategory.options && Array.isArray(optionCategory.options)) {
                        optionCategory.options.forEach(subOption => {
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
                                        items: [],
                                        urunItems: []
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
```

### 4. Migros Ürün İşleme
```typescript
private processMigrosProducts(order: Order): any[] {
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
        const urunItem = {
            urunId: localProd._id,
            urunAdi: localProd.urunAdi,
            miktar,
            vergiliFiyat: unitPrice,
            vergisizFiyat: unitPrice / 1.2,
            isOneriliMenu: false,
            yapildimi: 'gonderildi',
            items: [] // Options burada toplanacak
        };

        // Options işle
        if (product.options && Array.isArray(product.options)) {
            const optionItems = this.processMigrosOptions(product.options);
            urunItem.items = optionItems;
        }

        urunler.push(urunItem);
        console.log(`✅ Migros ürün eklendi: ${localProd.urunAdi} x${miktar}`);
    }

    return urunler;
}

private processMigrosOptions(options: any[]): any[] {
    const optionItems = [];

    for (const option of options) {
        if (!option.mapping?.localProduct) {
            console.warn(`⚠️ Migros option eşleştirmesi eksik: ${option.itemNames}`);
            continue;
        }

        const localProduct = option.mapping.localProduct;
        const localType = option.mapping.localProductType || 'Urun';

        // Ana option item
        const optionItem = {
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
                items: [], // İstenmeyen subOptions
                urunItems: [] // Normal subOptions
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
                            items: [],
                            urunItems: []
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
```

---

## 📡 API İletişimi

### Approval API Endpoint
```typescript
// EntegreSiparisService içinde
approveOrder(data: {
    platform: string;
    orderId: string;
    action: 'verify' | 'prepare' | 'handover' | 'cancel';
    cancelReason?: {
        id: string;
        note: string;
    };
    urunler?: any[];
    odeme?: any;
}): Observable<any> {
    const headers = this.getAuthHeaders();
    
    console.log('📤 Approval API\'ye gönderiliyor:', {
        url: `${this.baseUrl}/api/order-approval/approve`,
        platform: data.platform,
        orderId: data.orderId,
        action: data.action,
        urunSayisi: data.urunler?.length || 0,
        odemeVar: !!data.odeme
    });
    
    return this.http.post(`${this.baseUrl}/api/order-approval/approve`, data, { headers });
}
```

### API Request Örneği
```json
{
  "platform": "yemeksepeti",
  "orderId": "ABC123 (1234567890)",
  "action": "verify",
  "urunler": [
    {
      "urunId": "507f1f77bcf86cd799439011",
      "urunAdi": "Köfte Burger",
      "miktar": 1,
      "vergiliFiyat": 25.00,
      "vergisizFiyat": 20.83,
      "isOneriliMenu": false,
      "yapildimi": "gonderildi",
      "items": [
        {
          "tip": "SKU",
          "itemId": "507f1f77bcf86cd799439012",
          "miktar": 1,
          "birim": "adet",
          "ekFiyat": 0,
          "selected": true,
          "istenmeyen": true
        }
      ]
    }
  ],
  "odeme": {
    "odemeTipi": "507f1f77bcf86cd799439013",
    "odemeAdi": "Kredi Kartı",
    "muhasebeKodu": "KK001",
    "entegrasyonKodu": "CC001",
    "totalAmount": 25.00
  }
}
```

---

## 🖨️ Yazdırma Sistemi

### Başarılı Onay Sonrası İşlemler
```typescript
private handleSuccessfulApproval(order: Order, orderId: string, response: any): void {
    // 1. Siparişi onaylanmış olarak işaretle
    this.approvedOrders.add(orderId);

    // 2. UI'da sipariş durumunu güncelle
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
    }

    // 3. Bildirim göster
    this.notificationService.showNotification(
        this.translate.instant("orderaccepted"),
        'success',
        'top-end'
    );

    // 4. Detay penceresini kapat
    this.closeOrderDetails();

    // 5. Ses ve animasyonları kontrol et
    this.checkSoundAndAnimations();

    // 6. FİŞ 1: Termal sipariş fişi yazdır
    console.log('🖨️ Termal sipariş fişi yazdırılıyor...');
    this.printToThermalPrinter(order);

    // 7. FİŞ 2: Hesap fişi yazdırma işlemi
    if (response && response.newOrderId) {
        console.log('📋 Hesap fişi yazdırma başlatılıyor...');
        this.printAccountReceipt(order, response.newOrderId);
    }

    console.log(`🎉 Sipariş onaylama tamamlandı: ${orderId}`);
}

// İki ayrı yazdırma metodu
printToThermalPrinter(order: Order): void {
    // Sipariş fişi yazdırma
    const htmlContent = this.getOrderHtml(order, true);
    
    this.http.post('http://localhost:41411/api/receipt/print', htmlContent, {
        headers: new HttpHeaders({
            'Content-Type': 'text/html;charset=UTF-8'
        }),
        responseType: 'text'
    }).subscribe({
        next: (response) => {
            console.log('✅ Termal sipariş fişi yazdırıldı');
            this.notificationService.showNotification(
                this.translate.instant("termalwritesuccessful"),
                'success',
                'top-end'
            );
        },
        error: (error) => {
            console.error('❌ Termal sipariş fişi hatası:', error);
        }
    });
}

printAccountReceipt(order: Order, newOrderId: string): void {
    // Platform-specific order ID alma
    let platformOrderId = '';
    
    switch (order.type) {
        case 'YEMEKSEPETI':
            platformOrderId = order.rawData.code;
            break;
        case 'TRENDYOL':
            platformOrderId = order.rawData.orderNumber;
            break;
        case 'MIGROS':
            platformOrderId = order.rawData.orderId.toString();
            break;
        case 'GETIR':
            platformOrderId = order.rawData.orderId?.toString() || order.rawData.confirmationId;
            break;
    }

    // Backend'den local order bilgilerini al
    this.entegreSiparisService.getOrderById(platformOrderId, order.type).subscribe({
        next: (response) => {
            const localOrderId = response?.id || response?.newOrderId || newOrderId;
            
            // Hesap fişi HTML'ini al
            this.orderService.getOrderHesapFisi(localOrderId).subscribe({
                next: (htmlContent) => {
                    // Hesap fişini yazdır
                    this.orderService.posthesapFisi(htmlContent).subscribe({
                        next: (printerResponse) => {
                            console.log("✅ Hesap fişi yazdırıldı:", printerResponse);
                            this.notificationService.showNotification(
                                this.translate.instant('AccountReceiptPrintingProcessSuccessful'),
                                'success',
                                'top-end'
                            );
                        },
                        error: (error) => {
                            console.error('❌ Hesap fişi yazdırma hatası:', error);
                        }
                    });
                },
                error: (error) => {
                    console.error('❌ Hesap fişi HTML alma hatası:', error);
                }
            });
        },
        error: (error) => {
            console.error('❌ Local order ID alma hatası:', error);
        }
    });
}
```

---

## 🔧 Platform-Specific Order ID Mapping

### Order ID Alma Sistemi
```typescript
getOrderId(order: Order): string {
    if (!order?.rawData) return '';

    let orderId = '';

    switch (order.type) {
        case 'YEMEKSEPETI':
            const shortCode = order.rawData.shortCode || '';
            const code = order.rawData.code || '';
            orderId = shortCode ? `${shortCode} (${code})` : code;
            console.log('🍽️ YemekSepeti Order ID:', { shortCode, code, final: orderId });
            break;
            
        case 'GETIR':
            orderId = order.rawData.confirmationId || order.rawData.id || '';
            console.log('🟣 Getir Order ID:', { confirmationId: order.rawData.confirmationId, id: order.rawData.id, final: orderId });
            break;
            
        case 'TRENDYOL':
            const orderNumber = order.rawData.orderNumber || '';
            const orderCode = order.rawData.orderCode || '';
            orderId = orderCode ? `${orderNumber} (${orderCode})` : orderNumber;
            console.log('🍊 Trendyol Order ID:', { orderNumber, orderCode, final: orderId });
            break;
            
        case 'MIGROS':
            const migrosOrderId = order.rawData.orderId || '';
            const confirmationId = order.rawData.platformConfirmationId || '';
            orderId = confirmationId ? `${migrosOrderId} (${confirmationId})` : migrosOrderId.toString();
            console.log('🟢 Migros Order ID:', { orderId: migrosOrderId, confirmationId, final: orderId });
            break;
            
        default:
            console.warn(`⚠️ Bilinmeyen platform için order ID: ${order.type}`);
    }

    if (!orderId) {
        console.error(`❌ Order ID bulunamadı:`, order);
    }

    return orderId;
}
```

---

## 🎯 Onaylama Koşulları

### Platform-Specific Onaylama Koşulları
```typescript
private canAutoApproveOrder(order: Order): boolean {
    if (!order) return false;

    // 1. Temel kontroller
    if (this.hasAnyMapping(order)) {
        console.log(`❌ Eşleştirme eksikliği: ${this.getOrderId(order)}`);
        return false;
    }

    if (!this.hasPaymentMapping(order)) {
        console.log(`❌ Ödeme eşleştirmesi yok: ${this.getOrderId(order)}`);
        return false;
    }

    // 2. Zaten onaylanmış mı?
    if (['accepted', '200', 'approved'].includes(order?.status?.toString())) {
        return false;
    }

    // 3. Platform-specific durum kontrolleri
    switch (order.type) {
        case 'YEMEKSEPETI':
            const ysStatus = order?.status?.toString();
            const canApproveYS = ysStatus === 'processed' || ysStatus === 'received';
            console.log(`🍽️ YemekSepeti onay kontrolü: ${ysStatus} → ${canApproveYS}`);
            return canApproveYS;

        case 'GETIR':
            const getirStatus = order?.status?.toString();
            let canApproveGetir = false;
            
            if (order?.rawData?.isScheduled) {
                // İleri tarihli sipariş
                canApproveGetir = getirStatus === '325' || getirStatus === '1600';
                console.log(`🟣 Getir ileri tarihli onay kontrolü: ${getirStatus} → ${canApproveGetir}`);
            } else {
                // Normal sipariş
                canApproveGetir = getirStatus === '400';
                console.log(`🟣 Getir normal onay kontrolü: ${getirStatus} → ${canApproveGetir}`);
            }
            return canApproveGetir;

        case 'TRENDYOL':
            const packageStatus = order?.rawData?.packageStatus?.toLowerCase();
            const canApproveTY = packageStatus === 'created';
            console.log(`🍊 Trendyol onay kontrolü: ${packageStatus} → ${canApproveTY}`);
            return canApproveTY;

        case 'MIGROS':
            const migrosStatus = order?.status?.toString().toLowerCase();
            const canApproveMigros = migrosStatus === 'new_pending' || migrosStatus.includes('new');
            console.log(`🟢 Migros onay kontrolü: ${migrosStatus} → ${canApproveMigros}`);
            return canApproveMigros;

        default:
            console.warn(`⚠️ Bilinmeyen platform onay kontrolü: ${order.type}`);
            return false;
    }
}
```

---

## 📊 Final Payload Örneği

### Trendyol Sipariş Payload
```json
{
  "platform": "trendyol",
  "orderId": "TY123456789 (ABC123)",
  "action": "verify",
  "urunler": [
    {
      "urunId": "507f1f77bcf86cd799439011",
      "urunAdi": "Köfte Burger",
      "miktar": 2,
      "vergiliFiyat": 45.00,
      "vergisizFiyat": 37.50,
      "isOneriliMenu": false,
      "yapildimi": "gonderildi",
      "items": [
        {
          "tip": "SKU",
          "itemId": "507f1f77bcf86cd799439012",
          "miktar": 1,
          "birim": "adet",
          "ekFiyat": 0,
          "selected": true,
          "istenmeyen": true
        },
        {
          "tip": "Urun",
          "itemId": "507f1f77bcf86cd799439013",
          "miktar": 1,
          "birim": "adet",
          "ekFiyat": 0,
          "selected": true,
          "istenmeyen": false,
          "items": [],
          "itemDetails": {
            "urunAdi": "Soğan Halkası",
            "kategori": {},
            "altKategori": {},
            "items": [
              {
                "tip": "SKU",
                "itemId": "507f1f77bcf86cd799439014",
                "miktar": 1,
                "birim": "adet",
                "ekFiyat": 0,
                "selected": true,
                "istenmeyen": true
              }
            ],
            "urunItems": []
          }
        }
      ]
    }
  ],
  "odeme": {
    "odemeTipi": "507f1f77bcf86cd799439015",
    "odemeAdi": "Kredi Kartı",
    "muhasebeKodu": "KK001",
    "entegrasyonKodu": "CC001",
    "totalAmount": 40.50
  }
}
```

---

## 🔍 Debug ve Troubleshooting

### Onaylama Debug Sistemi
```typescript
private debugApprovalProcess(order: Order): void {
    const orderId = this.getOrderId(order);
    
    console.group(`🔍 ONAYLAMA DEBUG: ${orderId}`);
    
    // Temel bilgiler
    console.log('📋 Temel Bilgiler:', {
        orderId,
        platform: order.type,
        status: order.status,
        createdAt: order.createdAt
    });

    // Eşleştirme kontrolleri
    console.log('🔗 Eşleştirme Kontrolleri:', {
        hasAnyMapping: this.hasAnyMapping(order),
        hasPaymentMapping: this.hasPaymentMapping(order),
        canAutoApprove: this.canAutoApproveOrder(order)
    });

    // Ürün detayları
    const products = this.getProducts(order);
    console.log('📦 Ürün Detayları:', {
        productCount: products.length,
        products: products.map(p => ({
            name: this.getProductName(p),
            hasMapping: order.type === 'TRENDYOL' ? !!p.mapping?.eslestirilenUrun : !!p.mapping?.localProduct,
            quantity: this.getProductQuantity(p)
        }))
    });

    // Ödeme detayları
    console.log('💳 Ödeme Detayları:', {
        paymentType: this.getPaymentType(order),
        hasMapping: this.hasPaymentMapping(order),
        mappingName: this.getPaymentMappingName(order)
    });

    // Müşteri ve adres
    console.log('👤 Müşteri ve Adres:', {
        customerName: this.getCustomerName(order),
        customerPhone: this.getCustomerPhone(order),
        address: this.getDeliveryAddress(order)
    });

    // Platform-specific bilgiler
    switch (order.type) {
        case 'TRENDYOL':
            console.log('🍊 Trendyol Özel Bilgiler:', {
                packageStatus: order.rawData.packageStatus,
                deliveryType: order.rawData.deliveryType,
                lines: order.rawData.lines?.length || 0,
                totalPrice: order.rawData.totalPrice,
                customerNote: order.rawData.customerNote
            });
            break;
            
        case 'YEMEKSEPETI':
            console.log('🍽️ YemekSepeti Özel Bilgiler:', {
                expeditionType: order.rawData.expeditionType,
                shortCode: order.rawData.shortCode,
                code: order.rawData.code,
                products: order.rawData.products?.length || 0
            });
            break;
            
        case 'GETIR':
            console.log('🟣 Getir Özel Bilgiler:', {
                isScheduled: order.rawData.isScheduled,
                scheduledDate: order.rawData.scheduledDate,
                deliveryType: order.rawData.deliveryType,
                confirmationId: order.rawData.confirmationId
            });
            break;
            
        case 'MIGROS':
            console.log('🟢 Migros Özel Bilgiler:', {
                deliveryProvider: order.rawData.deliveryProvider,
                platformConfirmationId: order.rawData.platformConfirmationId,
                items: order.rawData.items?.length || 0,
                prices: order.rawData.prices
            });
            break;
    }

    // Raw data (sadece development'ta)
    if (!environment.production) {
        console.log('📄 Raw Data:', order.rawData);
    }

    console.groupEnd();
}
```

### Yaygın Onaylama Hataları ve Çözümleri
```typescript
private handleApprovalError(order: Order, orderId: string, error: any): void {
    console.error(`❌ Onaylama hatası analizi: ${orderId}`, error);

    let errorMessage = 'Sipariş onaylanırken hata oluştu';
    let errorType: 'error' | 'warning' = 'error';

    // Hata tipine göre mesaj
    if (error.status === 400) {
        errorMessage = 'Geçersiz sipariş verisi';
        console.log('🔍 400 Hatası - Gönderilen veri:', this.lastSentApprovalData);
    } else if (error.status === 401) {
        errorMessage = 'Yetki hatası - Token geçersiz';
        errorType = 'warning';
    } else if (error.status === 404) {
        errorMessage = 'Sipariş bulunamadı';
    } else if (error.status === 409) {
        errorMessage = 'Sipariş zaten işlemde';
        errorType = 'warning';
    } else if (error.status === 422) {
        errorMessage = 'Eşleştirme hatası - Ürün veya ödeme eşleştirmesi eksik';
        console.log('🔍 422 Hatası - Eşleştirme kontrolü gerekli');
    } else if (error.status === 500) {
        errorMessage = 'Sunucu hatası';
    }

    this.notificationService.showNotification(
        `${errorMessage}: ${orderId}`,
        errorType,
        'top-end'
    );

    // Debug bilgilerini logla
    this.debugApprovalProcess(order);
}
```

---

## 📡 API Endpoint'leri

### Kullanılan API'ler
```typescript
// 1. SİPARİŞ ONAYLAMA
POST https://api.easycorest.com:5555/api/order-approval/approve
Body: {
    platform: string,
    orderId: string, 
    action: 'verify',
    urunler: Array,
    odeme: Object
}

// 2. LOCAL ORDER ID ALMA
PUT https://api.easycorest.com:5555/api/banko/getOrderById
Body: {
    orderId: string,
    type: string
}

// 3. HESAP FİŞİ HTML ALMA
GET https://api.easycorest.com:5555/api/orders/{localOrderId}/hesap-fisi

// 4. TERMAL YAZDIRMA (Sipariş Fişi)
POST http://localhost:41411/api/receipt/print
Content-Type: text/html;charset=UTF-8
Body: HTML Content

// 5. HESAP FİŞİ YAZDIRMA
POST http://localhost:41411/api/receipt/print
Content-Type: text/html;charset=UTF-8
Body: Account Receipt HTML
```

---

## 🎯 Özet: Tam İş Akışı

### 1. Onaylama Tetikleme
```
Kullanıcı "Onayla" butonuna tıklar
↓
approveOrder(order) çağrılır
↓
prepareLocalOrder(order) ile veri hazırlanır
↓
API'ye POST request gönderilir
```

### 2. Başarılı Onay Sonrası
```
API'den response gelir
↓
UI'da sipariş durumu güncellenir
↓
FİŞ 1: Termal sipariş fişi yazdırılır
↓
FİŞ 2: Hesap fişi yazdırılır
↓
Bildirimler gösterilir
```

### 3. Platform Farklılıkları
```
Trendyol: lines → modifierProducts → items
YemekSepeti: products → selectedToppings → children  
Getir: products → options → optionCategories
Migros: items → options → subOptions
```

**Bu dosyada sipariş onaylama sisteminin %100 detayı var!** 🎯✅

Bu MD dosyasını diğer projenize kopyalayarak aynı sistemi uygulayabilirsiniz.
