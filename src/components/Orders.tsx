import React, { useState, useEffect, useCallback } from 'react';
import { OrderService, Order } from '../services/orders';
import { AuthService } from '../services/auth';

interface OrdersProps {
  onLogout: () => void;
}

const Orders: React.FC<OrdersProps> = ({ onLogout }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFilter, setCurrentFilter] = useState('ALL');
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [stores, setStores] = useState<any[]>([]);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [storeSearchTerm, setStoreSearchTerm] = useState('');
  const [logoCache, setLogoCache] = useState<{ [key: string]: string }>({});
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());
  const [approvedOrders, setApprovedOrders] = useState<Set<string>>(new Set());
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  // Summary hesaplama
  const summary = {
    total: filteredOrders.length,
    byType: {
      yemeksepeti: filteredOrders.filter(o => o.type === 'YEMEKSEPETI').length,
      trendyol: filteredOrders.filter(o => o.type === 'TRENDYOL').length,
      migros: filteredOrders.filter(o => o.type === 'MIGROS').length,
      getir: filteredOrders.filter(o => o.type === 'GETIR').length,
    }
  };

  // Initialize
  useEffect(() => {
    const initStores = AuthService.getStores();
    setStores(initStores);
    
    const savedStore = AuthService.getSelectedStore();
    if (savedStore) {
      setSelectedStore(savedStore);
    } else if (initStores.length > 0) {
      setSelectedStore(initStores[0]._id);
      AuthService.setSelectedStore(initStores[0]._id);
    }

    const savedSound = localStorage.getItem('soundEnabled') === 'true';
    setSoundEnabled(savedSound);
    
    const savedAutoApprove = localStorage.getItem('autoApproveEnabled') === 'true';
    setAutoApproveEnabled(savedAutoApprove);

    // Ana Angular projeden: Auto-updater test (basitleştirilmiş)
    console.log('🔄 Auto-updater sistemi aktif (Electron main process)');
    
    // ElectronAPI debug
    if (window.electronAPI) {
      console.log('🔍 ElectronAPI methods:', Object.keys(window.electronAPI));
      console.log('🔍 checkForUpdates mevcut mu?', typeof (window.electronAPI as any).checkForUpdates);
    }

    // Manual auto-updater test (development)
    if (process.env.NODE_ENV === 'development') {
      setTimeout(() => {
        console.log('🧪 Manual auto-updater test - GitHub releases kontrol ediliyor...');
        console.log('📋 Current app version: v1.0.2');
        console.log('🔗 GitHub releases: https://github.com/iaydogdu/easyrest-entegre-siparisler-desktop/releases');
      }, 5000);
    }
  }, []);

  // Load orders when store changes
  useEffect(() => {
    if (selectedStore) {
      loadOrders();
      
      // Ana Angular projeden: Background sync sistemlerini başlat (sadece production'da)
      if (process.env.NODE_ENV === 'production') {
        console.log('🚀 Background sync sistemleri başlatılıyor...', selectedStore);
        OrderService.startBackgroundSyncs(selectedStore);
      } else {
        console.log('🔧 Development mode: Background sync disabled');
      }
    }
    
    // Cleanup function - component unmount olduğunda sync'leri durdur
    return () => {
      OrderService.stopBackgroundSyncs();
    };
  }, [selectedStore]);

  // Auto refresh every 10 seconds
  useEffect(() => {
    if (!selectedStore) return;

    const interval = setInterval(() => {
      loadOrders(true); // Silent refresh
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedStore]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.store-selector')) {
        setShowStoreDropdown(false);
      }
    };

    if (showStoreDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showStoreDropdown]);

  const loadOrders = async (silent = false) => {
    if (!selectedStore) return;
    
    if (!silent) setLoading(true);
    
    try {
      const response = await OrderService.getOrders(selectedStore);
      
      if (response.success) {
        console.log('📦 Orders API Response:', {
          success: response.success,
          orderCount: response.data.orders?.length || 0,
          orders: response.data.orders
        });

        // Her siparişi debug et
        response.data.orders.forEach((order, index) => {
          console.log(`📋 Sipariş ${index + 1} Debug:`, {
            orderId: OrderService.getOrderId(order),
            type: order.type,
            platform: order.platform,
            customerName: OrderService.getCustomerName(order),
            products: OrderService.getProducts(order),
            firstProductName: OrderService.getProducts(order)[0] ? OrderService.getProductName(OrderService.getProducts(order)[0]) : 'Yok',
            amount: OrderService.getOrderAmount(order),
            paymentType: OrderService.getPaymentType(order),
            logo: OrderService.getPlatformLogo(order.type),
            rawDataKeys: order.rawData ? Object.keys(order.rawData) : []
          });
        });

        const previousOrderIds = new Set(orders.map(o => OrderService.getOrderId(o)));
        
        // Siparişleri sırala: Yeni siparişler üstte, sonra tarihe göre
        const sortedOrders = response.data.orders.sort((a, b) => {
          // 1. Öncelik: Yeni siparişler en üstte
          const isNewA = OrderService.isOrderReceived(a);
          const isNewB = OrderService.isOrderReceived(b);

          if (isNewA && !isNewB) return -1;
          if (!isNewA && isNewB) return 1;

          // 2. Tarih sıralaması (yeni olan üstte)
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();

          return dateB - dateA;
        });

        setOrders(sortedOrders);
        
        // Check for new orders
        const currentOrderIds = new Set(response.data.orders.map(o => OrderService.getOrderId(o)));
        const newOrderIds = new Set(
          Array.from(currentOrderIds).filter(id => !previousOrderIds.has(id))
        );
        
        if (newOrderIds.size > 0 && !silent) {
          setNewOrders(newOrderIds);
          console.log(`🆕 ${newOrderIds.size} yeni sipariş tespit edildi`);
          
          // Play sound if enabled
          if (soundEnabled) {
            playSound();
          }
        }
        
        console.log(`✅ ${response.data.orders.length} sipariş yüklendi ve debug edildi`);
      }
    } catch (error) {
      console.error('❌ Sipariş yükleme hatası:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Filter orders
  const filterOrders = useCallback((filter: string) => {
    setCurrentFilter(filter);
    
    if (filter === 'ALL') {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter(order => order.type === filter));
    }
  }, [orders]);

  useEffect(() => {
    filterOrders(currentFilter);
  }, [orders, currentFilter, filterOrders]);

  // Store management
  const handleStoreChange = (store: any) => {
    console.log('🏪 Mağaza değiştiriliyor:', store.magazaAdi);
    setSelectedStore(store._id);
    setShowStoreDropdown(false);
    setStoreSearchTerm('');
    AuthService.setSelectedStore(store._id);
    
    // Siparişleri yeniden yükle
    setTimeout(() => {
      loadOrders();
    }, 100);
  };

  const getFilteredStores = () => {
    if (!storeSearchTerm.trim()) return stores;
    
    const searchTerm = storeSearchTerm.toLowerCase();
    return stores.filter(store => 
      store.magazaAdi?.toLowerCase().includes(searchTerm) ||
      store.verilenmagazakodu?.toLowerCase().includes(searchTerm)
    );
  };

  const getSelectedStoreName = () => {
    const store = stores.find(s => s._id === selectedStore);
    return store ? store.magazaAdi : 'Mağaza Seçin';
  };

  // Ana Angular projeden: Gelişmiş ses sistemi
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundInterval, setSoundInterval] = useState<NodeJS.Timeout | null>(null);

  // Ses sistemi initialization
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🔊 Ses sistemi başlatılıyor...');
        // Electron desktop app için dynamic path
        const isElectron = window.electronAPI;
        let audioPath;
        if (isElectron && (window.electronAPI as any).getAssetPath) {
          // Electron'dan dynamic asset path al
          audioPath = await (window.electronAPI as any).getAssetPath('sounds/web.mp3');
        } else {
          // Web browser için absolute path
          audioPath = '/assets/sounds/web.mp3';
        }
        console.log('🔊 Ses dosyası path:', audioPath);
        const audioElement = new Audio(audioPath);
        audioElement.volume = 0.7;
        audioElement.preload = 'auto';
        
        audioElement.addEventListener('canplaythrough', () => {
          console.log('✅ Ses dosyası yüklendi: /assets/sounds/web.mp3');
          setAudio(audioElement);
        });
        
        audioElement.addEventListener('error', (error) => {
          console.error('❌ Ses dosyası hatası:', error);
        });
        
        audioElement.load();
      } catch (error) {
        console.error('❌ Ses sistemi başlatma hatası:', error);
      }
    };

    initializeAudio();
  }, []);

  const playSound = () => {
    if (!soundEnabled || !audio || isPlaying) return;

    try {
      console.log('🔊 Ses çalınıyor...');
      setIsPlaying(true);
      audio.currentTime = 0;
      
      audio.play().then(() => {
        console.log('✅ Ses başarıyla çalındı');
      }).catch(error => {
        console.error('❌ Ses çalma hatası:', error);
        setIsPlaying(false);
      });

      // Ses bittiğinde flag'i sıfırla
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
      }, { once: true });

    } catch (error) {
      console.error('❌ Ses çalma hatası:', error);
      setIsPlaying(false);
    }
  };

  const startSoundLoop = () => {
    if (soundInterval) return;

    console.log('🔄 Ses loop başlatılıyor...');
    
    const interval = setInterval(() => {
      if (soundEnabled && !autoApproveEnabled) {
        // Onaylanmamış sipariş var mı kontrol et
        const hasUnconfirmedOrders = filteredOrders.some(order => isNewOrder(order));
        
        if (hasUnconfirmedOrders) {
          playSound();
        } else {
          stopSoundLoop();
        }
      } else {
        stopSoundLoop();
      }
    }, 5000); // 5 saniyede bir tekrarla

    setSoundInterval(interval);
  };

  const stopSoundLoop = () => {
    if (soundInterval) {
      console.log('🔇 Ses loop durduruluyor...');
      clearInterval(soundInterval);
      setSoundInterval(null);
    }
  };

  // Yeni sipariş geldiğinde ses çal
  useEffect(() => {
    const hasNewOrders = filteredOrders.some(order => isNewOrder(order));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔊 Ses kontrolü:', {
        hasNewOrders,
        soundEnabled,
        audioReady: !!audio,
        newOrderCount: filteredOrders.filter(order => isNewOrder(order)).length
      });
    }
    
    if (hasNewOrders && soundEnabled && audio) {
      console.log('🆕 Yeni sipariş tespit edildi, ses çalınıyor...');
      playSound();
      
      // Otomatik onay kapalıysa loop başlat
      if (!autoApproveEnabled) {
        startSoundLoop();
      }
    } else {
      stopSoundLoop();
    }
  }, [filteredOrders, soundEnabled, autoApproveEnabled, audio]);

  const toggleSound = () => {
    const newSoundState = !soundEnabled;
    setSoundEnabled(newSoundState);
    localStorage.setItem('soundEnabled', newSoundState.toString());
  };

  const toggleAutoApprove = () => {
    const newAutoApproveState = !autoApproveEnabled;
    setAutoApproveEnabled(newAutoApproveState);
    localStorage.setItem('autoApproveEnabled', newAutoApproveState.toString());
  };

  // Order actions
  const handleApproveOrder = async (order: Order) => {
    const success = await OrderService.approveOrder(order);
    if (success) {
      // Refresh orders
      loadOrders();
      setSelectedOrder(null);
    }
  };

  // Ana Angular projeden: Tam termal yazdırma sistemi
  const printToThermalPrinter = async (order: Order) => {
    if (!order) return;

    const orderId = OrderService.getOrderId(order);
    console.log(`🖨️ Termal yazdırma başlatılıyor: ${orderId} (${order.type})`);

    // Ana Angular projeden: Platform-specific debug
    if (order.type === 'YEMEKSEPETI') {
      console.log('YemekSepeti siparişi termal yazdırma:');
      console.log('Sipariş rawData:', order.rawData);
      console.log('Sipariş ürünleri:', order.rawData.products);
    } else if (order.type === 'MIGROS') {
      console.log('Migros siparişi termal yazdırma:');
      console.log('Sipariş rawData:', order.rawData);
      console.log('Sipariş ürünleri:', OrderService.getProducts(order));
      
      // Adres bilgileri kontrolü
      const addressInfo = OrderService.getDeliveryAddress(order);
      console.log('Müşteri adres bilgileri:', addressInfo);
      
      // Müşteri ve teslim bilgileri
      console.log('Müşteri adı:', OrderService.getCustomerName(order));
      console.log('Müşteri telefonu:', OrderService.getCustomerPhone(order));
      console.log('Teslimat tipi:', OrderService.getOrderType(order));
    } else if (order.type === 'GETIR') {
      console.log('Getir siparişi termal yazdırma:');
      console.log('Sipariş rawData:', order.rawData);
      
      // Ürün detaylarını kontrol et
      const products = OrderService.getProducts(order);
      console.log('Ürünler:', products);
      
      // Ürün seçimlerinde çıkarılacak malzemeleri kontrol et
      products.forEach(product => {
        if (product.options) {
          console.log(`"${OrderService.getProductName(product)}" için ürün seçimleri:`, product.options);
          
          product.options.forEach((category: any) => {
            if (category.options) {
              category.options.forEach((option: any) => {
                if (option.optionCategories) {
                  console.log(`"${option.name?.tr || ''}" için alt kategoriler:`, option.optionCategories);
                }
              });
            }
          });
        }
      });
    } else if (order.type === 'TRENDYOL') {
      console.log('Trendyol siparişi termal yazdırma:');
      console.log('Sipariş rawData:', order.rawData);
      console.log('Sipariş lines:', order.rawData.lines);
    }

    try {
      // Ana Angular projeden: Tam HTML içeriği oluştur
      const htmlContent = generateThermalHTML(order);
      
      // Yazdırma içeriğini kontrol et
      console.log('Termal yazdırma içeriği:', htmlContent);
      
      // Ana Angular projeden: Doğru termal yazıcı endpoint
      const response = await fetch('http://localhost:41411/api/receipt/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
        },
        body: htmlContent
      });

      if (response.ok) {
        const responseText = await response.text();
        console.log('✅ Termal yazıcı başarılı yanıt:', responseText);
        console.log(`🖨️ Termal yazdırma tamamlandı: ${orderId}`);
      } else {
        throw new Error(`Printer API error: ${response.status}`);
      }
    } catch (error) {
      console.error(`❌ Termal yazdırma hatası: ${orderId}`, error);
      console.log(`🚫 Yazdırma başarısız: ${orderId} - ${error}`);
    }
  };

  // Ana Angular projeden: Hesap fişi yazdırma (Adisyon)
  const printAccountReceipt = async (order: Order) => {
    if (!order) {
      console.error('❌ printAccountReceipt: Sipariş null');
      return;
    }

    const orderId = OrderService.getOrderId(order);
    console.log(`📋 Hesap fişi yazdırma başlatılıyor: ${orderId} (${order.type})`);

    try {
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
          console.error(`❌ Bilinmeyen platform için hesap fişi: ${order.type}`);
          return;
      }

      if (!platformOrderId) {
        console.error(`❌ Platform order ID bulunamadı: ${orderId}`);
        console.log(`🚫 Hesap fişi başarısız: ${orderId} - Platform ID yok`);
        return;
      }

      console.log(`📋 Platform order ID: ${platformOrderId}`);

      // Ana Angular projeden: 1. Backend'den local order ID'yi al
      const getOrderResponse = await fetch('https://api.easycorest.com:5555/api/banko/getOrderById', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          orderId: platformOrderId,
          type: order.type
        })
      });

      if (!getOrderResponse.ok) {
        throw new Error(`getOrderById API error: ${getOrderResponse.status}`);
      }

      const orderData = await getOrderResponse.json();
      const localOrderId = orderData?.id || orderData?.newOrderId || orderData?.orderId;
      
      if (!localOrderId) {
        console.error(`❌ Local order ID bulunamadı: ${orderId}`, orderData);
        console.log(`🚫 Hesap fişi başarısız: ${orderId} - Local ID yok`);
        return;
      }

      console.log(`📋 Local order ID: ${localOrderId}`);

      // Ana Angular projeden: 2. Hesap fişi HTML'ini al
      console.log(`📄 Hesap fişi HTML alınıyor: print-order/order/${localOrderId}`);
      const receiptResponse = await fetch(`https://api.easycorest.com:5555/api/print-order/order/${localOrderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!receiptResponse.ok) {
        throw new Error(`Receipt API error: ${receiptResponse.status}`);
      }

      const htmlContent = await receiptResponse.text();
      
      if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('Hesap fişi HTML içeriği geçersiz');
      }

      console.log(`📄 Hesap fişi HTML alındı: ${htmlContent.length} karakter`);

      // Ana Angular projeden: 3. Hesap fişini yazdır
      const printResponse = await fetch('http://localhost:41411/api/receipt/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
        },
        body: htmlContent
      });

      if (printResponse.ok) {
        const responseText = await printResponse.text();
        console.log('✅ Hesap fişi yazıcı başarılı yanıt:', responseText);
        console.log(`🖨️ Hesap fişi yazdırma tamamlandı: ${orderId}`);
      } else {
        throw new Error(`Print API error: ${printResponse.status}`);
      }

    } catch (error) {
      console.error(`❌ Hesap fişi yazdırma hatası: ${orderId}`, error);
      console.log(`🚫 Hesap fişi başarısız: ${orderId} - ${error}`);
    }
  };

  // JSON kopyala
  const copyOrderJson = (order: Order) => {
    const orderId = OrderService.getOrderId(order);
    console.log(`📤 JSON export: ${orderId}`);
    
    try {
      const jsonString = JSON.stringify(order, null, 2);
      navigator.clipboard.writeText(jsonString).then(() => {
        console.log('✅ JSON kopyalandı');
        alert(`JSON kopyalandı: ${orderId}`);
      }).catch(error => {
        console.error('❌ JSON kopyalama hatası:', error);
        alert(`JSON kopyalama hatası: ${error}`);
      });
    } catch (error) {
      console.error('❌ JSON export hatası:', error);
      alert(`JSON export hatası: ${error}`);
    }
  };

  // Ana Angular projeden: Tam termal HTML generator
  const generateThermalHTML = (order: Order): string => {
    const orderId = OrderService.getOrderId(order);
    const customerName = OrderService.getCustomerName(order);
    const customerPhone = OrderService.getCustomerPhone(order);
    const address = OrderService.getDeliveryAddress(order);
    const products = OrderService.getProducts(order);
    const totalAmount = OrderService.getOrderAmount(order);
    const orderType = OrderService.getOrderType(order);
    const paymentType = OrderService.getPaymentType(order);

    // Sipariş kaynağı adını al
    const orderSource = order.type === 'YEMEKSEPETI' ? 'YEMEK SEPETİ' :
      order.type === 'GETIR' ? 'GETİR' :
      order.type === 'TRENDYOL' ? 'TRENDYOL' :
      order.type === 'MIGROS' ? 'MİGROS' : order.type;

    // Müşteri notu
    let customerNote = '';
    if (order.type === 'TRENDYOL') {
      customerNote = order.rawData.customerNote || '';
    } else {
      customerNote = address.description || '';
    }

    // Platform-specific ürün HTML'i oluştur
    let productsHtml = '';
    
    if (order.type === 'YEMEKSEPETI') {
      productsHtml = products.map(product => {
        let productHtml = `
        <tr>
          <td class="product-name">${OrderService.getProductName(product)}</td>
          <td class="quantity">${OrderService.getProductQuantity(product)}</td>
          <td class="price">${(product.price || 0).toFixed(2)} ₺</td>
        </tr>`;

        // Ana Angular projeden: YemekSepeti Selected toppings
        if (product.selectedToppings && product.selectedToppings.length > 0) {
          productHtml += '<tr><td colspan="3" style="padding-left: 15px;">';
          product.selectedToppings.forEach((topping: any) => {
            if (topping && topping.name) {
              // Güvenli fiyat dönüşümü
              const toppingPriceNum = parseFloat(topping.price || 0);
              const toppingPrice = toppingPriceNum > 0 ? ` (+${toppingPriceNum.toFixed(2)} ₺)` : '';
              productHtml += `<div style="margin: 4px 0; color: #4CAF50; font-size: 16px;"><span style="font-weight: bold;">✓</span> ${topping.name}${toppingPrice}</div>`;
              
              // Ana Angular projeden: Children (alt seçenekler)
              if (topping.children && topping.children.length > 0) {
                topping.children.forEach((child: any) => {
                  if (child && child.name) {
                    // Güvenli fiyat dönüşümü
                    const childPriceNum = parseFloat(child.price || 0);
                    const childPrice = childPriceNum > 0 ? ` (+${childPriceNum.toFixed(2)} ₺)` : '';
                    const isUnwanted = child.name.toLowerCase().includes('istemiyorum');
                    const symbol = isUnwanted ? '✗' : '→';
                    const color = isUnwanted ? '#f44336' : '#4CAF50';
                    
                    productHtml += `<div style="padding-left: 20px; margin: 3px 0; color: ${color}; font-size: 15px;">
                      <span style="font-weight: bold;">${symbol}</span> ${child.name}${childPrice}
                    </div>`;
                  }
                });
              }
            }
          });
          productHtml += '</td></tr>';
        }

        return productHtml;
      }).join('');
    } else if (order.type === 'MIGROS') {
      // Ana Angular projeden: Migros ürün detayları
      productsHtml = products.map(product => {
        let productHtml = `
        <tr>
          <td class="product-name">${OrderService.getProductName(product)}</td>
          <td class="quantity">${OrderService.getProductQuantity(product)}</td>
          <td class="price">${(product.price || 0).toFixed(2)} ₺</td>
        </tr>`;

        // Ana Angular projeden: Migros Options
        if (product.options && product.options.length > 0) {
          productHtml += '<tr><td colspan="3" style="padding-left: 15px;">';
          
          product.options.forEach((option: any) => {
            if (option.headerName) {
              productHtml += `<div style="margin: 5px 0; font-weight: bold; color: #333; font-size: 16px;">${option.headerName}</div>`;
            }
            
            if (option.itemNames) {
              const priceNum = parseFloat(option.primaryDiscountedPrice || 0);
              const price = priceNum > 0 ? ` (+${(priceNum / 100).toFixed(2)} ₺)` : '';
              productHtml += `<div style="margin: 3px 0; padding-left: 10px; color: #4CAF50; font-size: 15px;"><span style="font-weight: bold;">✓</span> ${option.itemNames}${price}</div>`;
            }
            
            // Ana Angular projeden: Migros SubOptions (KRITIK!)
            if (option.subOptions && option.subOptions.length > 0) {
              option.subOptions.forEach((subOption: any) => {
                const isUnwanted = subOption.itemNames?.toLowerCase().includes('istemiyorum') || 
                                 subOption.optionType === 'INGREDIENT';
                const symbol = isUnwanted ? '✗' : '✓';
                const color = isUnwanted ? '#f44336' : '#4CAF50';
                const priceNum = parseFloat(subOption.primaryDiscountedPrice || 0);
                const price = priceNum > 0 ? ` (+${(priceNum / 100).toFixed(2)} ₺)` : '';
                
                productHtml += `<div style="margin: 3px 0; padding-left: 20px; color: ${color}; font-size: 14px;">
                  <span style="font-weight: bold;">${symbol}</span> ${subOption.headerName || ''}: ${subOption.itemNames || ''}${price}
                </div>`;
              });
            }
          });
          
          productHtml += '</td></tr>';
        }

        return productHtml;
      }).join('');
    } else if (order.type === 'TRENDYOL') {
      // Ana Angular projeden: Trendyol ürün detayları
      productsHtml = products.map(product => {
        let productHtml = `
        <tr>
          <td class="product-name">${OrderService.getProductName(product)}</td>
          <td class="quantity">${OrderService.getProductQuantity(product)}</td>
          <td class="price">${(product.price || 0).toFixed(2)} ₺</td>
        </tr>`;

        // Ana Angular projeden: Trendyol Modifier Products
        if (product.modifierProducts && product.modifierProducts.length > 0) {
          productHtml += '<tr><td colspan="3" style="padding-left: 15px;">';
          product.modifierProducts.forEach((modifier: any) => {
            const modifierName = modifier.name || '';
            const isUnwanted = modifierName.toLowerCase().includes('istemiyorum');
            const priceNum = parseFloat(modifier.price || 0);
            const price = priceNum > 0 ? ` (+${priceNum.toFixed(2)} ₺)` : '';
            
            if (isUnwanted) {
              productHtml += `<div style="margin: 3px 0; color: #f44336; text-decoration: line-through; font-size: 15px;">
                <span style="font-weight: bold;">⊖</span> ${modifierName}
              </div>`;
            } else {
              productHtml += `<div style="margin: 3px 0; color: #4CAF50; font-size: 15px;">
                <span style="font-weight: bold;">•</span> ${modifierName}${price}
              </div>`;
            }
            
            // Ana Angular projeden: SubModifiers (alt seçenekler)
            if (modifier.subModifiers && modifier.subModifiers.length > 0) {
              modifier.subModifiers.forEach((subModifier: any) => {
                const subName = subModifier.name || '';
                const subPriceNum = parseFloat(subModifier.price || 0);
                const subPrice = subPriceNum > 0 ? ` (+${subPriceNum.toFixed(2)} ₺)` : '';
                const isSubUnwanted = subName.toLowerCase().includes('istemiyorum');
                
                if (isSubUnwanted) {
                  productHtml += `<div style="padding-left: 20px; margin: 3px 0; color: #f44336; text-decoration: line-through; font-size: 14px;">
                    <span style="font-weight: bold;">⊖</span> ${subName}
                  </div>`;
                } else {
                  productHtml += `<div style="padding-left: 20px; margin: 3px 0; color: #666; font-size: 14px;">
                    <span style="font-weight: bold;">→</span> ${subName}${subPrice}
                  </div>`;
                }
              });
            }
          });
          productHtml += '</td></tr>';
        }

        return productHtml;
      }).join('');
    } else if (order.type === 'GETIR') {
      // Ana Angular projeden: Getir ürün detayları
      productsHtml = products.map(product => {
        let productHtml = `
        <tr>
          <td class="product-name">${OrderService.getProductName(product)}</td>
          <td class="quantity">${OrderService.getProductQuantity(product)}</td>
          <td class="price">${(product.price || 0).toFixed(2)} ₺</td>
        </tr>`;

        // Getir Options
        if (product.options && product.options.length > 0) {
          productHtml += '<tr><td colspan="3" style="padding-left: 15px;">';
          
          product.options.forEach((category: any) => {
            if (category.name) {
              productHtml += `<div style="margin: 4px 0; font-weight: bold; color: #333;">${category.name.tr || category.name.en || ''}</div>`;
            }
            
            if (category.options && category.options.length > 0) {
              category.options.forEach((option: any) => {
                const price = option.price > 0 ? ` (+${option.price.toFixed(2)} ₺)` : '';
                productHtml += `<div style="margin: 2px 0; padding-left: 10px; color: #4CAF50;">
                  <span style="font-weight: bold;">✓</span> ${option.name?.tr || option.name?.en || ''}${price}
                </div>`;
                
                // Option Categories (çıkarılacak malzemeler)
                if (option.optionCategories && option.optionCategories.length > 0) {
                  option.optionCategories.forEach((optCat: any) => {
                    if (optCat.options && optCat.options.length > 0) {
                      optCat.options.forEach((subOpt: any) => {
                        const isRemoved = subOpt.name?.tr?.toLowerCase().includes('çıkar') || 
                                         subOpt.name?.en?.toLowerCase().includes('remove');
                        const symbol = isRemoved ? '✗' : '✓';
                        const color = isRemoved ? '#f44336' : '#4CAF50';
                        const subPrice = subOpt.price > 0 ? ` (+${subOpt.price.toFixed(2)} ₺)` : '';
                        
                        productHtml += `<div style="padding-left: 20px; margin: 2px 0; color: ${color};">
                          <span style="font-weight: bold;">${symbol}</span> ${subOpt.name?.tr || subOpt.name?.en || ''}${subPrice}
                        </div>`;
                      });
                    }
                  });
                }
              });
            }
          });
          
          productHtml += '</td></tr>';
        }

        return productHtml;
      }).join('');
    } else {
      // Diğer platformlar için basit liste
      productsHtml = products.map(product => `
        <tr>
          <td class="product-name">${OrderService.getProductName(product)}</td>
          <td class="quantity">${OrderService.getProductQuantity(product)}</td>
          <td class="price">${(product.price || 0).toFixed(2)} ₺</td>
        </tr>
      `).join('');
    }

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Sipariş #${orderId}</title>
<style>
body { font-family: 'Courier New', monospace; font-size: 16px; max-width: 72mm; margin: 0 auto; padding: 8px; line-height: 1.5; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
th, td { text-align: left; padding: 4px 3px; font-size: 15px; vertical-align: top; }
.header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #000; }
.order-id { font-size: 24px; font-weight: bold; margin-bottom: 6px; }
.section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #000; margin: 15px 0 8px; padding-bottom: 3px; }
.product-name { font-size: 16px; font-weight: bold; }
.quantity { text-align: center; font-weight: bold; font-size: 16px; }
.price { text-align: right; font-weight: bold; font-size: 16px; }
.total-row { font-weight: bold; font-size: 16px; padding: 6px 0; }
.customer-info { font-size: 16px; }
.label { font-weight: bold; width: 30%; font-size: 16px; }
.customer-value { font-size: 16px; }
</style>
</head>
<body>

<div class="header">
  <div class="order-id">Sipariş #${orderId}</div>
  <div style="font-size: 18px; font-weight: bold;">${orderSource}</div>
  <div style="font-size: 16px;">${orderType}</div>
  <div style="font-size: 14px; margin-top: 4px;">${formatDate(order.createdAt)}</div>
</div>

<div class="section-title">Müşteri Bilgileri</div>
<table class="customer-info">
<tr><td class="label">Ad Soyad:</td><td class="customer-value">${customerName}</td></tr>
<tr><td class="label">Telefon:</td><td class="customer-value">${customerPhone}</td></tr>
${address.address ? `<tr><td class="label">Adres:</td><td class="customer-value">${address.address}</td></tr>` : ''}
${address.doorNo ? `<tr><td class="label">Kapı No:</td><td class="customer-value">${address.doorNo}</td></tr>` : ''}
${address.floor ? `<tr><td class="label">Kat:</td><td class="customer-value">${address.floor}</td></tr>` : ''}
${customerNote ? `<tr><td class="label">Sipariş Notu:</td><td class="customer-value">${customerNote}</td></tr>` : ''}
</table>

<div class="section-title">Ürünler</div>
<table>
<tr><th style="width:55%;font-size:16px">Ürün</th><th style="width:15%;font-size:16px">Adet</th><th style="width:30%;font-size:16px;text-align:right">Fiyat</th></tr>
${productsHtml}
</table>

<table style="margin-top:10px;border-top:1px solid #000">
<tr><td class="total-row" style="padding:5px 0">Sipariş Kaynağı: ${orderSource}</td></tr>
<tr><td class="total-row" style="padding:5px 0">Sipariş Türü: ${orderType}</td></tr>
<tr><td class="total-row" style="padding:5px 0">Ödeme Tipi: ${paymentType}</td></tr>
<tr><td class="total-row" style="font-size:20px; padding:10px 0; border-top:2px solid #000;">
  <strong>TOPLAM: ${formatPrice(totalAmount)} ₺</strong>
</td></tr>
</table>

<div style="text-align: center; margin-top: 12px; font-size: 12px; border-top: 1px solid #000; padding-top: 8px;">
Bu fiş ${new Date().toLocaleString('tr-TR')} tarihinde oluşturulmuştur.<br>
EasyRest Desktop v${process.env.REACT_APP_VERSION || '1.0.4'}<br>
Termal Yazdırma Sistemi
</div>

</body>
</html>`;
  };

  const isNewOrder = (order: Order) => {
    // MD dosyalarından: Platform-specific yeni sipariş kontrolü
    return OrderService.isOrderReceived(order);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-icons text-indigo-600 text-2xl">restaurant</span>
            </div>
          </div>
          <p className="mt-6 text-gray-600 text-lg font-medium">Siparişler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-full mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-float">
                <span className="material-icons text-white text-lg">restaurant_menu</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">EasyRest</h1>
                <p className="text-xs text-gray-500">Entegre Siparişler</p>
              </div>
            </div>

            {/* Store Selector with Search */}
            <div className="store-selector flex-1 max-w-md mx-4 relative">
              <div 
                onClick={() => setShowStoreDropdown(!showStoreDropdown)}
                className="w-full px-3 py-2 bg-white/80 border border-gray-200 rounded-lg text-sm cursor-pointer hover:bg-white transition-all duration-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-icons text-gray-600">store</span>
                  <div>
                    <div className="font-medium text-gray-800">{getSelectedStoreName()}</div>
                    <div className="text-xs text-gray-500">{stores.length} mağaza</div>
                  </div>
                </div>
                <span className={`material-icons text-gray-400 transition-transform duration-200 ${showStoreDropdown ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </div>
              
              {/* Store Dropdown */}
              {showStoreDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden">
                  {/* Search Input */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">search</span>
                      <input 
                        type="text" 
                        placeholder="Mağaza ara..." 
                        value={storeSearchTerm}
                        onChange={(e) => setStoreSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  
                  {/* Store List */}
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {getFilteredStores().map(store => (
                      <div 
                        key={store._id}
                        onClick={() => handleStoreChange(store)}
                        className={`px-4 py-3 hover:bg-indigo-50 cursor-pointer transition-colors duration-150 ${
                          store._id === selectedStore ? 'bg-indigo-100' : ''
                        }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-800">{store.magazaAdi}</div>
                            <div className="text-sm text-gray-500">{store.verilenmagazakodu || 'Kod: ' + store._id.substring(0,8)}</div>
                          </div>
                          {store._id === selectedStore && (
                            <span className="material-icons text-indigo-600">check_circle</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sound Control */}
              <div 
                onClick={toggleSound}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  soundEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}>
                <span className="material-icons text-lg">
                  {soundEnabled ? 'volume_up' : 'volume_off'}
                </span>
                <div className="text-sm">
                  <div className="font-medium">Ses</div>
                  <div className="text-xs opacity-75">{soundEnabled ? 'Açık' : 'Kapalı'}</div>
                </div>
              </div>
              
              {/* Auto Approve Control */}
              <div 
                onClick={toggleAutoApprove}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 ${
                  autoApproveEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                }`}>
                <span className="material-icons text-lg">
                  {autoApproveEnabled ? 'auto_awesome' : 'auto_awesome_off'}
                </span>
                <div className="text-sm">
                  <div className="font-medium">Oto Onay</div>
                  <div className="text-xs opacity-75">{autoApproveEnabled ? 'Açık' : 'Kapalı'}</div>
                </div>
              </div>
              
              {/* Refresh Control */}
              <div 
                onClick={() => loadOrders()}
                className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-all duration-200 cursor-pointer">
                <span className={`material-icons text-lg ${loading ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                <div className="text-sm">
                  <div className="font-medium">Yenile</div>
                  <div className="text-xs opacity-75">{loading ? 'Yükleniyor' : 'Hazır'}</div>
                </div>
              </div>

              {/* Update Check Control */}
              <div 
                onClick={async () => {
                  console.log('🔍 Custom update check başlatılıyor...');
                  
                  try {
                    // GitHub API ile latest release kontrol et
                    const response = await fetch('https://api.github.com/repos/iaydogdu/easyrest-entegre-siparisler-desktop/releases/latest');
                    const latestRelease = await response.json();
                    
                    const currentVersion = '1.0.24'; // Hardcoded for test
                    const latestVersion = latestRelease.tag_name.replace('v', '');
                    
                    console.log('📋 Version karşılaştırması:', {
                      current: currentVersion,
                      latest: latestVersion,
                      downloadUrl: latestRelease.assets[0]?.browser_download_url
                    });
                    
                    if (latestVersion !== currentVersion) {
                      console.log('🆕 Yeni versiyon mevcut!', latestRelease.tag_name);
                      alert(`Yeni versiyon mevcut: ${latestRelease.tag_name}\n\nİndirme: ${latestRelease.html_url}`);
                    } else {
                      console.log('📭 Güncelleme mevcut değil');
                      alert('Güncelleme mevcut değil. En son versiyonu kullanıyorsunuz.');
                    }
                    
                  } catch (error) {
                    console.error('❌ Custom update check hatası:', error);
                    alert('Güncelleme kontrolü başarısız: ' + error);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-all duration-200 cursor-pointer">
                <span className="material-icons text-lg">
                  system_update
                </span>
                <div className="text-sm">
                  <div className="font-medium">Update</div>
                  <div className="text-xs opacity-75">Kontrol Et</div>
                </div>
              </div>
              
              {/* User Info & Logout */}
              <div className="flex items-center gap-3 ml-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-800">{AuthService.getUsername()}</div>
                  <div className="text-xs text-gray-500">{getSelectedStoreName()}</div>
                </div>
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                  <span className="material-icons text-lg">logout</span>
                  <span className="text-sm font-medium">Çıkış</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3">
        
        {/* Summary */}
        <div className="mb-4 bg-white/80 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold text-gray-800">Toplam: {summary.total}</span>
              
              {/* Platform Filters */}
              <div className="flex gap-2">
                <button 
                  onClick={() => filterOrders('ALL')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  Tümü ({summary.total})
                </button>
                
                <button 
                  onClick={() => filterOrders('YEMEKSEPETI')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentFilter === 'YEMEKSEPETI' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-blue-600 hover:bg-blue-50'
                  }`}>
                  YS ({summary.byType.yemeksepeti})
                </button>
                
                <button 
                  onClick={() => filterOrders('TRENDYOL')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentFilter === 'TRENDYOL' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-orange-600 hover:bg-orange-50'
                  }`}>
                  TY ({summary.byType.trendyol})
                </button>
                
                <button 
                  onClick={() => filterOrders('MIGROS')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentFilter === 'MIGROS' ? 'bg-green-600 text-white' : 'bg-gray-100 text-green-600 hover:bg-green-50'
                  }`}>
                  MG ({summary.byType.migros})
                </button>
                
                <button 
                  onClick={() => filterOrders('GETIR')}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    currentFilter === 'GETIR' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-purple-600 hover:bg-purple-50'
                  }`}>
                  GT ({summary.byType.getir})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Orders Grid - Geniş Kutular */}
        <div className="orders-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {filteredOrders.map(order => (
            <div
              key={OrderService.getOrderId(order)}
              className={`order-card bg-white/70 backdrop-blur-sm border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden group ${
                isNewOrder(order) ? 'new-order-animation new-order-glow' : ''
              } ${
                order.type === 'YEMEKSEPETI' ? 'border-l-4 border-l-blue-500' :
                order.type === 'TRENDYOL' ? 'border-l-4 border-l-orange-500' :
                order.type === 'MIGROS' ? 'border-l-4 border-l-green-500' :
                order.type === 'GETIR' ? 'border-l-4 border-l-purple-500' : ''
              }`}
              onClick={() => setSelectedOrder(order)}>
              
              {/* Card Header - Resim Gibi */}
              <div className={`card-header ${
                isNewOrder(order) ? 'bg-gradient-to-r from-red-50 to-pink-50' : ''
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img 
                        src={OrderService.getPlatformLogo(order.type)} 
                        alt={order.type} 
                        className="w-8 h-8 object-contain rounded-lg bg-white p-1 shadow-sm"
                      />
                      
                      {/* New Order Indicator */}
                      {isNewOrder(order) && (
                        <div className="absolute -top-1 -right-1">
                          <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${
                          isNewOrder(order) ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          #{OrderService.getOrderId(order)}
                        </span>
                        
                        {/* YENİ Badge */}
                        {isNewOrder(order) && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                            YENİ
                          </span>
                        )}
                      </div>
                      
                      {/* Status Badge */}
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full mt-1 ${
                        OrderService.getStatusText(order.status).includes('Onay') ? 'bg-green-100 text-green-800' :
                        OrderService.getStatusText(order.status).includes('Yeni') ? 'bg-yellow-100 text-yellow-800' :
                        OrderService.getStatusText(order.status).includes('Hazır') ? 'bg-green-100 text-green-800' :
                        OrderService.getStatusText(order.status).includes('Picking') ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {OrderService.getStatusText(order.status)}
                      </span>
                      
                      {/* Order Type */}
                      <div className="mt-2">
                        <span className="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700">
                          {OrderService.getOrderType(order)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Price and Payment */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-gray-900">
                      {formatPrice(OrderService.getOrderAmount(order))} ₺
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {OrderService.getPaymentType(order)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body - Resim Gibi */}
              <div className="card-body">
                {/* Customer Info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-icons text-lg text-gray-500">person</span>
                    <span className="text-sm font-medium text-gray-700">
                      {OrderService.getCustomerName(order)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(order.createdAt)}
                  </span>
                </div>

                {/* Products List */}
                <div className="space-y-2 mb-3">
                  {(() => {
                    const products = OrderService.getProducts(order);
                    
                    if (products.length === 0) {
                      return <div className="text-sm text-gray-500 italic">Ürün bilgisi yok</div>;
                    }
                    
                    return products.slice(0, 2).map((product, index) => {
                      const productName = OrderService.getProductName(product);
                      const quantity = OrderService.getProductQuantity(product);
                      
                      return (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <div className="flex items-start gap-2 flex-1">
                            <span className="text-gray-700">
                              {productName}
                            </span>
                          </div>
                          <span className="text-gray-500 font-medium ml-2">
                            x{quantity}
                          </span>
                        </div>
                      );
                    });
                  })()}
                  
                  {/* More products indicator */}
                  {(() => {
                    const products = OrderService.getProducts(order);
                    if (products.length > 2) {
                      return (
                        <div className="text-sm text-blue-600 font-medium">
                          +{products.length - 2} ürün daha...
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Date and Status */}
                <div className="text-xs text-gray-500 text-center">
                  {formatDate(order.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredOrders.length === 0 && (
          <div className="text-center py-20">
            <div className="text-gray-400 mb-4">
              <span className="material-icons text-6xl">inbox</span>
            </div>
            <h3 className="text-xl font-medium text-gray-700 mb-2">Sipariş bulunamadı</h3>
            <p className="text-gray-500">Yeni siparişler geldiğinde burada görünecek</p>
          </div>
        )}

      </main>

      {/* MD Dosyalarından: Sipariş Detay Drawer */}
      {selectedOrder && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm transition-opacity duration-300"
            onClick={() => setSelectedOrder(null)}>
          </div>

          {/* Drawer */}
          <div className="fixed top-0 right-0 z-[9999] w-full lg:w-[900px] h-full transition-transform duration-300 ease-in-out">
            <div className="h-full bg-white text-gray-900 shadow-2xl overflow-y-auto">
              
              {/* Drawer Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold">Sipariş Detayı</h3>
                  <button 
                    onClick={() => setSelectedOrder(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-icons text-xl">close</span>
                  </button>
                </div>
              </div>

              {/* Sipariş Detayları */}
              <div className="p-6 space-y-8">
                
                {/* Sipariş Başlığı */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <img 
                          src={OrderService.getPlatformLogo(selectedOrder.type)} 
                          alt={selectedOrder.type}
                          className="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-md"
                        />
                        
                        {/* Platform Badge */}
                        <div className={`absolute -bottom-1 -right-1 px-2 py-0.5 text-xs font-bold rounded-full text-white ${
                          selectedOrder.type === 'YEMEKSEPETI' ? 'bg-blue-500' :
                          selectedOrder.type === 'TRENDYOL' ? 'bg-orange-500' :
                          selectedOrder.type === 'MIGROS' ? 'bg-green-500' :
                          selectedOrder.type === 'GETIR' ? 'bg-purple-500' : 'bg-gray-500'
                        }`}>
                          {selectedOrder.type}
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                          #{OrderService.getOrderId(selectedOrder)}
                          {isNewOrder(selectedOrder) && (
                            <span className="text-red-500 text-lg animate-pulse">🆕</span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-medium ${
                            OrderService.getStatusText(selectedOrder.status).includes('Onay') ? 'bg-green-100 text-green-800' :
                            OrderService.getStatusText(selectedOrder.status).includes('Yeni') ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {OrderService.getStatusText(selectedOrder.status)}
                          </span>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
                          <span className="material-icons text-sm">local_shipping</span>
                          <span>{OrderService.getOrderType(selectedOrder)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Fiyat ve Ödeme */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(OrderService.getOrderAmount(selectedOrder))} ₺
                      </div>
                      <div className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                        <span className="material-icons text-sm">payment</span>
                        <span>{OrderService.getPaymentType(selectedOrder)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Müşteri Bilgileri */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                    <span className="material-icons">person</span>
                    Müşteri Bilgileri
                  </h4>
                  
                  <div className="bg-gray-50 p-6 rounded-xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Ad Soyad */}
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-gray-500">badge</span>
                        <div>
                          <div className="text-xs text-gray-500">Ad Soyad</div>
                          <div className="font-medium">{OrderService.getCustomerName(selectedOrder)}</div>
                        </div>
                      </div>
                      
                      {/* Telefon */}
                      <div className="flex items-center gap-3">
                        <span className="material-icons text-gray-500">phone</span>
                        <div>
                          <div className="text-xs text-gray-500">Telefon</div>
                          <div className="font-medium">{OrderService.getCustomerPhone(selectedOrder)}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Adres Bilgileri */}
                    {(() => {
                      const address = OrderService.getDeliveryAddress(selectedOrder);
                      if (!address.address) return null;
                      
                      return (
                        <div className="space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="material-icons text-gray-500 mt-1">location_on</span>
                            <div className="flex-1">
                              <div className="text-xs text-gray-500">Adres</div>
                              <div className="font-medium">{address.address}</div>
                            </div>
                          </div>
                          
                          {(address.doorNo || address.floor) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {address.doorNo && (
                                <div className="flex items-center gap-3">
                                  <span className="material-icons text-gray-500">door_front</span>
                                  <div>
                                    <div className="text-xs text-gray-500">Kapı No</div>
                                    <div className="font-medium">{address.doorNo}</div>
                                  </div>
                                </div>
                              )}
                              
                              {address.floor && (
                                <div className="flex items-center gap-3">
                                  <span className="material-icons text-gray-500">layers</span>
                                  <div>
                                    <div className="text-xs text-gray-500">Kat</div>
                                    <div className="font-medium">{address.floor}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {address.description && (
                            <div className="flex items-start gap-3">
                              <span className="material-icons text-gray-500 mt-1">note</span>
                              <div className="flex-1">
                                <div className="text-xs text-gray-500">Not</div>
                                <div className="font-medium">{address.description}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Ürünler Detayı */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-700 flex items-center gap-2">
                    <span className="material-icons">restaurant_menu</span>
                    Sipariş İçeriği
                    <span className="text-sm text-gray-500">({OrderService.getProducts(selectedOrder).length} ürün)</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {OrderService.getProducts(selectedOrder).map((product, index) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        {/* Ürün Header */}
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              {/* Ürün Adı */}
                              <div className="flex-1">
                                <span className="font-medium text-base text-gray-900">
                                  {OrderService.getProductName(product)}
                                </span>
                                
                                {/* Ürün Eşleştirme Durumu */}
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-500">Eşleştirme:</span>
                                  {((selectedOrder?.type !== 'TRENDYOL' && product.mapping?.localProduct) ||
                                    (selectedOrder?.type === 'TRENDYOL' && product.mapping?.eslestirilenUrun)) ? (
                                    <span className="text-green-600 text-xs flex items-center gap-1">
                                      <span className="material-icons text-sm">check_circle</span>
                                      <span>{selectedOrder?.type === 'TRENDYOL' ? product.mapping.eslestirilenUrun.urunAdi : product.mapping.localProduct.urunAdi}</span>
                                    </span>
                                  ) : (
                                    <span className="text-red-500 flex items-center gap-1 text-xs">
                                      <span className="material-icons text-sm">error</span>
                                      <span>Eşleştirme Yok</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* Miktar ve Fiyat */}
                              <div className="text-right">
                                <div className="font-medium text-lg">x{OrderService.getProductQuantity(product)}</div>
                                <div className="text-sm text-gray-500">{(product.price || 0).toFixed(2)} ₺</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Platform-Specific Ürün Detayları */}
                        
                        {/* Getir Ürün Seçimleri */}
                        {selectedOrder?.type === 'GETIR' && product?.options?.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-purple-200">
                            <h5 className="text-sm font-medium text-purple-700 flex items-center gap-2">
                              <span className="material-icons text-sm">tune</span>
                              Ürün Seçimleri
                            </h5>
                            
                            {product.options.map((category: any, catIndex: number) => (
                              <div key={catIndex} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="material-icons text-sm text-gray-500">category</span>
                                  <div className="font-medium text-sm">{category.name?.tr || category.name?.en}</div>
                                </div>
                                
                                <div className="pl-6 space-y-2">
                                  {category.options?.map((option: any, optIndex: number) => (
                                    <div key={optIndex} className="space-y-1">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="material-icons text-sm text-gray-400">arrow_right</span>
                                          <span className="text-sm text-gray-700">
                                            {option.name?.tr || option.name?.en}
                                          </span>
                                          {option.price > 0 && (
                                            <span className="text-xs text-gray-500">
                                              (+{formatPrice(option.price)} ₺)
                                            </span>
                                          )}
                                        </div>
                                        
                                        {/* Option Eşleştirme */}
                                        <div className="flex items-center gap-1">
                                          {option.mapping?.localProduct ? (
                                            <span className="text-green-600 text-xs flex items-center gap-1">
                                              <span className="material-icons text-xs">check</span>
                                              <span>{option.mapping.localProduct.urunAdi}</span>
                                            </span>
                                          ) : (
                                            <span className="text-red-500 text-xs flex items-center gap-1">
                                              <span className="material-icons text-xs">close</span>
                                              <span>Eşleştirme Yok</span>
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Alt Seçenekler (Soslar, Çıkarılacak Malzemeler) */}
                                      {option.optionCategories?.length > 0 && (
                                        <div className="pl-4 space-y-1">
                                          {option.optionCategories.map((optionCategory: any, subCatIndex: number) => (
                                            <div key={subCatIndex}>
                                              <div className="text-xs font-medium text-gray-600 mb-1">
                                                {optionCategory.name?.tr || optionCategory.name?.en}:
                                              </div>
                                              <div className="pl-2 space-y-1">
                                                {optionCategory.options?.map((subOption: any, subOptIndex: number) => (
                                                  <div key={subOptIndex} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                                      <span className="text-xs text-gray-600">
                                                        {subOption.name?.tr || subOption.name?.en}
                                                      </span>
                                                      {subOption.price > 0 && (
                                                        <span className="text-xs text-gray-500">
                                                          (+{formatPrice(subOption.price)} ₺)
                                                        </span>
                                                      )}
                                                    </div>
                                                    
                                                    {/* SubOption Eşleştirme */}
                                                    <div className="flex items-center gap-1">
                                                      {subOption.mapping?.localProduct ? (
                                                        <span className="text-green-600 text-xs">
                                                          ✓ {subOption.mapping.localProduct.urunAdi}
                                                        </span>
                                                      ) : (
                                                        <span className="text-red-500 text-xs">
                                                          ✗ Eşleştirme Yok
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Migros Ürün Seçimleri */}
                        {selectedOrder?.type === 'MIGROS' && product?.options?.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-green-200">
                            <h5 className="text-sm font-medium text-green-700 flex items-center gap-2">
                              <span className="material-icons text-sm">tune</span>
                              Ürün Seçimleri
                            </h5>
                            
                            {product.options.map((option: any, optIndex: number) => (
                              <div key={optIndex} className="space-y-2">
                                <div className="bg-white p-3 rounded-lg">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="material-icons text-sm text-gray-500">label</span>
                                      <div className="font-medium text-sm">{option.headerName}</div>
                                    </div>
                                    
                                    {/* Option Eşleştirme */}
                                    <div className="flex items-center gap-1">
                                      {option.mapping?.localProduct ? (
                                        <span className="text-green-600 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">check</span>
                                          <span>{option.mapping.localProduct.urunAdi}</span>
                                        </span>
                                      ) : (
                                        <span className="text-red-500 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">close</span>
                                          <span>Eşleştirme Yok</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-600">
                                      {option.itemNames}
                                    </div>
                                    {option.primaryDiscountedPrice > 0 && (
                                      <div className="text-xs text-gray-500">
                                        (+{option.primaryDiscountedPriceText})
                                      </div>
                                    )}
                                  </div>

                                  {/* Migros Alt Seçenekler */}
                                  {option.subOptions?.length > 0 && (
                                    <div className="mt-3 pl-3 border-l border-gray-200">
                                      {option.subOptions.map((subOption: any, subIndex: number) => (
                                        <div key={subIndex} className="mb-2">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="material-icons text-sm text-gray-400">subdirectory_arrow_right</span>
                                              <div>
                                                <div className="text-xs font-medium text-gray-600">{subOption.headerName}</div>
                                                <div className="text-sm">{subOption.itemNames}</div>
                                              </div>
                                            </div>
                                            
                                            {/* SubOption Eşleştirme */}
                                            <div className="flex items-center gap-1">
                                              {subOption.mapping?.localProduct ? (
                                                <span className="text-green-600 text-xs">
                                                  ✓ {subOption.mapping.localProduct.urunAdi}
                                                </span>
                                              ) : (
                                                <span className="text-red-500 text-xs">
                                                  ✗ Eşleştirme Yok
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {subOption.primaryDiscountedPrice > 0 && (
                                            <div className="text-xs text-gray-500 ml-6">
                                              (+{subOption.primaryDiscountedPriceText})
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* YemekSepeti Ürün Seçimleri */}
                        {selectedOrder?.type === 'YEMEKSEPETI' && product?.selectedToppings?.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-blue-200">
                            <h5 className="text-sm font-medium text-blue-700 flex items-center gap-2">
                              <span className="material-icons text-sm">add_circle</span>
                              Seçili Toppings
                            </h5>
                            
                            {product.selectedToppings.map((topping: any, toppingIndex: number) => (
                              <div key={toppingIndex} className="space-y-2">
                                <div className="bg-white p-3 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="material-icons text-sm text-gray-500">add</span>
                                      <div className="font-medium text-sm">{topping?.name || ''}</div>
                                    </div>
                                    
                                    {/* Topping Eşleştirme */}
                                    <div className="flex items-center gap-1">
                                      {topping.mapping?.localProduct ? (
                                        <span className="text-green-600 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">check</span>
                                          <span>{topping.mapping.localProduct.urunAdi}</span>
                                        </span>
                                      ) : (
                                        <span className="text-red-500 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">close</span>
                                          <span>Eşleştirme Yok</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Children */}
                                  {topping?.children?.length > 0 && (
                                    <div className="mt-2 pl-3 border-l border-gray-200">
                                      {topping.children.map((child: any, childIndex: number) => (
                                        <div key={childIndex} className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                                            <span className="text-sm text-gray-600">
                                              {child?.name || ''}
                                            </span>
                                            {child?.price > 0 && (
                                              <span className="text-xs text-gray-500">
                                                (+{formatPrice(child.price)} ₺)
                                              </span>
                                            )}
                                          </div>
                                          
                                          {/* Child Eşleştirme */}
                                          <div className="flex items-center gap-1">
                                            {child.mapping?.localProduct ? (
                                              <span className="text-green-600 text-xs">
                                                ✓ {child.mapping.localProduct.urunAdi}
                                              </span>
                                            ) : (
                                              <span className="text-red-500 text-xs">
                                                ✗ Eşleştirme Yok
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Trendyol Ürün Seçimleri */}
                        {selectedOrder?.type === 'TRENDYOL' && product?.modifierProducts?.length > 0 && (
                          <div className="mt-4 space-y-3 pl-4 border-l-2 border-orange-200">
                            <h5 className="text-sm font-medium text-orange-700 flex items-center gap-2">
                              <span className="material-icons text-sm">extension</span>
                              Modifier Products
                            </h5>
                            
                            {product.modifierProducts.map((modifier: any, modIndex: number) => (
                              <div key={modIndex} className="space-y-2">
                                <div className="bg-white p-3 rounded-lg">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className={`material-icons text-sm ${
                                        modifier.name?.toLowerCase().includes('istemiyorum') ? 'text-red-500' : 'text-gray-500'
                                      }`}>
                                        {modifier.name?.toLowerCase().includes('istemiyorum') ? 'remove_circle' : 'add_circle'}
                                      </span>
                                      <div className={`font-medium text-sm ${
                                        modifier.name?.toLowerCase().includes('istemiyorum') ? 'text-red-600' : 'text-gray-900'
                                      }`}>
                                        {modifier.name || ''}
                                      </div>
                                      {modifier.price > 0 && (
                                        <div className="text-xs text-gray-500">
                                          (+{formatPrice(modifier.price)} ₺)
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Modifier Eşleştirme */}
                                    <div className="flex items-center gap-1">
                                      {modifier.mapping?.eslestirilenUrun ? (
                                        <span className="text-green-600 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">check</span>
                                          <span>{modifier.mapping.eslestirilenUrun.urunAdi}</span>
                                        </span>
                                      ) : (
                                        <span className="text-red-500 text-xs flex items-center gap-1">
                                          <span className="material-icons text-xs">close</span>
                                          <span>Eşleştirme Yok</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Alt Modifierlar */}
                                  {modifier.modifierProducts?.length > 0 && (
                                    <div className="mt-2 pl-3 border-l border-gray-200">
                                      {modifier.modifierProducts.map((subModifier: any, subModIndex: number) => (
                                        <div key={subModIndex} className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`material-icons text-xs ${
                                              subModifier.name?.toLowerCase().includes('istemiyorum') ? 'text-red-500' : 'text-gray-400'
                                            }`}>
                                              {subModifier.name?.toLowerCase().includes('istemiyorum') ? 'remove' : 'arrow_right'}
                                            </span>
                                            <span className={`text-sm ${
                                              subModifier.name?.toLowerCase().includes('istemiyorum') ? 'text-red-600 line-through' : 'text-gray-600'
                                            }`}>
                                              {subModifier.name || ''}
                                            </span>
                                            {subModifier.price > 0 && (
                                              <span className="text-xs text-gray-500">
                                                (+{formatPrice(subModifier.price)} ₺)
                                              </span>
                                            )}
                                          </div>
                                          
                                          {/* SubModifier Eşleştirme */}
                                          <div className="flex items-center gap-1">
                                            {subModifier.mapping?.eslestirilenUrun ? (
                                              <span className="text-green-600 text-xs">
                                                ✓ {subModifier.mapping.eslestirilenUrun.urunAdi}
                                              </span>
                                            ) : (
                                              <span className="text-red-500 text-xs">
                                                ✗ Eşleştirme Yok
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sipariş Özeti ve Aksiyonlar - Sticky Bottom */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 mt-8">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border border-gray-200">
                    {/* Özet Bilgiler */}
                    <div className="flex justify-between items-center text-xl mb-6">
                      <span className="font-medium flex items-center gap-2">
                        <span className="material-icons">receipt</span>
                        Toplam Tutar
                      </span>
                      <span className="font-bold text-2xl">{formatPrice(OrderService.getOrderAmount(selectedOrder))} ₺</span>
                    </div>

                    {/* Ana Angular Projeden: Tüm Aksiyon Butonları */}
                    <div className="flex flex-wrap gap-3 justify-end">
                      
                      {/* Sipariş Onaylama Butonu */}
                      <button
                        onClick={() => handleApproveOrder(selectedOrder)}
                        className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 font-medium">
                        <span className="material-icons text-lg">check_circle</span>
                        <span>Siparişi Onayla</span>
                      </button>

                      {/* Tekrar Onay Gönder */}
                      <button 
                        onClick={() => handleApproveOrder(selectedOrder)}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2">
                        <span className="material-icons text-lg">refresh</span>
                        <span>Tekrar Gönder</span>
                      </button>

                      {/* Termal Yazdır */}
                      <button 
                        onClick={() => printToThermalPrinter(selectedOrder)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2">
                        <span className="material-icons text-lg">print</span>
                        <span>Termal Yazdır</span>
                      </button>

                      {/* Hesap Fişi Yazdır */}
                      <button 
                        onClick={() => printAccountReceipt(selectedOrder)}
                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2">
                        <span className="material-icons text-lg">receipt_long</span>
                        <span>Hesap Fişi</span>
                      </button>

                      {/* JSON Kopyala */}
                      <button 
                        onClick={() => copyOrderJson(selectedOrder)}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2">
                        <span className="material-icons text-lg">code</span>
                        <span>JSON Kopyala</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Orders;
