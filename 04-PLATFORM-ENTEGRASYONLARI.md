# 🛒 Platform Entegrasyonları - TAMAMEN DETAYLI

## 🍊 Trendyol Entegrasyonu

### Trendyol Sipariş Yapısı
```typescript
interface TrendyolOrder {
  orderNumber: string;        // "TY123456789"
  orderCode?: string;         // İç kod
  packageStatus: string;      // "Created", "Picking", "Invoiced", "Shipped", "Delivered"
  totalPrice: number;         // Ana fiyat
  deliveryType: string;       // "GO", "STORE_PICKUP"
  customer: {
    firstName: string;
    lastName: string;
  };
  address: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    district: string;
    neighborhood: string;
    apartmentNumber?: string;
    floor?: string;
    doorNumber?: string;
    addressDescription?: string;
    phone: string;
    latitude?: string;
    longitude?: string;
  };
  customerNote?: string;
  callCenterPhone?: string;
  lines: Array<{
    name: string;
    price: number;
    quantity: number;
    items: Array<{
      promotions?: Array<{
        description: string;
        amount: {
          seller: number;
          marketplace: number;
        };
      }>;
      coupon?: {
        amount: {
          seller: number;
          marketplace: number;
        };
      };
    }>;
    modifierProducts?: Array<{
      name: string;
      price: number;
      modifierProducts?: Array<{
        name: string;
        price: number;
      }>;
      mapping?: {
        eslestirilenUrun: {
          _id: string;
          urunAdi: string;
        };
        eslestirilenUrunTipi: string;
      };
    }>;
    mapping?: {
      eslestirilenUrun: {
        _id: string;
        urunAdi: string;
      };
      eslestirilenUrunTipi: string;
    };
  }>;
  payment: {
    type: string;
    text: { tr: string; en: string };
    mealCardType?: string;
    mapping?: {
      localPaymentType: {
        _id: string;
        odemeAdi: string;
        muhasebeKodu: string;
        entegrasyonKodu: string;
      };
    };
  };
}
```

### Trendyol Ürün İşleme
```typescript
private processTrendyolProducts(order: Order): any[] {
  if (!order.rawData.lines || !Array.isArray(order.rawData.lines)) {
    console.warn('⚠️ Trendyol siparişinde ürün lines eksik');
    return [];
  }

  console.log(`🍊 Trendyol ürünleri işleniyor: ${order.rawData.lines.length} line`);
  const processedProducts = [];

  for (const line of order.rawData.lines) {
    try {
      // "İstemiyorum" ürünlerini filtrele
      if (this.isTrendyolUnwantedProduct(line)) {
        console.log(`🚫 İstemiyorum ürünü filtrelendi: ${line.name}`);
        continue;
      }

      // Eşleştirme kontrolü
      if (!line.mapping?.eslestirilenUrun) {
        console.warn(`⚠️ Trendyol ürün eşleştirmesi eksik: ${line.name}`);
        continue;
      }

      const localProduct = line.mapping.eslestirilenUrun;
      const productQuantity = Array.isArray(line.items) ? line.items.length : 1;

      // Ana ürün objesi
      const productObj = {
        urunId: localProduct._id,
        urunAdi: localProduct.urunAdi,
        miktar: productQuantity,
        vergiliFiyat: line.price || 0,
        vergisizFiyat: (line.price || 0) / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: [] as any[]
      };

      // Modifier products işle
      if (line.modifierProducts && Array.isArray(line.modifierProducts)) {
        const modifierItems = this.processTrendyolModifiers(line.modifierProducts);
        productObj.items = modifierItems;
      }

      processedProducts.push(productObj);
      
      console.log(`✅ Trendyol ürün işlendi: ${localProduct.urunAdi} x${productQuantity}`);
      
    } catch (error) {
      console.error(`❌ Trendyol ürün işleme hatası:`, error, line);
    }
  }

  console.log(`📊 Trendyol ürün işleme tamamlandı: ${processedProducts.length} ürün`);
  return processedProducts;
}

private isTrendyolUnwantedProduct(line: any): boolean {
  if (!line.name) return false;
  
  const name = line.name.toLowerCase();
  
  // "Promosyon" veya "Ekstra" ile başlayıp "İstemiyorum" ile biten ürünler
  const isUnwanted = (name.startsWith('promosyon') || name.startsWith('ekstra')) && 
                     name.endsWith('istemiyorum');
  
  return isUnwanted;
}

private processTrendyolModifiers(modifiers: any[]): any[] {
  const modifierItems = [];

  for (const modifier of modifiers) {
    try {
      if (!modifier.mapping?.eslestirilenUrun) {
        console.warn(`⚠️ Trendyol modifier eşleştirmesi eksik: ${modifier.name}`);
        continue;
      }

      const localModifier = modifier.mapping.eslestirilenUrun;
      const modifierName = modifier.name || '';
      const isUnwanted = modifierName.toLowerCase().includes('istemiyorum') || 
                        modifierName.toLowerCase().includes('i̇stemiyorum');

      if (isUnwanted) {
        // İstemiyorum modifier - direkt ekle
        const unwantedItem = {
          tip: modifier.mapping.eslestirilenUrunTipi || 'SKU',
          itemId: localModifier._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          selected: true,
          istenmeyen: true
        };
        
        modifierItems.push(unwantedItem);
        console.log(`🚫 İstemiyorum modifier eklendi: ${modifierName}`);
      } else {
        // Normal modifier
        const modifierItem = {
          tip: modifier.mapping.eslestirilenUrunTipi || 'Urun',
          itemId: localModifier._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          selected: true,
          istenmeyen: false,
          items: [],
          itemDetails: {
            urunAdi: localModifier.urunAdi,
            kategori: {},
            altKategori: {},
            items: [],
            urunItems: []
          }
        };

        // Alt modifier'ları işle
        if (modifier.modifierProducts && Array.isArray(modifier.modifierProducts)) {
          const subModifiers = this.processTrendyolSubModifiers(modifier.modifierProducts);
          modifierItem.itemDetails.items = subModifiers.unwanted;
          modifierItem.itemDetails.urunItems = subModifiers.normal;
        }

        modifierItems.push(modifierItem);
        console.log(`✅ Normal modifier eklendi: ${modifierName}`);
      }
    } catch (error) {
      console.error(`❌ Trendyol modifier işleme hatası:`, error, modifier);
    }
  }

  return modifierItems;
}

private processTrendyolSubModifiers(subModifiers: any[]): {
  unwanted: any[];
  normal: any[];
} {
  const result = { unwanted: [], normal: [] };

  for (const subMod of subModifiers) {
    try {
      if (!subMod.mapping?.eslestirilenUrun) {
        console.warn(`⚠️ Trendyol sub-modifier eşleştirmesi eksik: ${subMod.name}`);
        continue;
      }

      const localSubMod = subMod.mapping.eslestirilenUrun;
      const subName = subMod.name || '';
      const isUnwanted = subName.toLowerCase().includes('istemiyorum') || 
                        subName.toLowerCase().includes('i̇stemiyorum');

      const subItem = {
        tip: subMod.mapping.eslestirilenUrunTipi || 'SKU',
        itemId: localSubMod._id,
        miktar: 1,
        birim: 'adet',
        ekFiyat: 0,
        selected: true,
        istenmeyen: isUnwanted
      };

      if (isUnwanted) {
        result.unwanted.push(subItem);
        console.log(`🚫 İstemiyorum sub-modifier: ${subName}`);
      } else {
        // Normal sub-modifier için özel yapı
        const normalSubItem = {
          tip: subMod.mapping.eslestirilenUrunTipi || 'SKU',
          itemId: {
            _id: localSubMod._id,
            urunAdi: localSubMod.urunAdi
          },
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          selected: true
        };
        
        const wrapperItem = {
          ...subItem,
          items: [normalSubItem]
        };
        
        result.normal.push(wrapperItem);
        console.log(`✅ Normal sub-modifier: ${subName}`);
      }
    } catch (error) {
      console.error(`❌ Trendyol sub-modifier işleme hatası:`, error, subMod);
    }
  }

  return result;
}
```

