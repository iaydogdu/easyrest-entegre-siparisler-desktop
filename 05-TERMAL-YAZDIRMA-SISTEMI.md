# 🖨️ Termal Yazdırma Sistemi - TAMAMEN DETAYLI

## 🎯 Termal Yazdırma Mimarisi

### Yazdırma İş Akışı
```typescript
printToThermalPrinter(order: Order): void {
  if (!order) {
    console.error('❌ printToThermalPrinter: Sipariş null');
    return;
  }

  const orderId = this.getOrderId(order);
  console.log(`🖨️ Termal yazdırma başlatılıyor: ${orderId} (${order.type})`);

  try {
    // 1. Platform-specific debug info
    this.logPlatformSpecificInfo(order);

    // 2. HTML içeriği oluştur
    const htmlContent = this.generateThermalHTML(order);
    
    // 3. HTML validation
    if (!htmlContent || htmlContent.length < 100) {
      throw new Error('HTML içeriği çok kısa veya boş');
    }

    // 4. Printer API'sine gönder
    this.sendToPrinter(htmlContent, orderId);

  } catch (error) {
    console.error(`❌ Termal yazdırma hazırlık hatası: ${orderId}`, error);
    this.notificationService.showNotification(
      `Termal yazdırma hazırlığında hata: ${error.message}`,
      'error',
      'top-end'
    );
  }
}

private logPlatformSpecificInfo(order: Order): void {
  const orderId = this.getOrderId(order);
  
  console.log(`📋 ${order.type} sipariş yazdırma bilgileri:`, {
    orderId,
    customerName: this.getCustomerName(order),
    customerPhone: this.getCustomerPhone(order),
    orderType: this.getOrderType(order),
    amount: this.getOrderAmount(order),
    productCount: this.getProducts(order).length,
    hasAddress: !!this.getDeliveryAddress(order).address,
    paymentType: this.getPaymentType(order)
  });

  // Platform-specific logs
  switch (order.type) {
    case 'YEMEKSEPETI':
      console.log('🍽️ YemekSepeti yazdırma detayları:', {
        shortCode: order.rawData.shortCode,
        expeditionType: order.rawData.expeditionType,
        products: order.rawData.products?.length || 0,
        selectedToppings: order.rawData.products?.reduce((total, p) => 
          total + (p.selectedToppings?.length || 0), 0) || 0
      });
      break;

    case 'GETIR':
      console.log('🟣 Getir yazdırma detayları:', {
        confirmationId: order.rawData.confirmationId,
        isScheduled: order.rawData.isScheduled,
        scheduledDate: order.rawData.scheduledDate,
        deliveryType: order.rawData.deliveryType,
        products: order.rawData.products?.length || 0
      });
      break;

    case 'TRENDYOL':
      console.log('🍊 Trendyol yazdırma detayları:', {
        orderNumber: order.rawData.orderNumber,
        packageStatus: order.rawData.packageStatus,
        deliveryType: order.rawData.deliveryType,
        lines: order.rawData.lines?.length || 0,
        totalModifiers: order.rawData.lines?.reduce((total, line) => 
          total + (line.modifierProducts?.length || 0), 0) || 0
      });
      break;

    case 'MIGROS':
      console.log('🟢 Migros yazdırma detayları:', {
        orderId: order.rawData.orderId,
        platformConfirmationId: order.rawData.platformConfirmationId,
        deliveryProvider: order.rawData.deliveryProvider,
        items: order.rawData.items?.length || 0,
        totalOptions: order.rawData.items?.reduce((total, item) => 
          total + (item.options?.length || 0), 0) || 0
      });
      break;
  }
}
```

### HTML Generator Sistemi
```typescript
private generateThermalHTML(order: Order): string {
  console.log(`📄 HTML içeriği oluşturuluyor: ${this.getOrderId(order)}`);

  // Temel bilgileri al
  const orderInfo = this.extractOrderInfo(order);
  const customerInfo = this.extractCustomerInfo(order);
  const productsHTML = this.generateProductsHTML(order);
  const summaryInfo = this.extractSummaryInfo(order);

  // HTML template
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sipariş #${orderInfo.orderId}</title>
${this.getThermalCSS()}
</head>
<body>
${this.generateHeaderHTML(orderInfo)}
${this.generateCustomerHTML(customerInfo)}
${this.generateProductsSection(productsHTML)}
${this.generateSummaryHTML(summaryInfo)}
${this.generateFooterHTML()}
</body>
</html>`;

  // HTML validation
  this.validateHTML(html, order);
  
  return html;
}

private extractOrderInfo(order: Order): any {
  return {
    orderId: this.getOrderId(order),
    platform: order.type,
    platformName: this.getSourceText(order.type),
    status: this.getStatusText(order.status),
    orderType: this.getOrderType(order),
    createdAt: this.formatDate(order.createdAt),
    isNew: this.isNewOrder(order),
    isScheduled: order.type === 'GETIR' && order.rawData?.isScheduled,
    scheduledDate: order.rawData?.scheduledDate ? this.formatDate(order.rawData.scheduledDate) : null,
    logo: this.getSourceLogo(order.type)
  };
}

private extractCustomerInfo(order: Order): any {
  const address = this.getDeliveryAddress(order);
  
  return {
    name: this.getCustomerName(order),
    phone: this.getCustomerPhone(order),
    address: address.address || '',
    doorNo: address.doorNo || '',
    floor: address.floor || '',
    description: address.description || '',
    fullAddress: address.fullAddress || ''
  };
}

