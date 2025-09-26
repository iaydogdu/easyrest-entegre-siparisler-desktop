import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subscription, interval } from 'rxjs';
import { environment } from '../../environments/environment';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export interface Order {
    _id?: string;
    type: string;
    platform?: string;
    status: string | number;
    createdAt: string;
    rawData: any;
}

export interface OrderResponse {
    success: boolean;
    data: {
        orders: Order[];
        total?: number;
        summary: {
            total: number;
            byType: {
                trendyol: number;
                yemeksepeti: number;
                migros: number;
                getir: number;
            }
        }
    }
}

@Injectable({
    providedIn: 'root',
})
export class EntegreSiparisService {
    private readonly baseUrl = environment.baseappurl + "/api";
    private readonly trendyolSyncUrl = environment.baseappurl;
    private previousOrders: { [key: string]: Order } = {};

    // Background Sync değişkenleri
    private trendyolSyncInterval: Subscription = new Subscription();
    private isTrendyolSyncRunning: boolean = false;
    private trendyolSyncInProgress: boolean = false;
    private currentStoreId: string = '';

    private trendyolRefundSyncInterval: Subscription = new Subscription();
    private isTrendyolRefundSyncRunning: boolean = false;
    private trendyolRefundSyncInProgress: boolean = false;

    private yemeksepetiRefundSyncInterval: Subscription = new Subscription();
    private isYemeksepetiRefundSyncRunning: boolean = false;
    private yemeksepetiRefundSyncInProgress: boolean = false;