## 🍽️ YemekSepeti Entegrasyonu

### YemekSepeti Sipariş Yapısı
```typescript
interface YemekSepetiOrder {
  shortCode: string;          // "ABC123"
  code: string;               // "1234567890"
  expeditionType: string;     // "delivery", "pickup", "vendor"
  status: string;             // "processed", "received", "accepted", "completed"
  customer: {
    firstName: string;
    lastName: string;
    mobilePhone: string;
  };
  delivery: {
    address: {
      street: string;
      number: string;
      building?: string;
      city: string;
      postcode?: string;
      company?: string;
      flatNumber?: string;
      floor?: string;
      deliveryInstructions?: string;
    };
  };
  comments?: {
    customerComment?: string;
  };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    selectedToppings?: Array<{
      name: string;
      price?: number;
      type: 'PRODUCT' | 'EXTRA';
      children?: Array<{
        name: string;
        price?: number;
        type: 'PRODUCT' | 'EXTRA';
      }>;
      mapping?: {
        localProduct: {
          _id: string;
          urunAdi: string;
        };
        localProductType: string;
      };
    }>;
    mapping?: {
      localProduct: {
        _id: string;
        urunAdi: string;
      };
      localProductType: string;
    };
  }>;
  price: {
    grandTotal: number;
  };
  payment: {
    text: { tr: string; en: string };
    mapping?: {
      localPaymentType: {
        _id: string;
        odemeAdi: string;
      };
    };
  };
}
```

### YemekSepeti Ürün İşleme
```typescript
private processYemekSepetiProducts(order: Order): any[] {
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
        continue;
      }

      const localProduct = product.mapping.localProduct;
      const quantity = product.quantity || 1;

      // Ana ürün objesi
      const productObj = {
        urunId: localProduct._id,
        urunAdi: localProduct.urunAdi,
        miktar: quantity,
        vergiliFiyat: product.price || 0,
        vergisizFiyat: (product.price || 0) / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: []
      };

      // Selected toppings işle
      if (product.selectedToppings && Array.isArray(product.selectedToppings)) {
        const toppingItems = this.processYemekSepetiToppings(product.selectedToppings);
        productObj.items = toppingItems;
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

private processYemekSepetiToppings(toppings: any[]): any[] {
  const toppingItems = [];

  for (const topping of toppings) {
    try {
      const toppingItem = this.parseYemekSepetiTopping(topping);
      if (toppingItem) {
        toppingItems.push(toppingItem);
      }
    } catch (error) {
      console.error(`❌ YemekSepeti topping işleme hatası:`, error, topping);
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
    console.log(`🚫 YemekSepeti istemiyorum ürünü filtrelendi: ${topping.name}`);
    return null;
  }

  // Eşleştirme kontrolü
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

  // Base item structure
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
    const { extraItems, productItems } = this.processYemekSepetiChildren(topping.children);
    
    if (aggregatorType === 'PRODUCT') {
      itemSchema.itemDetails.urunItems = [...productItems, ...extraItems];
    } else {
      if (isIstemiyorum) {
        itemSchema.itemDetails.items = extraItems;
        itemSchema.itemDetails.urunItems = productItems;
      } else {
        itemSchema.itemDetails.urunItems = [...productItems, ...extraItems];
      }
    }
  }

  console.log(`✅ YemekSepeti topping işlendi: ${topping.name} (${aggregatorType})`);
  return itemSchema;
}

private processYemekSepetiChildren(children: any[]): {
  extraItems: any[];
  productItems: any[];
} {
  const extraItems = [];
  const productItems = [];

  for (const child of children) {
    try {
      if (!child.mapping?.localProduct) {
        console.warn(`⚠️ YemekSepeti child eşleştirmesi eksik: ${child.name}`);
        continue;
      }

      const childItem = this.parseYemekSepetiTopping(child);
      if (!childItem) continue;

      const aggregatorType = (child.type || '').toUpperCase();
      
      if (aggregatorType === 'PRODUCT') {
        productItems.push(childItem);
      } else {
        extraItems.push(childItem);
      }
    } catch (error) {
      console.error(`❌ YemekSepeti child işleme hatası:`, error, child);
    }
  }

  return { extraItems, productItems };
}
```