private extractSummaryInfo(order: Order): any {
  return {
    amount: this.formatPrice(this.getOrderAmount(order)),
    paymentType: this.getPaymentType(order),
    paymentMapping: this.getPaymentMappingName(order),
    hasPaymentMapping: this.hasPaymentMapping(order)
  };
}
```

### CSS Styling
```typescript
private getThermalCSS(): string {
  return `<style>
/* Termal yazıcı için optimize edilmiş CSS */
body {
  font-family: 'Courier New', monospace;
  font-size: 18px;
  max-width: 72mm;
  margin: 0 auto;
  padding: 0;
  line-height: 1.2;
  color: #000;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 8px;
}

th, td {
  text-align: left;
  padding: 2px 4px;
  font-size: 16px;
  vertical-align: top;
}

.header {
  text-align: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #000;
}

.order-id {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 4px;
}

.order-source {
  font-size: 18px;
  font-weight: bold;
  margin: 4px 0;
}

.order-type {
  font-size: 16px;
  font-weight: normal;
  margin: 2px 0;
}

.section-title {
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #000;
  margin: 12px 0 6px;
  padding-bottom: 2px;
}

.product-name {
  font-size: 16px;
  font-weight: bold;
}

.product-option {
  font-size: 14px;
  padding-left: 8px;
  color: #333;
}

.product-unwanted {
  font-size: 14px;
  padding-left: 8px;
  color: #666;
  text-decoration: line-through;
}

.quantity {
  text-align: center;
  font-weight: bold;
  font-size: 16px;
}

.price {
  text-align: right;
  font-weight: bold;
  font-size: 16px;
}

.total-row {
  font-weight: bold;
  font-size: 18px;
  padding: 4px 0;
}

.logo-container {
  text-align: center;
  margin-bottom: 8px;
}

.logo {
  max-width: 60px;
  max-height: 30px;
  display: inline-block;
}

.new-order {
  color: #000;
  font-weight: bold;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border: 2px solid #000;
}

.customer-info {
  font-size: 15px;
}

.address-info {
  font-size: 14px;
  max-width: 100%;
  word-wrap: break-word;
}

.footer {
  text-align: center;
  font-size: 12px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid #000;
}

/* Scheduled order styling */
.scheduled-order {
  background-color: #ffffcc;
  padding: 4px;
  border: 1px solid #ffcc00;
  margin: 4px 0;
}

/* Print-specific */
@media print {
  body { margin: 0; }
  .no-print { display: none; }
}
</style>`;
}
```

### Header HTML Generator
```typescript
private generateHeaderHTML(orderInfo: any): string {
  const newOrderBadge = orderInfo.isNew ? '<div class="new-order">🆕 YENİ SİPARİŞ</div>' : '';
  const scheduledBadge = orderInfo.isScheduled ? 
    `<div class="scheduled-order">⏰ İleri Tarihli: ${orderInfo.scheduledDate}</div>` : '';

  return `
<div class="logo-container">
  <img src="${window.location.origin}${orderInfo.logo}" alt="${orderInfo.platformName}" class="logo">
</div>

<div class="header">
  <div class="order-id">Sipariş #${orderInfo.orderId}</div>
  ${newOrderBadge}
  <div class="order-source">${orderInfo.platformName}</div>
  <div class="order-type">${orderInfo.orderType}</div>
  <div style="font-size:14px; margin-top:4px;">${orderInfo.createdAt}</div>
  <div style="font-size:14px;">${orderInfo.status}</div>
  ${scheduledBadge}
</div>`;
}

private generateCustomerHTML(customerInfo: any): string {
  let html = '<div class="section-title">MÜŞTERİ BİLGİLERİ</div><table class="customer-info">';
  
  if (customerInfo.name) {
    html += `<tr><td style="width:30%"><strong>Ad Soyad:</strong></td><td>${customerInfo.name}</td></tr>`;
  }
  
  if (customerInfo.phone) {
    html += `<tr><td><strong>Telefon:</strong></td><td>${customerInfo.phone}</td></tr>`;
  }
  
  if (customerInfo.address) {
    html += `<tr><td><strong>Adres:</strong></td><td class="address-info">${customerInfo.address}</td></tr>`;
  }
  
  if (customerInfo.doorNo) {
    html += `<tr><td><strong>Kapı No:</strong></td><td>${customerInfo.doorNo}</td></tr>`;
  }
  
  if (customerInfo.floor) {
    html += `<tr><td><strong>Kat:</strong></td><td>${customerInfo.floor}</td></tr>`;
  }
  
  if (customerInfo.description) {
    html += `<tr><td><strong>Not:</strong></td><td class="address-info">${customerInfo.description}</td></tr>`;
  }

  html += '</table>';
  return html;
}
```

### Ürün HTML Generator
```typescript
private generateProductsHTML(order: Order): string {
  const products = this.getProducts(order);
  
  if (products.length === 0) {
    return `
    <tr>
      <td colspan="3" style="text-align: center; padding: 10px; color: red;">
        ⚠️ Ürün bilgisi bulunamadı!
      </td>
    </tr>`;
  }

  console.log(`📦 ${products.length} ürün için HTML oluşturuluyor (${order.type})`);

  switch (order.type) {
    case 'YEMEKSEPETI':
      return this.generateYemekSepetiProductsHTML(products);
      
    case 'GETIR':
      return this.generateGetirProductsHTML(products);
      
    case 'TRENDYOL':
      return this.generateTrendyolProductsHTML(products);
      
    case 'MIGROS':
      return this.generateMigrosProductsHTML(products);
      
    default:
      return this.generateGenericProductsHTML(products);
  }
}

