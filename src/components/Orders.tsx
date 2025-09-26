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
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);
  const [newOrders, setNewOrders] = useState<Set<string>>(new Set());

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
  }, []);

  // Load orders when store changes
  useEffect(() => {
    if (selectedStore) {
      loadOrders();
    }
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
        
        setOrders(response.data.orders);
        
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

  // Sound system
  const playSound = () => {
    try {
      const audio = new Audio('/assets/sounds/web.mp3');
      audio.volume = 0.7;
      audio.play().catch(console.error);
    } catch (error) {
      console.error('Ses çalma hatası:', error);
    }
  };

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

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Sipariş #{OrderService.getOrderId(selectedOrder)}</h3>
                <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <span className="material-icons">close</span>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              
              {/* Order Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={OrderService.getPlatformLogo(selectedOrder.type)} 
                      alt={selectedOrder.type} 
                      className="w-12 h-12 object-contain" 
                    />
                    <div>
                      <div className="text-lg font-bold">#{OrderService.getOrderId(selectedOrder)}</div>
                      <div className="text-sm text-gray-600">{OrderService.getStatusText(selectedOrder.status)}</div>
                      <div className="text-sm text-gray-600">{selectedOrder.type}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{formatPrice(OrderService.getOrderAmount(selectedOrder))} ₺</div>
                  </div>
                </div>
              </div>

              {/* Customer */}
              <div>
                <h4 className="font-medium mb-2">Müşteri Bilgileri</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Ad Soyad</div>
                      <div className="font-medium">{OrderService.getCustomerName(selectedOrder)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions - SADECE ONAY */}
              <div className="border-t pt-4">
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => handleApproveOrder(selectedOrder)}
                    className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center gap-2">
                    <span className="material-icons">check_circle</span>
                    Siparişi Onayla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