## 🟣 Getir Entegrasyonu

### Getir Sipariş Yapısı
```typescript
interface GetirOrder {
  id: string;
  confirmationId: string;
  status: '400' | '325' | '1600' | '200' | '700' | '800';
  isScheduled: boolean;
  scheduledDate?: string;
  deliveryType: 1 | 2;       // 1: Getir Getirsin, 2: Restoran Getirsin
  totalDiscountedPrice?: number;
  totalPrice: number;
  totalAmount?: number;
  discountedAmount?: number;
  client: {
    name: string;
    contactPhoneNumber: string;
    clientPhoneNumber?: string;
    deliveryAddress: {
      address: string;
      district: string;
      city: string;
      doorNo?: string;
      floor?: string;
      description?: string;
    };
  };
  products: Array<{
    name: string;
    quantity: number;
    price: number;
    options?: Array<{
      name: { tr: string; en: string };
      options: Array<{
        name: { tr: string; en: string };
        price: number;
        product?: string;
        chainProduct?: string;
        optionCategories?: Array<{
          name: { tr: string; en: string };
          options: Array<{
            name: { tr: string; en: string };
            price: number;
            product?: string;
            chainProduct?: string;
          }>;
        }>;
        mapping?: {
          localProduct: {
            _id: string;
            urunAdi: string;
          };
          localProductType: string;
        };
      }>;
    }>;
    mapping?: {
      localProduct: {
        _id: string;
        urunAdi: string;
      };
      localProductType: string;
    };
  }>;
  payment: {
    text: { tr: string; en: string };
    mapping?: {
      localPaymentType: {
        _id: string;
        odemeAdi: string;
      };
    };
  };
  paymentMethodText?: { tr: string; en: string };
}
```

### Getir Ürün İşleme
```typescript
private processGetirProducts(order: Order): any[] {
  if (!order.rawData.products || !Array.isArray(order.rawData.products)) {
    console.warn('⚠️ Getir siparişinde ürün listesi eksik');
    return [];
  }

  console.log(`🟣 Getir ürünleri işleniyor: ${order.rawData.products.length} ürün`);
  const processedProducts = [];

  for (const product of order.rawData.products) {
    try {
      // Ana ürün eşleştirme kontrolü
      if (!product.mapping?.localProduct) {
        console.warn(`⚠️ Getir ürün eşleştirmesi eksik: ${product.name}`);
        continue;
      }

      const localProduct = product.mapping.localProduct;
      const quantity = product.quantity || 1;

      // Ana ürün objesi
      const productObj = {
        urunId: localProduct._id,
        urunAdi: localProduct.urunAdi,
        miktar: quantity,
        vergiliFiyat: product.price || 0,
        vergisizFiyat: (product.price || 0) / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: []
      };

      // Options işle
      if (product.options && Array.isArray(product.options)) {
        const optionItems = this.processGetirOptions(product.options);
        productObj.items = optionItems;
      }

      processedProducts.push(productObj);
      
      console.log(`✅ Getir ürün işlendi: ${localProduct.urunAdi} x${quantity}`);
      
    } catch (error) {
      console.error(`❌ Getir ürün işleme hatası:`, error, product);
    }
  }

  console.log(`📊 Getir ürün işleme tamamlandı: ${processedProducts.length} ürün`);
  return processedProducts;
}

private processGetirOptions(options: any[]): any[] {
  const optionItems = [];

  for (const category of options) {
    if (!Array.isArray(category.options)) continue;

    for (const option of category.options) {
      try {
        if (!option.mapping?.localProduct) {
          console.warn(`⚠️ Getir option eşleştirmesi eksik: ${option.name?.tr || option.name?.en}`);
          continue;
        }

        const localProduct = option.mapping.localProduct;
        const type = option.mapping?.localProductType || 'Recipe';
        const ekFiyat = parseFloat(option.price || '0');

        // Ana option item
        const optionItem = {
          tip: type,
          itemId: localProduct._id,
          miktar: 1,
          birim: 'adet',
          ekFiyat,
          selected: true,
          istenmeyen: false,
          items: [],
          itemDetails: {
            urunAdi: localProduct.urunAdi || option.name?.tr || option.name?.en,
            kategori: {},
            altKategori: {},
            items: [],
            urunItems: []
          }
        };

        // Option categories işle (soslar, çıkarılacak malzemeler)
        if (option.optionCategories && Array.isArray(option.optionCategories)) {
          const categoryItems = this.processGetirOptionCategories(option.optionCategories);
          optionItem.itemDetails.items = categoryItems.unwanted;
          optionItem.itemDetails.urunItems = categoryItems.normal;
        }

        optionItems.push(optionItem);
        
        console.log(`✅ Getir option işlendi: ${option.name?.tr || option.name?.en}`);
        
      } catch (error) {
        console.error(`❌ Getir option işleme hatası:`, error, option);
      }
    }
  }

  return optionItems;
}

private processGetirOptionCategories(categories: any[]): {
  unwanted: any[];
  normal: any[];
} {
  const result = { unwanted: [], normal: [] };

  for (const category of categories) {
    const categoryName = category.name?.tr || category.name?.en || '';
    const isUnwantedCategory = categoryName.toLowerCase().includes('çıkarılacak') || 
                              categoryName.toLowerCase().includes('remove');

    if (category.options && Array.isArray(category.options)) {
      for (const subOption of category.options) {
        try {
          const subOptionName = subOption.name?.tr || subOption.name?.en || '';
          const subLocalProduct = subOption.mapping?.localProduct;
          const subLocalType = subOption.mapping?.localProductType || 'Recipe';
          const subItemId = subLocalProduct ? subLocalProduct._id : (subOption.product || subOption.chainProduct);
          const subProductName = subLocalProduct ? subLocalProduct.urunAdi : subOptionName;

          if (isUnwantedCategory) {
            // Çıkarılacak malzemeler
            const unwantedItem = {
              tip: subLocalType,
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
            
            result.unwanted.push(unwantedItem);
            console.log(`🚫 Getir çıkarılacak malzeme: ${subOptionName}`);
          } else {
            // Normal seçimler
            const normalItem = {
              miktar: 1,
              birim: 'adet',
              ekFiyat: 0,
              items: [
                {
                  tip: subLocalType,
                  itemId: subLocalProduct ? {
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
            
            result.normal.push(normalItem);
            console.log(`✅ Getir normal seçim: ${subOptionName}`);
          }
        } catch (error) {
          console.error(`❌ Getir sub-option işleme hatası:`, error, subOption);
        }
      }
    }
  }

  return result;
}
```