private generateYemekSepetiProductsHTML(products: any[]): string {
  let html = '';

  products.forEach((product, index) => {
    try {
      const productName = product.name || 'Ürün Adı Bilinmiyor';
      const quantity = product.quantity || 1;
      const price = (product.price || 0).toFixed(2);

      html += `
      <tr>
        <td class="product-name">${productName}</td>
        <td class="quantity">${quantity}</td>
        <td class="price">${price} ₺</td>
      </tr>`;

      // Selected toppings
      if (product.selectedToppings && Array.isArray(product.selectedToppings)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';
        
        product.selectedToppings.forEach((topping: any) => {
          if (topping && topping.name) {
            const toppingPrice = topping.price && topping.price > 0 ? ` (+${topping.price.toFixed(2)} ₺)` : '';
            html += `<div class="product-option">• ${topping.name}${toppingPrice}</div>`;

            // Children
            if (topping.children && Array.isArray(topping.children)) {
              topping.children.forEach((child: any) => {
                if (child && child.name) {
                  const childPrice = child.price && child.price > 0 ? ` (+${child.price.toFixed(2)} ₺)` : '';
                  const isUnwanted = child.name.toLowerCase().includes('istemiyorum');
                  const cssClass = isUnwanted ? 'product-unwanted' : 'product-option';
                  const symbol = isUnwanted ? '⊖' : '→';
                  
                  html += `<div class="${cssClass}" style="padding-left: 20px;">${symbol} ${child.name}${childPrice}</div>`;
                }
              });
            }
          }
        });
        
        html += '</td></tr>';
      }

      // Regular toppings (fallback)
      if (product.toppings && Array.isArray(product.toppings)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';
        
        product.toppings.forEach((topping: any) => {
          if (topping && topping.name) {
            html += `<div class="product-option">• ${topping.name}</div>`;
          }
        });
        
        html += '</td></tr>';
      }

    } catch (error) {
      console.error(`❌ YemekSepeti ürün HTML hatası (${index}):`, error, product);
      html += `<tr><td colspan="3" style="color: red;">Ürün ${index + 1}: HTML oluşturma hatası</td></tr>`;
    }
  });

  return html;
}

private generateGetirProductsHTML(products: any[]): string {
  let html = '';

  products.forEach((product, index) => {
    try {
      const productName = product.name || 'Ürün Adı Bilinmiyor';
      const quantity = product.quantity || 1;
      const price = (product.price || 0).toFixed(2);

      html += `
      <tr>
        <td class="product-name">${productName}</td>
        <td class="quantity">${quantity}</td>
        <td class="price">${price} ₺</td>
      </tr>`;

      // Options
      if (product.options && Array.isArray(product.options)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';

        product.options.forEach((category: any) => {
          const categoryName = category.name?.tr || category.name?.en || '';
          if (categoryName) {
            html += `<div style="font-weight: bold; margin-top: 6px;">${categoryName}:</div>`;
          }

          if (category.options && Array.isArray(category.options)) {
            category.options.forEach((option: any) => {
              const optionName = option.name?.tr || option.name?.en || '';
              const optionPrice = option.price && option.price > 0 ? ` (+${option.price.toFixed(2)} ₺)` : '';
              
              html += `<div class="product-option">• ${optionName}${optionPrice}</div>`;

              // Eşleştirme bilgisi
              if (option.mapping?.localProduct) {
                html += `<div style="padding-left: 20px; color: #666; font-size: 12px;">→ ${option.mapping.localProduct.urunAdi}</div>`;
              }

              // Option categories (soslar, çıkarılacak malzemeler)
              if (option.optionCategories && Array.isArray(option.optionCategories)) {
                option.optionCategories.forEach((optionCategory: any) => {
                  const subCategoryName = optionCategory.name?.tr || optionCategory.name?.en || '';
                  const isUnwantedCategory = subCategoryName.toLowerCase().includes('çıkarılacak') || 
                                           subCategoryName.toLowerCase().includes('remove');

                  if (subCategoryName && optionCategory.options && optionCategory.options.length > 0) {
                    html += `<div style="padding-left: 20px; margin-top: 4px; font-weight: bold; ${isUnwantedCategory ? 'color: #e53935;' : ''}">${subCategoryName}:</div>`;

                    optionCategory.options.forEach((subOption: any) => {
                      const subOptionName = subOption.name?.tr || subOption.name?.en || '';
                      const subPrice = subOption.price && subOption.price > 0 ? ` (+${subOption.price.toFixed(2)} ₺)` : '';
                      
                      if (isUnwantedCategory) {
                        html += `<div class="product-unwanted" style="padding-left: 30px;">⊖ ${subOptionName}</div>`;
                      } else {
                        html += `<div class="product-option" style="padding-left: 30px;">• ${subOptionName}${subPrice}</div>`;
                      }
                    });
                  }
                });
              }
            });
          }
        });

        html += '</td></tr>';
      }

    } catch (error) {
      console.error(`❌ Getir ürün HTML hatası (${index}):`, error, product);
      html += `<tr><td colspan="3" style="color: red;">Ürün ${index + 1}: HTML oluşturma hatası</td></tr>`;
    }
  });

  return html;
}