    constructor(private http: HttpClient) {}

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('token');
        return new HttpHeaders({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        });
    }

    // Entegre siparişleri getir
    getAggregatedOrders(storeId: string): Observable<OrderResponse> {
        const headers = this.getAuthHeaders();
        const cleanStoreId = this.validateAndCleanStoreId(storeId);
        
        console.log(`📦 Sipariş API çağrısı: ${cleanStoreId}`);
        
        return this.http.get<OrderResponse>(`${this.baseUrl}/aggregated-orders/${cleanStoreId}`, { headers })
            .pipe(
                map(response => {
                    console.log('📦 Raw API Response:', {
                        success: response.success,
                        hasData: !!response.data,
                        orderCount: response.data?.orders?.length || 0
                    });
                    
                    if (response.success && response.data) {
                        // Debug: Sipariş detaylarını logla
                        if (response.data.orders && response.data.orders.length > 0) {
                            response.data.orders.forEach((order, index) => {
                                console.log(`📋 Sipariş ${index + 1}:`, {
                                    type: order.type,
                                    platform: order.platform,
                                    status: order.status,
                                    hasRawData: !!order.rawData,
                                    rawDataKeys: order.rawData ? Object.keys(order.rawData) : []
                                });
                            });
                        }
                        
                        if (!response.data.summary) {
                            const orders = response.data.orders || [];
                            response.data.summary = {
                                total: orders.length,
                                byType: {
                                    trendyol: orders.filter(o => (o.platform?.toLowerCase() === 'trendyol' || o.type?.toLowerCase() === 'trendyol')).length,
                                    yemeksepeti: orders.filter(o => (o.platform?.toLowerCase() === 'yemeksepeti' || o.type?.toLowerCase() === 'yemeksepeti')).length,
                                    migros: orders.filter(o => (o.platform?.toLowerCase() === 'migros' || o.type?.toLowerCase() === 'migros')).length,
                                    getir: orders.filter(o => (o.platform?.toLowerCase() === 'getir' || o.type?.toLowerCase() === 'getir')).length
                                }
                            };
                        }
                    }
                    return response;
                }),
                catchError(error => {
                    console.error('❌ Sipariş getirme API hatası:', {
                        status: error.status,
                        statusText: error.statusText,
                        url: error.url,
                        message: error.message
                    });
                    return of({ 
                        success: false, 
                        data: { 
                            orders: [], 
                            total: 0,
                            summary: {
                                total: 0,
                                byType: { trendyol: 0, yemeksepeti: 0, migros: 0, getir: 0 }
                            }
                        }
                    });
                })
            );
    }

    // Sipariş onaylama
    approveOrder(data: any): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.post(`${this.baseUrl}/order-approval/approve`, data, { headers });
    }

    // Trendyol Sync
    startTrendyolSync(storeId: string): void {
        if (!storeId || this.isTrendyolSyncRunning) return;
        
        this.currentStoreId = storeId;
        this.isTrendyolSyncRunning = true;

        this.trendyolSyncInterval = interval(11000).subscribe(() => {
            if (!this.trendyolSyncInProgress) {
                this.performTrendyolSync();
            }
        });
    }

    stopTrendyolSync(): void {
        if (this.trendyolSyncInterval) {
            this.trendyolSyncInterval.unsubscribe();
        }
        this.isTrendyolSyncRunning = false;
        this.trendyolSyncInProgress = false;
    }

    private performTrendyolSync(): void {
        this.trendyolSyncInProgress = true;
        const syncUrl = `${this.trendyolSyncUrl}/api/trendyol-orders/sync/${this.currentStoreId}?packageStatuses=Created`;

        this.http.post(syncUrl, {}, { headers: this.getAuthHeaders() }).subscribe({
            next: (response) => {
                this.trendyolSyncInProgress = false;
                console.log('✅ Trendyol sync başarılı:', response);
            },
            error: (error) => {
                this.trendyolSyncInProgress = false;
                console.error('❌ Trendyol sync hatası:', error);
            }
        });
    }

    getTrendyolSyncStatus() {
        return {
            isRunning: this.isTrendyolSyncRunning,
            inProgress: this.trendyolSyncInProgress,
            storeId: this.currentStoreId
        };
    }

    // Trendyol Refund Sync - Her 1 saatte bir
    startTrendyolRefundSync(storeId: string): void {
        if (!storeId || this.isTrendyolRefundSyncRunning) return;
        
        this.currentStoreId = storeId;
        this.isTrendyolRefundSyncRunning = true;

        // Her 1 saatte bir (3600000 ms)
        this.trendyolRefundSyncInterval = interval(3600000).subscribe(() => {
            if (!this.trendyolRefundSyncInProgress) {
                this.performTrendyolRefundSync();
            }
        });
    }

    stopTrendyolRefundSync(): void {
        if (this.trendyolRefundSyncInterval) {
            this.trendyolRefundSyncInterval.unsubscribe();
        }
        this.isTrendyolRefundSyncRunning = false;
        this.trendyolRefundSyncInProgress = false;
    }

    private performTrendyolRefundSync(): void {
        this.trendyolRefundSyncInProgress = true;
        const syncUrl = `${this.baseUrl}/trendyol-orders-diger/${this.currentStoreId}/iades`;

        this.http.get(syncUrl, { headers: this.getAuthHeaders() }).subscribe({
            next: () => {
                this.trendyolRefundSyncInProgress = false;
                console.log('Trendyol refund sync completed');
            },
            error: () => {
                this.trendyolRefundSyncInProgress = false;
                console.error('Trendyol refund sync failed');
            }
        });
    }

    changeTrendyolRefundSyncStore(newStoreId: string): void {
        this.stopTrendyolRefundSync();
        if (newStoreId) {
            this.startTrendyolRefundSync(newStoreId);
        }
    }

    getTrendyolRefundSyncStatus() {
        return {
            isRunning: this.isTrendyolRefundSyncRunning,
            inProgress: this.trendyolRefundSyncInProgress,
            storeId: this.currentStoreId
        };
    }

    // YemekSepeti Refund Sync - Her 3 saatte bir
    startYemeksepetiRefundSync(storeId: string): void {
        if (!storeId || this.isYemeksepetiRefundSyncRunning) return;
        
        this.currentStoreId = storeId;
        this.isYemeksepetiRefundSyncRunning = true;

        // Her 3 saatte bir (10800000 ms)
        this.yemeksepetiRefundSyncInterval = interval(10800000).subscribe(() => {
            if (!this.yemeksepetiRefundSyncInProgress) {
                this.performYemeksepetiRefundSync();
            }
        });
    }

    stopYemeksepetiRefundSync(): void {
        if (this.yemeksepetiRefundSyncInterval) {
            this.yemeksepetiRefundSyncInterval.unsubscribe();
        }
        this.isYemeksepetiRefundSyncRunning = false;
        this.yemeksepetiRefundSyncInProgress = false;
    }

    private performYemeksepetiRefundSync(): void {
        this.yemeksepetiRefundSyncInProgress = true;
        const syncUrl = `${this.baseUrl}/yemeksepetideliveryhero/siparisRaporu`;

        this.http.get(syncUrl, { headers: this.getAuthHeaders() }).subscribe({
            next: () => {
                this.yemeksepetiRefundSyncInProgress = false;
                console.log('YemekSepeti refund sync completed');
            },
            error: () => {
                this.yemeksepetiRefundSyncInProgress = false;
                console.error('YemekSepeti refund sync failed');
            }
        });
    }

    changeYemeksepetiRefundSyncStore(newStoreId: string): void {
        this.stopYemeksepetiRefundSync();
        if (newStoreId) {
            this.startYemeksepetiRefundSync(newStoreId);
        }
    }

    getYemeksepetiRefundSyncStatus() {
        return {
            isRunning: this.isYemeksepetiRefundSyncRunning,
            inProgress: this.yemeksepetiRefundSyncInProgress,
            storeId: this.currentStoreId
        };
    }

    changeTrendyolSyncStore(newStoreId: string): void {
        this.stopTrendyolSync();
        if (newStoreId) {
            this.startTrendyolSync(newStoreId);
        }
    }

    // Platform yardımcı metodları
    getPlatformLogo(platform: string): string {
        switch (platform?.toLowerCase()) {
            case 'trendyol': return '/assets/images/trendyollogo.png';
            case 'yemeksepeti': return '/assets/images/yemek-sepeti.png';
            case 'migros': return '/assets/images/migros-yemek.png';
            case 'getir': return '/assets/images/getir.png';
            default: return '/assets/images/logo.svg';
        }
    }

    getPlatformColor(platform: string): string {
        switch (platform?.toLowerCase()) {
            case 'trendyol': return '#f27a1a';
            case 'yemeksepeti': return '#ff6600';
            case 'migros': return '#00a650';
            case 'getir': return '#5d3ebc';
            default: return '#667eea';
        }
    }

    getOrderStatusText(status: string): string {
        switch (status?.toLowerCase()) {
            case 'new':
            case 'received':
            case '400':
            case 'processed':
            case 'created':
            case 'new_pending': return 'Yeni Sipariş';
            case 'accepted':
            case '200':
            case 'approved': return 'Onaylandı';
            case 'preparing':
            case 'picking': return 'Hazırlanıyor';
            case 'ready': return 'Hazır';
            case 'completed':
            case 'delivered': return 'Tamamlandı';
            case 'cancelled': return 'İptal Edildi';
            default: return status || 'Durum Belirsiz';
        }
    }

    // Platform-specific ürün alma metodları
    getProducts(order: Order): any[] {
        if (!order?.rawData) return [];
        
        switch (order.type) {
            case 'YEMEKSEPETI':
                return order.rawData.products || [];
            case 'TRENDYOL':
                return order.rawData.lines || [];
            case 'GETIR':
                return order.rawData.products || [];
            case 'MIGROS':
                return order.rawData.items || order.rawData.products || [];
            default:
                return [];
        }
    }

    getProductName(product: any): string {
        if (!product?.name) return 'Ürün Adı Bilinmiyor';
        
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

    // Platform-specific sipariş işleme
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
        return {
            ...order,
            type: 'YEMEKSEPETI',
            status: order.status || 'new',
            rawData: {
                ...order.rawData,
                shortCode: order.rawData.shortCode || '',
                code: order.rawData.code || '',
                expeditionType: order.rawData.expeditionType || 'delivery'
            }
        };
    }

    private processGetirOrder(order: any): Order {
        return {
            ...order,
            type: 'GETIR',
            status: order.status || 'new',
            rawData: {
                ...order.rawData,
                confirmationId: order.rawData.confirmationId || order.rawData.id || '',
                isScheduled: order.rawData.isScheduled || false,
                deliveryType: order.rawData.deliveryType || 2
            }
        };
    }

    private processTrendyolOrder(order: any): Order {
        return {
            ...order,
            type: 'TRENDYOL',
            status: order.status || 'new',
            rawData: {
                ...order.rawData,
                orderNumber: order.rawData.orderNumber || '',
                packageStatus: order.rawData.packageStatus || 'Created',
                totalPrice: order.rawData.totalPrice || 0
            }
        };
    }

    private processMigrosOrder(order: any): Order {
        return {
            ...order,
            type: 'MIGROS',
            status: order.status || 'NEW_PENDING',
            rawData: {
                ...order.rawData,
                orderId: order.rawData.orderId || '',
                platformConfirmationId: order.rawData.platformConfirmationId || ''
            }
        };
    }

    // Sipariş detay alma
    getOrderById(orderId: string, platform: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.put(`${this.baseUrl}/banko/getOrderById`, {
            orderId,
            platform: platform.toLowerCase()
        }, { headers });
    }

    // Sipariş durum güncellemeleri
    updateOrderStatus(orderId: string, status: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.put(`${this.baseUrl}/banko/updateOrderStatus`, {
            orderId,
            status
        }, { headers });
    }

    adisyonHazirla(orderId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.put(`${this.baseUrl}/banko/entegreSiparisHazirla`, {
            orderId
        }, { headers });
    }

    adisyonTamamlandi(orderId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.put(`${this.baseUrl}/banko/entegreSiparisTamamla`, {
            orderId
        }, { headers });
    }

    // Tarih aralığı ile sipariş alma
    getAggregatedOrdersByDateRange(storeId: string, startDate: string, endDate: string): Observable<OrderResponse> {
        const headers = this.getAuthHeaders();
        const params = new URLSearchParams({
            startDate,
            endDate
        });
        
        return this.http.get<OrderResponse>(`${this.baseUrl}/aggregated-orders/${storeId}?${params}`, { headers });
    }

    // Yeni sipariş kontrolü
    checkNewOrders(storeId: string): Observable<any> {
        const headers = this.getAuthHeaders();
        return this.http.get(`${this.baseUrl}/check-new-orders/${storeId}`, { headers });
    }

    // Bildirim sistemi
    showNotifications(orders: Order[]): void {
        orders.forEach(order => {
            if (this.isOrderReceived(order)) {
                const orderId = this.getOrderId(order);
                console.log(`🔔 Yeni sipariş bildirimi: ${orderId}`);
                
                // Desktop notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    const notification = new Notification(`Yeni ${order.type} Siparişi!`, {
                        body: `Sipariş No: ${orderId}\nMüşteri: ${this.getCustomerName(order)}`,
                        icon: this.getPlatformLogo(order.type),
                        tag: orderId
                    });

                    setTimeout(() => notification.close(), 10000);
                }
            }
        });
    }

    // Sipariş helper metodları
    getOrderId(order: Order): string {
        if (!order?.rawData) return '';
        
        switch (order.type) {
            case 'GETIR':
                return order.rawData.confirmationId || order.rawData.id || '';
            case 'YEMEKSEPETI':
                const shortCode = order.rawData.shortCode || '';
                const code = order.rawData.code || '';
                return shortCode ? `${shortCode} (${code})` : code;
            case 'TRENDYOL':
                return order.rawData.orderNumber || order.rawData.orderCode || '';
            case 'MIGROS':
                return order.rawData.orderId?.toString() || '';
            default:
                return '';
        }
    }

    isOrderReceived(order: Order): boolean {
        if (!order?.status) return false;
        
        const status = order.status.toString().toLowerCase();
        
        switch (order.type) {
            case 'GETIR':
                if (order.rawData?.isScheduled) {
                    return status === '325' || status === '1600';
                }
                return status === '400';
                
            case 'YEMEKSEPETI':
                return status === 'processed' || status === 'received';
                
            case 'TRENDYOL':
                return order.rawData?.packageStatus?.toLowerCase() === 'created';
                
            case 'MIGROS':
                return status === 'new_pending' || status.includes('new');
                
            default:
                return false;
        }
    }

    getOrderDisplayCode(order: Order): string {
        const orderId = this.getOrderId(order);
        return orderId ? `#${orderId}` : '#---';
    }

    getOrderAmount(order: Order): number {
        if (!order?.rawData) return 0;

        switch (order.type) {
            case 'YEMEKSEPETI':
                return order.rawData.price?.grandTotal || 0;
                
            case 'GETIR':
                return order.rawData.totalDiscountedPrice || order.rawData.totalPrice || 0;
                
            case 'TRENDYOL':
                // İndirim hesaplama
                let totalDiscount = 0;
                const basePrice = order.rawData.totalPrice || 0;

                if (order.rawData?.lines && Array.isArray(order.rawData.lines)) {
                    order.rawData.lines.forEach((line: any) => {
                        if (line.items && Array.isArray(line.items)) {
                            line.items.forEach((item: any) => {
                                // Promosyon indirimleri
                                if (item.promotions && Array.isArray(item.promotions)) {
                                    item.promotions.forEach((promo: any) => {
                                        if (promo.amount && promo.amount.seller) {
                                            totalDiscount += Number(promo.amount.seller) || 0;
                                        }
                                    });
                                }

                                // Kupon indirimleri
                                if (item.coupon && item.coupon.amount && item.coupon.amount.seller) {
                                    totalDiscount += Number(item.coupon.amount.seller) || 0;
                                }
                            });
                        }
                    });
                }

                return basePrice - totalDiscount;
                
            case 'MIGROS':
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
                
                return 0;
                
            default:
                return 0;
        }
    }

    getCustomerName(order: Order): string {
        if (!order?.rawData) return '';

        switch (order.type) {
            case 'YEMEKSEPETI':
                const ysCustomer = order.rawData.customer;
                return `${ysCustomer?.firstName || ''} ${ysCustomer?.lastName || ''}`.trim();
                
            case 'GETIR':
                return order.rawData.client?.name || '';
                
            case 'TRENDYOL':
                const tyCustomer = order.rawData.customer;
                return `${tyCustomer?.firstName || ''} ${tyCustomer?.lastName || ''}`.trim();
                
            case 'MIGROS':
                if (order.rawData.customerInfo?.name) {
                    return order.rawData.customerInfo.name;
                } else if (order.rawData.customer) {
                    const customer: any = order.rawData.customer;
                    return customer.fullName || `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
                }
                return '';
                
            default:
                return '';
        }
    }

    // Store ID validation
    private validateAndCleanStoreId(storeId: string): string {
        if (!storeId) {
            throw new Error('Store ID boş olamaz');
        }
        
        // MongoDB ObjectId format kontrolü (24 hex karakter)
        if (!/^[0-9a-fA-F]{24}$/.test(storeId)) {
            console.warn(`⚠️ Geçersiz store ID formatı: ${storeId}`);
        }
        
        return storeId.trim();
    }

    destroy(): void {
        this.stopTrendyolSync();
        this.stopTrendyolRefundSync();
        this.stopYemeksepetiRefundSync();
    }
}