## 🟢 Migros Entegrasyonu

### Migros Sipariş Yapısı
```typescript
interface MigrosOrder {
  orderId: string;
  platformConfirmationId?: string;
  status: string;             // "new_pending", "approved", "cancelled_by_customer"
  deliveryProvider?: string;  // "RESTAURANT", "MIGROS", "PICKUP"
  customerInfo?: {
    name: string;
    phone: string;
    address: {
      street: string;
      number: string;
      detail: string;
      floor?: string;
      door?: string;
      direction?: string;
    };
  };
  customer?: {
    fullName?: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    deliveryAddress?: {
      detail?: string;
      address?: string;
      streetName?: string;
      buildingNumber?: string;
      district?: string;
      city?: string;
      doorNumber?: string;
      floorNumber?: string;
      direction?: string;
    };
  };
  items: Array<{
    name: string;
    amount: number;
    quantity?: number;
    price: number;
    options?: Array<{
      headerName: string;
      itemNames: string;
      primaryDiscountedPrice: number;
      primaryDiscountedPriceText: string;
      optionType?: 'INGREDIENT' | 'ADDON';
      subOptions?: Array<{
        headerName: string;
        itemNames: string;
        primaryDiscountedPrice: number;
        primaryDiscountedPriceText: string;
        optionType?: 'INGREDIENT' | 'ADDON';
        mapping?: {
          localProduct: {
            _id: string;
            urunAdi: string;
          };
          localProductType: string;
        };
      }>;
      mapping?: {
        localProduct: {
          _id: string;
          urunAdi: string;
        };
        localProductType: string;
      };
    }>;
    mapping?: {
      localProduct: {
        _id: string;
        urunAdi: string;
      };
      localProductType: string;
    };
  }>;
  prices: {
    total: { amountAsPenny: number };
    discounted: { amountAsPenny: number };
    restaurantDiscounted?: { amountAsPenny: number };
  };
  payment?: {
    mapping?: {
      localPaymentType: {
        _id: string;
        odemeAdi: string;
      };
    };
  };
}
```

### Migros Ürün İşleme
```typescript
private processMigrosProducts(order: Order): any[] {
  const rawData: any = order.rawData;
  const products = rawData.items || rawData.products || [];

  if (!Array.isArray(products)) {
    console.warn('⚠️ Migros siparişinde ürün listesi eksik');
    return [];
  }

  console.log(`🟢 Migros ürünleri işleniyor: ${products.length} ürün`);
  const processedProducts = [];

  for (const product of products) {
    try {
      // Ana ürün eşleştirme kontrolü
      if (!product.mapping?.localProduct) {
        console.warn(`⚠️ Migros ürün eşleştirmesi eksik: ${product.name}`);
        continue;
      }

      const localProduct = product.mapping.localProduct;
      const quantity = product.amount || product.quantity || 1;

      // Ana ürün objesi
      const productObj = {
        urunId: localProduct._id,
        urunAdi: localProduct.urunAdi,
        miktar: quantity,
        vergiliFiyat: product.price || 0,
        vergisizFiyat: (product.price || 0) / 1.2,
        isOneriliMenu: false,
        yapildimi: 'gonderildi',
        items: []
      };

      // Options işle
      if (product.options && Array.isArray(product.options)) {
        const optionItems = this.processMigrosOptions(product.options, product.name);
        productObj.items = optionItems;
      }

      processedProducts.push(productObj);
      
      console.log(`✅ Migros ürün işlendi: ${localProduct.urunAdi} x${quantity}`);
      
    } catch (error) {
      console.error(`❌ Migros ürün işleme hatası:`, error, product);
    }
  }

  console.log(`📊 Migros ürün işleme tamamlandı: ${processedProducts.length} ürün`);
  return processedProducts;
}

private processMigrosOptions(options: any[], productName: string): any[] {
  const optionItems = [];

  for (const option of options) {
    try {
      // Eşleştirme kontrolü
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
          items: [],
          urunItems: []
        }
      };

      // SubOptions işle
      if (option.subOptions && Array.isArray(option.subOptions)) {
        const subOptionItems = this.processMigrosSubOptions(option.subOptions, productName, option.headerName);
        optionItem.itemDetails.items = subOptionItems.unwanted;
        optionItem.itemDetails.urunItems = subOptionItems.normal;
      }

      optionItems.push(optionItem);
      
      console.log(`✅ Migros option işlendi: ${option.itemNames}`);
      
    } catch (error) {
      console.error(`❌ Migros option işleme hatası:`, error, option);
    }
  }

  return optionItems;
}

private processMigrosSubOptions(subOptions: any[], productName: string, optionName: string): {
  unwanted: any[];
  normal: any[];
} {
  const result = { unwanted: [], normal: [] };

  for (const subOption of subOptions) {
    try {
      if (!subOption.mapping?.localProduct) {
        console.warn(`⚠️ Migros sub-option eşleştirmesi eksik: ${subOption.itemNames}`);
        continue;
      }

      const localProduct = subOption.mapping.localProduct;
      const localType = subOption.mapping.localProductType || 'Recipe';
      const subName = subOption.itemNames || '';

      // String normalization
      const normalizedText = subName.toString().toLowerCase()
        .replace(/i̇/g, 'i')
        .replace(/ı/g, 'i')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      const hasEkstra = normalizedText.includes("ekstra");
      const hasIstemiyorum = normalizedText.includes("istemiyorum");

      // "Ekstra" + "İstemiyorum" kombinasyonu olanları atla
      if (hasEkstra && hasIstemiyorum) {
        console.log(`🚫 Migros ekstra istemiyorum atlandı: ${subName}`);
        continue;
      }

      // İstenmeyen kontrolü (sadece "İstemiyorum" veya INGREDIENT tipi)
      const isIngredient = subOption.optionType === 'INGREDIENT';
      const isUnwanted = (hasIstemiyorum && !hasEkstra) || isIngredient;

      const subItem = {
        tip: localType,
        itemId: localProduct._id,
        miktar: 1,
        birim: 'adet',
        ekFiyat: 0,
        selected: true,
        istenmeyen: isUnwanted,
        itemDetails: {
          urunAdi: localProduct.urunAdi || subOption.itemNames,
          kategori: {},
          altKategori: {},
          items: [],
          urunItems: []
        }
      };

      if (isUnwanted) {
        result.unwanted.push(subItem);
        console.log(`🚫 Migros istenmeyen: ${subName}`);
      } else {
        // Normal customer seçimi için wrapper yapısı
        const customerChoiceItem = {
          miktar: 1,
          birim: 'adet',
          ekFiyat: 0,
          items: [
            {
              tip: localType,
              itemId: {
                _id: localProduct._id,
                urunAdi: localProduct.urunAdi
              },
              miktar: 1,
              birim: 'adet',
              ekFiyat: 0,
              selected: true
            }
          ]
        };
        
        result.normal.push(customerChoiceItem);
        console.log(`✅ Migros normal seçim: ${subName}`);
      }
    } catch (error) {
      console.error(`❌ Migros sub-option işleme hatası:`, error, subOption);
    }
  }

  return result;
}
```