private generateTrendyolProductsHTML(products: any[]): string {
  let html = '';

  products.forEach((product, index) => {
    try {
      const productName = product.name || 'Ürün Adı Bilinmiyor';
      const quantity = product.quantity || 1;
      const price = (product.price || 0).toFixed(2);

      html += `
      <tr>
        <td class="product-name">${productName}</td>
        <td class="quantity">${quantity}</td>
        <td class="price">${price} ₺</td>
      </tr>`;

      // Modifier products
      if (product.modifierProducts && Array.isArray(product.modifierProducts)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';

        product.modifierProducts.forEach((modifier: any) => {
          const modifierName = modifier.name || '';
          const modifierPrice = modifier.price && modifier.price > 0 ? ` (+${modifier.price.toFixed(2)} ₺)` : '';
          const isUnwanted = modifierName.toLowerCase().includes('istemiyorum');

          if (isUnwanted) {
            html += `<div class="product-unwanted">⊖ ${modifierName}</div>`;
          } else {
            html += `<div class="product-option">• ${modifierName}${modifierPrice}</div>`;

            // Eşleştirme bilgisi
            if (modifier.mapping?.eslestirilenUrun) {
              html += `<div style="padding-left: 20px; color: #666; font-size: 12px;">→ ${modifier.mapping.eslestirilenUrun.urunAdi}</div>`;
            }
          }

          // Alt modifiers
          if (modifier.modifierProducts && Array.isArray(modifier.modifierProducts)) {
            modifier.modifierProducts.forEach((subMod: any) => {
              const subName = subMod.name || '';
              const subPrice = subMod.price && subMod.price > 0 ? ` (+${subMod.price.toFixed(2)} ₺)` : '';
              const subIsUnwanted = subName.toLowerCase().includes('istemiyorum');

              if (subIsUnwanted) {
                html += `<div class="product-unwanted" style="padding-left: 20px;">⊖ ${subName}</div>`;
              } else {
                html += `<div class="product-option" style="padding-left: 20px;">→ ${subName}${subPrice}</div>`;
              }
            });
          }
        });

        html += '</td></tr>';
      }

      // Promotions
      if (product.promotions && Array.isArray(product.promotions)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';
        html += '<div style="margin-top: 4px; font-weight: bold; color: #4CAF50;">Promosyonlar:</div>';

        product.promotions.forEach((promo: any) => {
          html += `<div class="product-option" style="color: #4CAF50;">• ${promo.description || ''}</div>`;
        });

        html += '</td></tr>';
      }

    } catch (error) {
      console.error(`❌ Trendyol ürün HTML hatası (${index}):`, error, product);
      html += `<tr><td colspan="3" style="color: red;">Ürün ${index + 1}: HTML oluşturma hatası</td></tr>`;
    }
  });

  return html;
}

private generateMigrosProductsHTML(products: any[]): string {
  let html = '';

  products.forEach((product, index) => {
    try {
      const productName = product.name || 'Ürün Adı Bilinmiyor';
      const quantity = product.amount || product.quantity || 1;
      const price = (product.price || 0).toFixed(2);

      html += `
      <tr>
        <td class="product-name">${productName}</td>
        <td class="quantity">${quantity}</td>
        <td class="price">${price} ₺</td>
      </tr>`;

      // Options
      if (product.options && Array.isArray(product.options)) {
        html += '<tr><td colspan="3" style="padding-left: 12px;">';

        product.options.forEach((option: any) => {
          html += `<div style="font-weight: bold; margin-top: 4px;">${option.headerName}:</div>`;
          html += `<div class="product-option">• ${option.itemNames}</div>`;

          // Eşleştirme
          if (option.mapping?.localProduct) {
            html += `<div style="padding-left: 20px; color: #4CAF50; font-size: 12px;">→ ${option.mapping.localProduct.urunAdi}</div>`;
          }

          // Fiyat
          if (option.primaryDiscountedPrice > 0) {
            html += `<div style="padding-left: 20px; color: #888; font-size: 12px;">(+${option.primaryDiscountedPriceText})</div>`;
          }

          // SubOptions
          if (option.subOptions && Array.isArray(option.subOptions)) {
            option.subOptions.forEach((subOption: any) => {
              html += `<div style="padding-left: 20px; font-weight: bold; margin-top: 2px;">${subOption.headerName}:</div>`;
              
              const subItemName = subOption.itemNames || '';
              const normalizedName = subItemName.toLowerCase()
                .replace(/i̇/g, 'i')
                .replace(/ı/g, 'i')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '');

              const hasEkstra = normalizedName.includes("ekstra");
              const hasIstemiyorum = normalizedName.includes("istemiyorum");
              
              // "Ekstra İstemiyorum" kombinasyonunu atla
              if (!(hasEkstra && hasIstemiyorum)) {
                const isUnwanted = hasIstemiyorum || subOption.optionType === 'INGREDIENT';
                const symbol = isUnwanted ? '⊖' : '•';
                const cssClass = isUnwanted ? 'product-unwanted' : 'product-option';
                
                html += `<div class="${cssClass}" style="padding-left: 30px;">${symbol} ${subItemName}</div>`;

                // Eşleştirme (sadece normal items için)
                if (!isUnwanted && subOption.mapping?.localProduct) {
                  html += `<div style="padding-left: 40px; color: #4CAF50; font-size: 11px;">→ ${subOption.mapping.localProduct.urunAdi}</div>`;
                }

                // Fiyat
                if (subOption.primaryDiscountedPrice > 0) {
                  html += `<div style="padding-left: 40px; color: #888; font-size: 11px;">(+${subOption.primaryDiscountedPriceText})</div>`;
                }
              }
            });
          }
        });

        html += '</td></tr>';
      }

    } catch (error) {
      console.error(`❌ Migros ürün HTML hatası (${index}):`, error, product);
      html += `<tr><td colspan="3" style="color: red;">Ürün ${index + 1}: HTML oluşturma hatası</td></tr>`;
    }
  });

  return html;
}
```

### Products Section Generator
```typescript
private generateProductsSection(productsHTML: string): string {
  return `
<div class="section-title">ÜRÜNLER</div>
<table>
<tr>
  <th style="width:50%; font-size:16px; border-bottom:1px solid #000;">Ürün</th>
  <th style="width:20%; font-size:16px; text-align:center; border-bottom:1px solid #000;">Adet</th>
  <th style="width:30%; font-size:16px; text-align:right; border-bottom:1px solid #000;">Fiyat</th>
</tr>
${productsHTML}
</table>`;
}