## 📊 Platform Status Sistemi

### Platform-Specific Status Mapping
```typescript
getStatusText(status: string | number | undefined): string {
  if (!status) return 'Durum Belirsiz';

  const statusStr = status.toString().toLowerCase();
  
  // Platform-agnostic status'lar
  const commonStatuses: { [key: string]: string } = {
    'new': 'Yeni Sipariş',
    'received': 'Yeni Sipariş',
    'accepted': 'Onaylandı',
    'rejected': 'Reddedildi',
    'cancelled': 'İptal Edildi',
    'completed': 'Tamamlandı',
    'delivered': 'Teslim Edildi'
  };

  // Önce common status'lara bak
  if (commonStatuses[statusStr]) {
    return commonStatuses[statusStr];
  }

  // Platform-specific status'lar
  return this.getPlatformSpecificStatusText(statusStr);
}

private getPlatformSpecificStatusText(status: string): string {
  // Getir status'ları
  if (['400', '325', '1600'].includes(status)) {
    if (status === '400') return 'Yeni Sipariş';
    if (status === '325') return this.selectedOrder?.rawData?.isScheduled ? 'İleri Tarihli Sipariş' : 'Yeni Sipariş';
    if (status === '1600') return 'İleri Tarihli Hatırlatma';
  }
  
  if (status === '200') return 'Onaylandı';
  if (['700', '800'].includes(status)) return 'Tamamlandı';

  // YemekSepeti status'ları
  if (status === 'processed') return 'Yeni Sipariş';

  // Trendyol status'ları
  if (status === 'created') return 'Yeni Sipariş';
  if (['preparing', 'picking'].includes(status)) return 'Hazırlanıyor';
  if (status === 'invoiced') return 'Fatura Kesildi';
  if (status === 'shipped') return 'Gönderildi';
  if (status === 'unsupplied') return 'Tedarik Edilemedi';

  // Migros status'ları
  if (status === 'new_pending') return 'Yeni Sipariş';
  if (status === 'approved') return 'Onaylandı';
  if (status === 'cancelled_by_customer') return 'Müşteri İptal Etti';
  if (status === 'cancelled_by_restaurant') return 'Restoran İptal Etti';

  // Keyword-based fallback
  if (status.includes('new')) return 'Yeni Sipariş';
  if (status.includes('approve')) return 'Onaylandı';
  if (status.includes('cancel')) return 'İptal Edildi';
  if (status.includes('pending')) return 'Bekliyor';

  return `Durum: ${status}`;
}

getStatusClass(status: string | number | undefined): string {
  if (!status) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';

  const statusStr = status.toString().toLowerCase();
  
  // Yeni sipariş durumları (mavi)
  if (['received', 'new', '400', 'created', 'processed', 'new_pending'].includes(statusStr)) {
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
  
  // İleri tarihli (sarı)
  if (statusStr === '325' && this.selectedOrder?.rawData?.isScheduled) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
  }
  
  // Onaylanmış durumlar (yeşil)
  if (['200', 'accepted', 'preparing', 'picking', 'approved'].includes(statusStr)) {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  }
  
  // İptal/Ret durumları (kırmızı)
  if (['rejected', 'cancelled', 'unsupplied', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(statusStr)) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  }
  
  // Fatura/Sevkiyat durumları
  if (statusStr === 'invoiced') {
    return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  }
  
  if (statusStr === 'shipped') {
    return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
  }
  
  if (['delivered', '700', '800'].includes(statusStr)) {
    return 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200';
  }

  // Varsayılan
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}
```

## 🎨 Platform Logo ve Renk Sistemi

### Logo Management
```typescript
getSourceLogo(type: string | undefined): string {
  if (!type) return '/assets/images/logo.svg';

  const logoMap: { [key: string]: string } = {
    'YEMEKSEPETI': '/assets/images/yemek-sepeti.png',
    'TRENDYOL': '/assets/images/trendyollogo.png',
    'MIGROS': '/assets/images/migros-yemek.png',
    'GETIR': '/assets/images/getir.png'
  };

  const logo = logoMap[type.toUpperCase()];
  
  if (!logo) {
    console.warn(`⚠️ Bilinmeyen platform logosu: ${type}`);
    return '/assets/images/logo.svg';
  }

  return logo;
}

getSourceClass(type: string | undefined): string {
  if (!type) return 'text-gray-600 dark:text-gray-400';

  const classMap: { [key: string]: string } = {
    'YEMEKSEPETI': 'text-blue-600 dark:text-blue-400',
    'TRENDYOL': 'text-orange-600 dark:text-orange-400',
    'MIGROS': 'text-green-600 dark:text-green-400',
    'GETIR': 'text-purple-600 dark:text-purple-400'
  };

  return classMap[type.toUpperCase()] || 'text-gray-600 dark:text-gray-400';
}

private getSourceText(type: string): string {
  const sourceMap: { [key: string]: string } = {
    'YEMEKSEPETI': 'YemekSepeti',
    'TRENDYOL': 'Trendyol',
    'MIGROS': 'Migros',
    'GETIR': 'Getir'
  };

  return sourceMap[type.toUpperCase()] || type;
}
```

## 🔄 Platform-Specific Background Sync

### Trendyol Sync Detayları
```typescript
// EntegreSiparisService içinde
private performTrendyolSync(): void {
  if (!this.currentStoreId || this.trendyolSyncInProgress) {
    return;
  }

  this.trendyolSyncInProgress = true;
  
  // URL oluştur
  const syncUrl = `${this.trendyolSyncUrl}/api/trendyol-orders/sync/${this.currentStoreId}?packageStatuses=${this.packageStatuses}`;

  console.log(`🍊 Trendyol sync başlatılıyor: ${this.currentStoreId}`);
  console.log(`🌐 URL: ${syncUrl}`);

  // Timeout
  const timeoutId = setTimeout(() => {
    if (this.trendyolSyncInProgress) {
      console.warn('⏰ Trendyol sync timeout (30s)');
      this.trendyolSyncInProgress = false;
    }
  }, 30000);

  // API request
  this.http.post(syncUrl, {}, { headers: this.getAuthHeaders() }).subscribe({
    next: (response: any) => {
      clearTimeout(timeoutId);
      console.log(`✅ Trendyol sync başarılı: ${this.currentStoreId}`, {
        responseType: typeof response,
        hasData: !!response?.data,
        orderCount: response?.data?.length || 0
      });
      this.trendyolSyncInProgress = false;
    },
    error: (error: any) => {
      clearTimeout(timeoutId);
      console.warn(`⚠️ Trendyol sync hatası: ${this.currentStoreId}`, {
        status: error.status,
        message: error.message,
        url: syncUrl
      });
      this.trendyolSyncInProgress = false;
    }
  });
}
```

### Trendyol İade Sync
```typescript
private performTrendyolRefundSync(): void {
  if (!this.currentStoreId || this.trendyolRefundSyncInProgress) {
    return;
  }

  this.trendyolRefundSyncInProgress = true;

  // Son 48 saati kapsayan tarih aralığı
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setHours(startDate.getHours() - 48);

  const createdEndDate = endDate.getTime();
  const createdStartDate = startDate.getTime();

  // URL oluştur
  const refundUrl = `${this.trendyolSyncUrl}/api/trendyol-orders-diger/${this.currentStoreId}/iades?size=100&storeId=${this.trendyolSaticiId}&createdStartDate=${createdStartDate}&createdEndDate=${createdEndDate}`;

  console.log(`🔄 Trendyol refund sync başlatılıyor: ${this.currentStoreId}`);
  console.log(`📅 Tarih aralığı: ${startDate.toISOString()} - ${endDate.toISOString()}`);
  console.log(`🌐 URL: ${refundUrl}`);

  // Timeout (iadeler daha uzun sürebilir)
  const timeoutId = setTimeout(() => {
    if (this.trendyolRefundSyncInProgress) {
      console.warn('⏰ Trendyol refund sync timeout (60s)');
      this.trendyolRefundSyncInProgress = false;
    }
  }, 60000);

  // API request
  this.http.get(refundUrl, { headers: this.getAuthHeaders() }).subscribe({
    next: (response: any) => {
      clearTimeout(timeoutId);
      console.log(`✅ Trendyol refund sync başarılı: ${this.currentStoreId}`, {
        refundCount: response?.data?.length || 0,
        dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
      });
      this.trendyolRefundSyncInProgress = false;
    },
    error: (error: any) => {
      clearTimeout(timeoutId);
      console.warn(`⚠️ Trendyol refund sync hatası: ${this.currentStoreId}`, error);
      this.trendyolRefundSyncInProgress = false;
    }
  });
}
```

### YemekSepeti İade Sync
```typescript
private performYemeksepetiRefundSync(): void {
  if (!this.currentStoreId || this.yemeksepetiRefundSyncInProgress) {
    return;
  }

  this.yemeksepetiRefundSyncInProgress = true;

  // Sabit parametrelerle URL
  const refundUrl = `${this.trendyolSyncUrl}/api/yemeksepetideliveryhero/siparisRaporu?status=cancelled&pastNumberOfHours=24`;

  console.log(`🍽️ YemekSepeti refund sync başlatılıyor: ${this.currentStoreId}`);
  console.log(`🌐 URL: ${refundUrl}`);

  // Timeout
  const timeoutId = setTimeout(() => {
    if (this.yemeksepetiRefundSyncInProgress) {
      console.warn('⏰ YemekSepeti refund sync timeout (60s)');
      this.yemeksepetiRefundSyncInProgress = false;
    }
  }, 60000);

  // API request
  this.http.get(refundUrl, { headers: this.getAuthHeaders() }).subscribe({
    next: (response: any) => {
      clearTimeout(timeoutId);
      console.log(`✅ YemekSepeti refund sync başarılı: ${this.currentStoreId}`, {
        cancelledOrderCount: response?.data?.length || 0
      });
      this.yemeksepetiRefundSyncInProgress = false;
    },
    error: (error: any) => {
      clearTimeout(timeoutId);
      console.warn(`⚠️ YemekSepeti refund sync hatası: ${this.currentStoreId}`, error);
      this.yemeksepetiRefundSyncInProgress = false;
    }
  });
}
```