private generateSummaryHTML(summaryInfo: any): string {
  const paymentMappingInfo = summaryInfo.hasPaymentMapping ? 
    `<tr><td class="total-row">Ödeme Eşleştirme: ✅ ${summaryInfo.paymentMapping}</td></tr>` :
    `<tr><td class="total-row" style="color: #e53935;">Ödeme Eşleştirme: ❌ Eksik</td></tr>`;

  return `
<table style="margin-top:12px; border-top:2px solid #000;">
<tr><td class="total-row">Ödeme Tipi: ${summaryInfo.paymentType}</td></tr>
${paymentMappingInfo}
<tr><td class="total-row" style="font-size:20px; padding:8px 0; border-top:1px solid #000;">
  <strong>TOPLAM: ${summaryInfo.amount} ₺</strong>
</td></tr>
</table>`;
}

private generateFooterHTML(): string {
  const now = new Date();
  const timestamp = now.toLocaleString('tr-TR');
  
  return `
<div class="footer">
  <div>Bu fiş ${timestamp} tarihinde oluşturulmuştur.</div>
  <div style="margin-top: 4px;">EasyRest Desktop v1.0.0</div>
  <div style="margin-top: 2px; font-size: 10px;">Termal Yazdırma Sistemi</div>
</div>`;
}
```

## 🔗 Printer Communication

### Printer API İletişimi
```typescript
private sendToPrinter(htmlContent: string, orderId: string): void {
  const printerUrl = 'http://localhost:41411/api/receipt/print';
  
  console.log(`🖨️ Printer API'sine gönderiliyor: ${orderId}`);
  console.log(`🌐 Printer URL: ${printerUrl}`);
  console.log(`📄 HTML boyutu: ${htmlContent.length} karakter`);

  // Request headers
  const headers = new HttpHeaders({
    'Content-Type': 'text/html;charset=UTF-8',
    'X-Order-ID': orderId,
    'X-Platform': order.type,
    'X-Timestamp': new Date().toISOString()
  });

  // Timeout tracking
  const startTime = Date.now();
  
  this.http.post(printerUrl, htmlContent, {
    headers,
    responseType: 'text',
    timeout: 30000 // 30 saniye timeout
  }).subscribe({
    next: (response) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Termal yazdırma başarılı: ${orderId} (${duration}ms)`, {
        response: response?.toString().substring(0, 100) + '...',
        duration: `${duration}ms`
      });
      
      this.notificationService.showNotification(
        `Termal yazdırma başarılı: ${orderId}`,
        'success',
        'top-end'
      );

      // Başarılı yazdırma sesi
      this.playSound('success');
    },
    error: (error) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.error(`❌ Termal yazdırma hatası: ${orderId} (${duration}ms)`, {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: printerUrl
      });

      // Hata tipine göre mesaj
      let errorMessage = 'Termal yazdırma hatası';
      
      if (error.status === 0) {
        errorMessage = 'Termal yazıcı servisi çalışmıyor (Port 41411)';
      } else if (error.status === 404) {
        errorMessage = 'Termal yazıcı API endpoint\'i bulunamadı';
      } else if (error.status === 500) {
        errorMessage = 'Termal yazıcı servisi hatası';
      } else if (error.name === 'TimeoutError') {
        errorMessage = 'Termal yazıcı zaman aşımı (30s)';
      }

      this.notificationService.showNotification(
        `${errorMessage}: ${orderId}`,
        'error',
        'top-end'
      );

      // Hata sesi
      this.playSound('error');
    }
  });
}
```

### HTML Validation
```typescript
private validateHTML(html: string, order: Order): void {
  const orderId = this.getOrderId(order);
  
  // Temel validasyonlar
  const validations = [
    { check: html.length > 100, error: 'HTML içeriği çok kısa' },
    { check: html.includes('<!DOCTYPE html>'), error: 'DOCTYPE eksik' },
    { check: html.includes('<html>'), error: 'HTML tag eksik' },
    { check: html.includes('<head>'), error: 'HEAD tag eksik' },
    { check: html.includes('<body>'), error: 'BODY tag eksik' },
    { check: html.includes(orderId), error: 'Sipariş ID HTML\'de bulunamadı' },
    { check: html.includes('ÜRÜNLER'), error: 'Ürünler bölümü eksik' },
    { check: html.includes('TOPLAM'), error: 'Toplam bölümü eksik' }
  ];

  const errors = validations.filter(v => !v.check).map(v => v.error);
  
  if (errors.length > 0) {
    console.error(`❌ HTML validation hataları: ${orderId}`, errors);
    throw new Error(`HTML validation hatası: ${errors.join(', ')}`);
  }

  // Boyut kontrolü
  if (html.length > 50000) { // 50KB
    console.warn(`⚠️ HTML çok büyük: ${orderId} (${html.length} karakter)`);
  }

  // Karakter encoding kontrolü
  const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(html);
  if (hasInvalidChars) {
    console.warn(`⚠️ HTML'de geçersiz karakterler: ${orderId}`);
  }

  console.log(`✅ HTML validation başarılı: ${orderId} (${html.length} karakter)`);
}
```

## 📋 Hesap Fişi Yazdırma

### Hesap Fişi İş Akışı
```typescript
printAccountReceipt(order: Order, newOrderId?: string): void {
  if (!order) {
    console.error('❌ printAccountReceipt: Sipariş null');
    return;
  }

  const orderId = this.getOrderId(order);
  console.log(`📋 Hesap fişi yazdırma başlatılıyor: ${orderId}`);

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
    default:
      console.error(`❌ Bilinmeyen platform için hesap fişi: ${order.type}`);
      return;
  }

  if (!platformOrderId) {
    console.error(`❌ Platform order ID bulunamadı: ${orderId}`);
    this.notificationService.showNotification(
      'Hesap fişi için sipariş ID bulunamadı',
      'error',
      'top-end'
    );
    return;
  }

  console.log(`📋 Platform order ID: ${platformOrderId}`);

  // 1. Backend'den local order ID'yi al
  this.entegreSiparisService.getOrderById(platformOrderId, order.type).subscribe({
    next: (response) => {
      const localOrderId = response?.id || response?.newOrderId || response?.orderId || newOrderId;
      
      if (!localOrderId) {
        console.error(`❌ Local order ID bulunamadı: ${orderId}`, response);
        this.notificationService.showNotification(
          'Hesap fişi bilgileri alınamadı',
          'error',
          'top-end'
        );
        return;
      }

      console.log(`📋 Local order ID: ${localOrderId}`);

      // 2. Hesap fişi HTML'ini al
      this.getAccountReceiptHTML(localOrderId, orderId);
    },
    error: (error) => {
      console.error(`❌ Order ID alma hatası: ${orderId}`, error);
      
      if (error?.error?.message && error.error.message.includes('yetkiniz yok')) {
        const errorMessage = error.error.message.split('#')[1] || 'Yetki hatası';
        this.notificationService.showNotification(
          `Bu işlem için yetkiniz yok: ${errorMessage}`,
          'danger',
          'top-end'
        );
      } else {
        this.notificationService.showNotification(
          'Hesap fişi bilgileri alınırken hata oluştu',
          'error',
          'top-end'
        );
      }
    }
  });
}