## 🎯 Platform-Specific Helper Methods

### Ürün Adı Alma
```typescript
getProductName(product: any): string {
  if (!product?.name) {
    console.warn('⚠️ Ürün adı eksik:', product);
    return 'Ürün Adı Bilinmiyor';
  }

  // Çoklu dil desteği
  if (typeof product.name === 'object') {
    return product.name.tr || product.name.en || 'Ürün Adı Bilinmiyor';
  }
  
  return product.name || 'Ürün Adı Bilinmiyor';
}

getProductQuantity(product: any): number {
  if (!product) return 0;
  
  // Farklı quantity field'ları
  if (product.count !== undefined) return Number(product.count) || 0;
  if (product.amount !== undefined) return Number(product.amount) || 0;
  if (product.quantity !== undefined) return Number(product.quantity) || 0;
  
  return 1; // Varsayılan
}
```

### Ödeme Tipi İşleme
```typescript
getPaymentType(order: Order): string {
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
      console.warn(`⚠️ Ödeme tipi bulunamadı (${order.type}):`, this.getOrderId(order));
      paymentType = 'Ödeme Tipi Bilinmiyor';
    }

  } catch (error) {
    console.error(`❌ Ödeme tipi alma hatası (${order.type}):`, error);
    paymentType = 'Ödeme Tipi Hatası';
  }

  return paymentType;
}
```

## 📱 Platform Navigation

### Eşleştirme Sayfalarına Yönlendirme
```typescript
goToMapping(type: string): void {
  console.log(`🔗 ${type} eşleştirme sayfasına yönlendiriliyor...`);
  
  const routeMap: { [key: string]: string } = {
    'GETIR': '/apps/getirentegrasyon',
    'YEMEKSEPETI': '/apps/yemeksepetientegrasyon',
    'TRENDYOL': '/apps/trendyolentegrasyon',
    'MIGROS': '/apps/migrosentegrasyon'
  };

  const route = routeMap[type.toUpperCase()];
  
  if (route) {
    // Desktop uygulamasında external link olarak aç
    if (typeof window !== 'undefined' && window.electronAPI) {
      const fullUrl = `${environment.baseappurl}${route}`;
      window.electronAPI.openExternal?.(fullUrl);
      
      this.notificationService.showNotification(
        `${type} eşleştirme sayfası tarayıcıda açılıyor`,
        'info',
        'top-end'
      );
    } else {
      // Web versiyonunda normal navigation
      this.router.navigate([route]);
    }
  } else {
    console.error(`❌ Bilinmeyen platform için route: ${type}`);
    this.notificationService.showNotification(
      `${type} için eşleştirme sayfası bulunamadı`,
      'error',
      'top-end'
    );
  }
}
```

## 🔍 Gelişmiş Sipariş Arama ve Filtreleme

### Arama Sistemi
```typescript
searchTerm: string = '';
searchResults: Order[] = [];

searchOrders(term: string): void {
  this.searchTerm = term.toLowerCase().trim();
  
  if (!this.searchTerm) {
    this.searchResults = [];
    this.filteredOrders = [...this.orders];
    return;
  }

  console.log(`🔍 Sipariş aranıyor: "${this.searchTerm}"`);

  this.searchResults = this.orders.filter(order => {
    const searchableFields = [
      this.getOrderId(order),
      this.getCustomerName(order),
      this.getCustomerPhone(order),
      order.type,
      this.getStatusText(order.status),
      this.getOrderType(order),
      this.getPaymentType(order),
      ...this.getProducts(order).map(p => this.getProductName(p))
    ].map(field => field.toLowerCase());

    const matches = searchableFields.some(field => 
      field.includes(this.searchTerm)
    );

    return matches;
  });

  this.filteredOrders = this.searchResults;
  
  console.log(`📊 Arama sonucu: ${this.searchResults.length} sipariş bulundu`);
}
```

### Gelişmiş Filtreleme
```typescript
advancedFilters = {
  platform: 'ALL',
  status: 'ALL',
  orderType: 'ALL',
  paymentType: 'ALL',
  dateRange: {
    start: null as Date | null,
    end: null as Date | null
  },
  amountRange: {
    min: null as number | null,
    max: null as number | null
  },
  hasMapping: 'ALL', // 'ALL', 'MAPPED', 'UNMAPPED'
  isNew: 'ALL' // 'ALL', 'NEW', 'OLD'
};

applyAdvancedFilters(): void {
  console.log('🔍 Gelişmiş filtreler uygulanıyor:', this.advancedFilters);
  
  let filtered = [...this.orders];

  // Platform filtresi
  if (this.advancedFilters.platform !== 'ALL') {
    filtered = filtered.filter(order => order.type === this.advancedFilters.platform);
  }

  // Status filtresi
  if (this.advancedFilters.status !== 'ALL') {
    filtered = filtered.filter(order => 
      order.status?.toString().toLowerCase() === this.advancedFilters.status.toLowerCase()
    );
  }

  // Tarih aralığı filtresi
  if (this.advancedFilters.dateRange.start && this.advancedFilters.dateRange.end) {
    const startTime = this.advancedFilters.dateRange.start.getTime();
    const endTime = this.advancedFilters.dateRange.end.getTime();
    
    filtered = filtered.filter(order => {
      const orderTime = new Date(order.createdAt).getTime();
      return orderTime >= startTime && orderTime <= endTime;
    });
  }

  // Tutar aralığı filtresi
  if (this.advancedFilters.amountRange.min !== null || this.advancedFilters.amountRange.max !== null) {
    filtered = filtered.filter(order => {
      const amount = this.getOrderAmount(order);
      const minOk = this.advancedFilters.amountRange.min === null || amount >= this.advancedFilters.amountRange.min;
      const maxOk = this.advancedFilters.amountRange.max === null || amount <= this.advancedFilters.amountRange.max;
      return minOk && maxOk;
    });
  }

  // Eşleştirme filtresi
  if (this.advancedFilters.hasMapping !== 'ALL') {
    filtered = filtered.filter(order => {
      const hasMapping = !this.hasAnyMapping(order);
      return this.advancedFilters.hasMapping === 'MAPPED' ? hasMapping : !hasMapping;
    });
  }

  // Yeni sipariş filtresi
  if (this.advancedFilters.isNew !== 'ALL') {
    filtered = filtered.filter(order => {
      const isNew = this.isNewOrder(order);
      return this.advancedFilters.isNew === 'NEW' ? isNew : !isNew;
    });
  }

  this.filteredOrders = filtered;
  
  console.log(`📊 Gelişmiş filtreleme sonucu: ${filtered.length}/${this.orders.length} sipariş`);
}

resetAdvancedFilters(): void {
  this.advancedFilters = {
    platform: 'ALL',
    status: 'ALL',
    orderType: 'ALL',
    paymentType: 'ALL',
    dateRange: { start: null, end: null },
    amountRange: { min: null, max: null },
    hasMapping: 'ALL',
    isNew: 'ALL'
  };
  
  this.filteredOrders = [...this.orders];
  console.log('🔄 Filtreler sıfırlandı');
}
```

## 📊 İstatistik ve Raporlama

### Real-time İstatistikler
```typescript
getOrderStatistics(): {
  total: number;
  byPlatform: { [key: string]: number };
  byStatus: { [key: string]: number };
  byOrderType: { [key: string]: number };
  newOrders: number;
  totalAmount: number;
  avgAmount: number;
  lastUpdate: string;
} {
  const stats = {
    total: this.orders.length,
    byPlatform: { TRENDYOL: 0, YEMEKSEPETI: 0, MIGROS: 0, GETIR: 0 },
    byStatus: {} as { [key: string]: number },
    byOrderType: {} as { [key: string]: number },
    newOrders: 0,
    totalAmount: 0,
    avgAmount: 0,
    lastUpdate: new Date().toLocaleString('tr-TR')
  };

  this.orders.forEach(order => {
    // Platform istatistiği
    if (order.type in stats.byPlatform) {
      stats.byPlatform[order.type]++;
    }

    // Status istatistiği
    const status = this.getStatusText(order.status);
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // Order type istatistiği
    const orderType = this.getOrderType(order);
    if (orderType) {
      stats.byOrderType[orderType] = (stats.byOrderType[orderType] || 0) + 1;
    }

    // Yeni sipariş sayısı
    if (this.isNewOrder(order)) {
      stats.newOrders++;
    }

    // Tutar hesaplama
    const amount = this.getOrderAmount(order);
    stats.totalAmount += amount;
  });

  // Ortalama tutar
  stats.avgAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

  return stats;
}

generateDailyReport(): string {
  const stats = this.getOrderStatistics();
  const selectedMagaza = this.stores.find(s => s._id === this.selectedStore);
  
  const report = `
📊 EasyRest Entegre Siparişler - Günlük Rapor
📅 Tarih: ${new Date().toLocaleDateString('tr-TR')}
🏪 Mağaza: ${selectedMagaza?.magazaAdi || 'Bilinmiyor'}

📈 GENEL İSTATİSTİKLER:
• Toplam Sipariş: ${stats.total}
• Yeni Sipariş: ${stats.newOrders}
• Toplam Tutar: ${this.formatPrice(stats.totalAmount)} ₺
• Ortalama Tutar: ${this.formatPrice(stats.avgAmount)} ₺

🛒 PLATFORM DAĞILIMI:
• Trendyol: ${stats.byPlatform.TRENDYOL}
• YemekSepeti: ${stats.byPlatform.YEMEKSEPETI}
• Migros: ${stats.byPlatform.MIGROS}
• Getir: ${stats.byPlatform.GETIR}

📋 DURUM DAĞILIMI:
${Object.entries(stats.byStatus).map(([status, count]) => `• ${status}: ${count}`).join('\n')}

🚚 SİPARİŞ TİPİ DAĞILIMI:
${Object.entries(stats.byOrderType).map(([type, count]) => `• ${type}: ${count}`).join('\n')}

🔄 SİSTEM DURUMU:
• Otomatik Onay: ${this.isAutoApproveEnabled ? 'Açık' : 'Kapalı'}
• Ses Bildirimleri: ${this.isSoundEnabled ? 'Açık' : 'Kapalı'}
• Trendyol Sync: ${this.isTrendyolSyncRunning ? 'Aktif' : 'Kapalı'}
• Trendyol İade Sync: ${this.isTrendyolRefundSyncRunning ? 'Aktif' : 'Kapalı'}
• YemekSepeti İade Sync: ${this.isYemeksepetiRefundSyncRunning ? 'Aktif' : 'Kapalı'}

📱 UYGULAMA BİLGİLERİ:
• Son Güncelleme: ${stats.lastUpdate}
• Backend: ${environment.baseappurl}
• Version: 1.0.0
`;

  return report;
}
```

Bu dosyada **4 platform entegrasyonunun tamamen detaylı** algoritmaları var! 

**Sıradaki dosyalar:**
- `05-TERMAL-YAZDIRMA-SISTEMI.md` (HTML generator, printer communication)
- `06-UI-ANIMATIONS-STYLES.md` (CSS animations, responsive design)
- `07-ELECTRON-DESKTOP-FEATURES.md` (Tray, shortcuts, auto-updater)
- `08-ERROR-HANDLING-MONITORING.md` (Comprehensive error management)
- `09-BUILD-DEPLOY-CICD.md` (GitHub Actions, auto-release)

Devam edeyim mi? 🚀 Her dosya 50-100KB detaylı içerik!