private getAccountReceiptHTML(localOrderId: string, originalOrderId: string): void {
  console.log(`📄 Hesap fişi HTML alınıyor: ${localOrderId}`);

  this.orderService.getOrderHesapFisi(localOrderId).subscribe({
    next: (htmlContent) => {
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('Hesap fişi HTML içeriği geçersiz');
      }

      console.log(`📄 Hesap fişi HTML alındı: ${htmlContent.length} karakter`);

      // 3. Hesap fişini yazdır
      this.printAccountReceiptHTML(htmlContent, originalOrderId);
    },
    error: (error) => {
      console.error(`❌ Hesap fişi HTML alma hatası: ${localOrderId}`, error);
      this.notificationService.showNotification(
        'Hesap fişi HTML\'i alınırken hata oluştu',
        'error',
        'top-end'
      );
    }
  });
}

private printAccountReceiptHTML(htmlContent: string, orderId: string): void {
  console.log(`🖨️ Hesap fişi yazdırılıyor: ${orderId}`);

  this.orderService.posthesapFisi(htmlContent).subscribe({
    next: (printerResponse) => {
      console.log(`✅ Hesap fişi yazdırma başarılı: ${orderId}`, printerResponse);
      
      this.notificationService.showNotification(
        `Hesap fişi yazdırıldı: ${orderId}`,
        'success',
        'top-end'
      );

      // Başarılı yazdırma sesi
      this.playSound('success');
    },
    error: (error) => {
      console.error(`❌ Hesap fişi yazdırma hatası: ${orderId}`, error);
      
      this.notificationService.showNotification(
        `Hesap fişi yazdırma hatası: ${orderId}`,
        'error',
        'top-end'
      );

      // Hata sesi
      this.playSound('error');
    }
  });
}
```

## 📤 JSON Export Sistemi

### Sipariş JSON Export
```typescript
copyOrderJson(order: Order): void {
  if (!order || !order.rawData) {
    console.error('❌ copyOrderJson: Geçersiz sipariş verisi');
    this.notificationService.showNotification(
      'Sipariş verisi bulunamadı',
      'error',
      'top-end'
    );
    return;
  }

  const orderId = this.getOrderId(order);
  console.log(`📤 JSON export başlatılıyor: ${orderId}`);

  try {
    // Detaylı sipariş objesi oluştur
    const exportData = {
      // Meta bilgiler
      exportInfo: {
        orderId,
        platform: order.type,
        exportDate: new Date().toISOString(),
        exportedBy: this.authService.getKullaniciAdi(),
        storeId: this.selectedStore,
        storeName: this.stores.find(s => s._id === this.selectedStore)?.magazaAdi
      },
      
      // Sipariş bilgileri
      orderInfo: {
        id: orderId,
        type: order.type,
        status: order.status,
        statusText: this.getStatusText(order.status),
        createdAt: order.createdAt,
        orderType: this.getOrderType(order),
        amount: this.getOrderAmount(order),
        isNew: this.isNewOrder(order)
      },

      // Müşteri bilgileri
      customerInfo: {
        name: this.getCustomerName(order),
        phone: this.getCustomerPhone(order),
        address: this.getDeliveryAddress(order)
      },

      // Ürün bilgileri
      products: this.getProducts(order).map(product => ({
        name: this.getProductName(product),
        quantity: this.getProductQuantity(product),
        price: product.price || 0,
        mapping: product.mapping,
        // Platform-specific data
        ...(order.type === 'TRENDYOL' && product.modifierProducts ? {
          modifiers: product.modifierProducts
        } : {}),
        ...(order.type === 'YEMEKSEPETI' && product.selectedToppings ? {
          toppings: product.selectedToppings
        } : {}),
        ...(order.type === 'GETIR' && product.options ? {
          options: product.options
        } : {}),
        ...(order.type === 'MIGROS' && product.options ? {
          options: product.options
        } : {})
      })),

      // Ödeme bilgileri
      paymentInfo: {
        type: this.getPaymentType(order),
        mapping: this.getPaymentMappingName(order),
        hasMapping: this.hasPaymentMapping(order)
      },

      // Eşleştirme durumu
      mappingStatus: {
        hasAnyMissing: this.hasAnyMapping(order),
        canAutoApprove: this.canAutoApproveOrder(order),
        mappingDetails: this.getMappingDetails(order)
      },

      // Ham veri
      rawData: order.rawData
    };

    // JSON string'e çevir
    const jsonString = JSON.stringify(exportData, null, 2);
    
    console.log(`📄 JSON oluşturuldu: ${jsonString.length} karakter`);

    // Clipboard'a kopyala
    this.copyToClipboard(jsonString);
    
    this.notificationService.showNotification(
      `JSON export başarılı: ${orderId} (${jsonString.length} karakter)`,
      'success',
      'top-end'
    );

  } catch (error) {
    console.error(`❌ JSON export hatası: ${orderId}`, error);
    this.notificationService.showNotification(
      `JSON export hatası: ${error.message}`,
      'error',
      'top-end'
    );
  }
}

private getMappingDetails(order: Order): any {
  const products = this.getProducts(order);
  const mappingDetails = {
    totalProducts: products.length,
    mappedProducts: 0,
    unmappedProducts: 0,
    unmappedItems: [] as string[]
  };

  products.forEach(product => {
    const productName = this.getProductName(product);
    const hasMainMapping = order.type === 'TRENDYOL' ? 
      !!product.mapping?.eslestirilenUrun : 
      !!product.mapping?.localProduct;

    if (hasMainMapping) {
      mappingDetails.mappedProducts++;
    } else {
      mappingDetails.unmappedProducts++;
      mappingDetails.unmappedItems.push(productName);
    }

    // Sub-items mapping check
    // ... (platform-specific sub-mapping checks)
  });

  return mappingDetails;
}
```

### Clipboard Operations
```typescript
private copyToClipboard(text: string): void {
  try {
    // Modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('✅ Modern clipboard API ile kopyalandı');
      }).catch(error => {
        console.error('❌ Modern clipboard hatası:', error);
        this.fallbackCopyMethod(text);
      });
    } else {
      // Fallback method
      this.fallbackCopyMethod(text);
    }
  } catch (error) {
    console.error('❌ Clipboard kopyalama hatası:', error);
    this.fallbackCopyMethod(text);
  }
}

private fallbackCopyMethod(text: string): void {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, 99999); // Mobile support
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (successful) {
      console.log('✅ Fallback clipboard ile kopyalandı');
    } else {
      throw new Error('execCommand copy başarısız');
    }
  } catch (error) {
    console.error('❌ Fallback clipboard hatası:', error);
    
    // Son çare: Manual copy instruction
    this.notificationService.showNotification(
      'Kopyalama başarısız. Lütfen manuel olarak seçip kopyalayın.',
      'warning',
      'top-end'
    );
  }
}
```

## 🖨️ Print Preview Sistemi

### Print Preview Window
```typescript
printOrder(order: Order): void {
  if (!order) return;

  const orderId = this.getOrderId(order);
  console.log(`🖨️ Print preview açılıyor: ${orderId}`);

  try {
    // Print window oluştur
    const printWindow = window.open('', '_blank', 'width=800,height=900,scrollbars=yes');
    
    if (!printWindow) {
      throw new Error('Print penceresi açılamadı (popup blocker?)');
    }

    // HTML içeriğini al (print preview için)
    const content = this.generatePrintPreviewHTML(order);

    // İçeriği yaz
    printWindow.document.write(content);
    printWindow.document.close();

    // Print dialog'u aç
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    console.log(`✅ Print preview açıldı: ${orderId}`);

  } catch (error) {
    console.error(`❌ Print preview hatası: ${orderId}`, error);
    this.notificationService.showNotification(
      `Print preview hatası: ${error.message}`,
      'error',
      'top-end'
    );
  }
}

private generatePrintPreviewHTML(order: Order): string {
  const thermalHTML = this.generateThermalHTML(order);
  
  // Print preview için CSS ekle
  const previewCSS = `
  <style>
    body { 
      font-family: Arial, sans-serif; 
      max-width: 400px; 
      margin: 20px auto; 
      padding: 20px;
      background: #f5f5f5;
    }
    .print-preview-container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .print-actions {
      text-align: center;
      margin-bottom: 20px;
      padding: 15px;
      background: #e3f2fd;
      border-radius: 8px;
    }
    .print-btn {
      background: #2196f3;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin: 0 5px;
    }
    .print-btn:hover {
      background: #1976d2;
    }
    @media print {
      .print-actions { display: none; }
      body { background: white; margin: 0; }
      .print-preview-container { box-shadow: none; margin: 0; padding: 0; }
    }
  </style>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Print Preview - Sipariş #${this.getOrderId(order)}</title>
${previewCSS}
</head>
<body>
<div class="print-actions">
  <h3>Sipariş Print Preview</h3>
  <button class="print-btn" onclick="window.print()">🖨️ Yazdır</button>
  <button class="print-btn" onclick="window.close()">❌ Kapat</button>
</div>
<div class="print-preview-container">
${thermalHTML.replace('<!DOCTYPE html>', '').replace(/<html>.*?<body>/s, '').replace('</body></html>', '')}
</div>
</body>
</html>`;
}
```

## 🔧 Printer Service Integration

### Printer Health Check
```typescript
private checkPrinterHealth(): Promise<boolean> {
  return new Promise((resolve) => {
    const healthUrl = 'http://localhost:41411/api/health';
    
    console.log('🔍 Printer health check başlatılıyor...');

    fetch(healthUrl, {
      method: 'GET',
      timeout: 5000
    }).then(response => {
      const isHealthy = response.ok;
      console.log(`${isHealthy ? '✅' : '❌'} Printer health: ${response.status}`);
      resolve(isHealthy);
    }).catch(error => {
      console.error('❌ Printer health check hatası:', error);
      resolve(false);
    });
  });
}

private async ensurePrinterReady(): Promise<boolean> {
  const isHealthy = await this.checkPrinterHealth();
  
  if (!isHealthy) {
    this.notificationService.showNotification(
      'Termal yazıcı servisi çalışmıyor. Lütfen yazıcı uygulamasını başlatın (Port 41411)',
      'warning',
      'top-end',
      10000
    );
    
    return false;
  }

  return true;
}
```

## 📊 Yazdırma İstatistikleri

### Print Metrics Tracking
```typescript
private printMetrics = {
  totalPrints: 0,
  successfulPrints: 0,
  failedPrints: 0,
  avgPrintTime: 0,
  printsByPlatform: {
    TRENDYOL: 0,
    YEMEKSEPETI: 0,
    MIGROS: 0,
    GETIR: 0
  },
  lastPrintTime: null as Date | null,
  errors: [] as string[]
};

private trackPrintMetrics(orderId: string, platform: string, success: boolean, duration: number, error?: string): void {
  this.printMetrics.totalPrints++;
  
  if (success) {
    this.printMetrics.successfulPrints++;
    this.printMetrics.printsByPlatform[platform as keyof typeof this.printMetrics.printsByPlatform]++;
    
    // Ortalama süre hesapla
    this.printMetrics.avgPrintTime = (this.printMetrics.avgPrintTime * (this.printMetrics.successfulPrints - 1) + duration) / this.printMetrics.successfulPrints;
  } else {
    this.printMetrics.failedPrints++;
    if (error) {
      this.printMetrics.errors.push(`${orderId}: ${error}`);
      
      // Son 10 hatayı tut
      if (this.printMetrics.errors.length > 10) {
        this.printMetrics.errors = this.printMetrics.errors.slice(-10);
      }
    }
  }

  this.printMetrics.lastPrintTime = new Date();

  console.log('📊 Print metrics güncellendi:', {
    successRate: `${((this.printMetrics.successfulPrints / this.printMetrics.totalPrints) * 100).toFixed(1)}%`,
    avgTime: `${this.printMetrics.avgPrintTime.toFixed(0)}ms`,
    recentErrors: this.printMetrics.errors.slice(-3)
  });
}

getPrintStatistics(): string {
  const successRate = this.printMetrics.totalPrints > 0 ? 
    ((this.printMetrics.successfulPrints / this.printMetrics.totalPrints) * 100).toFixed(1) : '0';

  return `
📊 YAZDIRMA İSTATİSTİKLERİ:
• Toplam Yazdırma: ${this.printMetrics.totalPrints}
• Başarılı: ${this.printMetrics.successfulPrints}
• Başarısız: ${this.printMetrics.failedPrints}
• Başarı Oranı: ${successRate}%
• Ortalama Süre: ${this.printMetrics.avgPrintTime.toFixed(0)}ms

📈 PLATFORM DAĞILIMI:
• Trendyol: ${this.printMetrics.printsByPlatform.TRENDYOL}
• YemekSepeti: ${this.printMetrics.printsByPlatform.YEMEKSEPETI}
• Migros: ${this.printMetrics.printsByPlatform.MIGROS}
• Getir: ${this.printMetrics.printsByPlatform.GETIR}

🕐 Son Yazdırma: ${this.printMetrics.lastPrintTime?.toLocaleString('tr-TR') || 'Henüz yazdırma yok'}

${this.printMetrics.errors.length > 0 ? `
❌ SON HATALAR:
${this.printMetrics.errors.slice(-5).map(error => `• ${error}`).join('\n')}
` : '✅ Son 10 yazdırmada hata yok'}
`;
}
```

Bu dosyada **termal yazdırma sisteminin tamamen detaylı** algoritması var! 

**Sıradaki dosyalar:**
- `06-UI-ANIMATIONS-STYLES.md` (CSS animations, responsive design, dark mode)
- `07-ELECTRON-DESKTOP-FEATURES.md` (Tray, shortcuts, auto-updater, window management)
- `08-ERROR-HANDLING-MONITORING.md` (Comprehensive error management, logging)
- `09-PERFORMANCE-OPTIMIZATION.md` (Memory management, performance tracking)
- `10-BUILD-DEPLOY-CICD.md` (GitHub Actions, auto-release, versioning)

Her dosya **50-100KB** detaylı içerik! Devam edeyim mi? 🚀
