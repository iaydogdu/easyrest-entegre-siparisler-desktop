# 📄 HTML Template ve Component Detayları - TAMAMEN DETAYLI

## 🎯 Orders Component HTML Template

### Tam HTML Yapısı (src/app/components/orders/orders.component.html)

```html
<!-- Desktop Header -->
<div class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 shadow-sm">
  <div class="flex justify-between items-center">
    <div class="flex items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
          <span class="text-white text-lg font-bold">ER</span>
        </div>
        <div>
          <h1 class="text-xl font-semibold text-gray-800 dark:text-white">
            EasyRest - {{ 'integratedorders' | translate }}
          </h1>
          <div class="text-sm text-gray-500 dark:text-gray-400">Desktop v1.0.0</div>
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-4">
      <!-- Kullanıcı Bilgisi -->
      <div class="text-right">
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ authService.getKullaniciAdi() }}
        </div>
        <div class="text-xs text-gray-500 dark:text-gray-400">
          {{ authService.getRole() }}
        </div>
      </div>
      
      <!-- Logout Button -->
      <button
        (click)="logout()"
        class="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors duration-200 flex items-center gap-2"
      >
        <span class="material-icons text-lg">logout</span>
        {{ 'logout' | translate }}
      </button>
    </div>
  </div>
</div>

<!-- Ana Container -->
<div class="flex flex-col lg:flex-row h-full dark:bg-black dark:text-white">
  <!-- Ana İçerik -->
  <div class="flex-1 p-4 bg-gray-100 dark:bg-gray-900">
    <!-- Başlık ve Özet -->
    <div class="mb-6 space-y-4">
      <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <!-- Mağaza Seçimi -->
        <div class="w-full lg:w-72">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Mağaza Seçimi:
          </label>
          <ng-select 
            [items]="stores" 
            bindLabel="magazaAdi" 
            bindValue="_id" 
            [(ngModel)]="selectedStore"
            (change)="onStoreChange($event)" 
            [clearable]="false" 
            [disabled]="loading"
            placeholder="{{ 'choosestore' | translate }}" 
            class="custom-multiselect">
            <ng-option *ngFor="let store of stores" [value]="store._id">
              <div class="flex items-center justify-between">
                <span>{{store.magazaAdi}}</span>
                <span class="text-xs text-gray-500">({{store.magazaKodu}})</span>
                <span *ngIf="store.aktif" class="text-green-500 text-xs">●</span>
              </div>
            </ng-option>
          </ng-select>
        </div>
      </div>

      <!-- Loading Indicator (Enhanced) -->
      <div *ngIf="loading" class="flex flex-col justify-center items-center py-12">
        <div class="relative">
          <div class="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="material-icons text-blue-600 text-2xl">restaurant</span>
          </div>
        </div>
        <p class="mt-6 text-gray-600 dark:text-gray-400 text-lg font-medium">Siparişler yükleniyor...</p>
        <div class="mt-2 text-sm text-gray-500 dark:text-gray-500">
          {{selectedStore ? (stores | find:'_id':selectedStore)?.magazaAdi : 'Mağaza'}} siparişleri kontrol ediliyor
        </div>
        <div class="mt-4 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400">
          <span class="material-icons text-sm">info</span>
          Bu işlem birkaç saniye sürebilir
        </div>
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-500">
          Backend: {{environment.baseappurl}}
        </div>
      </div>

      <!-- Connection Status Indicator -->
      <div *ngIf="!loading && isRefreshing" class="flex items-center justify-center py-2">
        <div class="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-sm">
          <div class="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
          <span>Güncelleniyor...</span>
          <span class="text-xs text-gray-500">({{lastRefreshTime | date:'HH:mm:ss'}})</span>
        </div>
      </div>

      <!-- ✅ Otomatik Sync Status Card -->
      <div *ngIf="!loading && selectedStore" class="mb-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex items-center gap-2 mb-3">
            <i class="bi bi-arrow-clockwise text-blue-600 dark:text-blue-400 text-lg"></i>
            <h3 class="text-sm font-medium text-gray-900 dark:text-white">Otomatik Sync Durumu</h3>
            <span class="text-xs text-gray-500 dark:text-gray-400">({{selectedStore}})</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Trendyol Siparişler Sync Status -->
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg border border-orange-200 dark:border-orange-700">
              <div class="flex items-center gap-3">
                <img src="/assets/images/trendyollogo.png" alt="Trendyol" class="w-6 h-6 object-contain">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Trendyol Siparişler</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Her 11 saniyede</div>
                  <div class="text-xs text-gray-400">packageStatuses=Created</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <i class="text-lg" [ngClass]="{
                  'bi bi-check-circle-fill text-green-600 dark:text-green-400': isTrendyolSyncRunning && !trendyolSyncInProgress,
                  'bi bi-arrow-repeat text-blue-600 dark:text-blue-400 animate-spin': isTrendyolSyncRunning && trendyolSyncInProgress,
                  'bi bi-pause-circle-fill text-gray-500 dark:text-gray-500': !isTrendyolSyncRunning
                }"></i>
                <span class="text-xs font-medium" [ngClass]="{
                  'text-green-600 dark:text-green-400': isTrendyolSyncRunning && !trendyolSyncInProgress,
                  'text-blue-600 dark:text-blue-400': isTrendyolSyncRunning && trendyolSyncInProgress,
                  'text-gray-500 dark:text-gray-500': !isTrendyolSyncRunning
                }">
                  {{ trendyolSyncInProgress ? 'Çalışıyor' : (isTrendyolSyncRunning ? 'Aktif' : 'Kapalı') }}
                </span>
              </div>
            </div>

            <!-- Trendyol İadeler Sync Status -->
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-700">
              <div class="flex items-center gap-3">
                <img src="/assets/images/trendyollogo.png" alt="Trendyol" class="w-6 h-6 object-contain">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">Trendyol İadeler</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Her 1 saatte</div>
                  <div class="text-xs text-gray-400">Son 48 saat</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <i class="text-lg" [ngClass]="{
                  'bi bi-check-circle-fill text-green-600 dark:text-green-400': isTrendyolRefundSyncRunning && !trendyolRefundSyncInProgress,
                  'bi bi-arrow-repeat text-blue-600 dark:text-blue-400 animate-spin': isTrendyolRefundSyncRunning && trendyolRefundSyncInProgress,
                  'bi bi-pause-circle-fill text-gray-500 dark:text-gray-500': !isTrendyolRefundSyncRunning
                }"></i>
                <span class="text-xs font-medium" [ngClass]="{
                  'text-green-600 dark:text-green-400': isTrendyolRefundSyncRunning && !trendyolRefundSyncInProgress,
                  'text-blue-600 dark:text-blue-400': isTrendyolRefundSyncRunning && trendyolRefundSyncInProgress,
                  'text-gray-500 dark:text-gray-500': !isTrendyolRefundSyncRunning
                }">
                  {{ trendyolRefundSyncInProgress ? 'Çalışıyor' : (isTrendyolRefundSyncRunning ? 'Aktif' : 'Kapalı') }}
                </span>
              </div>
            </div>

            <!-- Yemek Sepeti İadeler Sync Status -->
            <div class="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div class="flex items-center gap-3">
                <img src="/assets/images/yemek-sepeti.png" alt="YemekSepeti" class="w-6 h-6 object-contain">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">YemekSepeti İadeler</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Her 3 saatte</div>
                  <div class="text-xs text-gray-400">status=cancelled</div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <i class="text-lg" [ngClass]="{
                  'bi bi-check-circle-fill text-green-600 dark:text-green-400': isYemeksepetiRefundSyncRunning && !yemeksepetiRefundSyncInProgress,
                  'bi bi-arrow-repeat text-blue-600 dark:text-blue-400 animate-spin': isYemeksepetiRefundSyncRunning && yemeksepetiRefundSyncInProgress,
                  'bi bi-pause-circle-fill text-gray-500 dark:text-gray-500': !isYemeksepetiRefundSyncRunning
                }"></i>
                <span class="text-xs font-medium" [ngClass]="{
                  'text-green-600 dark:text-green-400': isYemeksepetiRefundSyncRunning && !yemeksepetiRefundSyncInProgress,
                  'text-blue-600 dark:text-blue-400': isYemeksepetiRefundSyncRunning && yemeksepetiRefundSyncInProgress,
                  'text-gray-500 dark:text-gray-500': !isYemeksepetiRefundSyncRunning
                }">
                  {{ yemeksepetiRefundSyncInProgress ? 'Çalışıyor' : (isYemeksepetiRefundSyncRunning ? 'Aktif' : 'Kapalı') }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Özet Bilgileri ve Kontroller -->
      <ng-container *ngIf="!loading">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <!-- Sipariş Sayıları ve Filtreler -->
            <div class="flex flex-wrap items-center gap-3">
              <span class="text-lg font-semibold text-gray-700 dark:text-gray-300">
                {{ 'total' | translate }}: {{summary.total}}
              </span>
              
              <!-- Platform Filtreleri -->
              <div class="flex flex-wrap items-center gap-2">
                <!-- Tümü Butonu -->
                <button 
                  (click)="filteredOrder('ALL')"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2"
                  [ngClass]="currentFilter === 'ALL' ? 
                    'bg-gray-800 text-white border-gray-800' : 
                    'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'"
                >
                  <span class="material-icons text-lg">apps</span>
                  <span>Tümü</span>
                  <span class="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {{summary.total}}
                  </span>
                </button>

                <!-- YemekSepeti -->
                <button 
                  (click)="filteredOrder('YEMEKSEPETI')"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2"
                  [ngClass]="currentFilter === 'YEMEKSEPETI' ? 
                    'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/25' : 
                    'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 dark:bg-gray-700 dark:text-blue-400 dark:border-blue-600'"
                >
                  <img src="/assets/images/yemek-sepeti.png" alt="YemekSepeti" class="w-5 h-5 object-contain">
                  <span class="hidden sm:inline">YemekSepeti</span>
                  <span class="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {{summary.byType.yemeksepeti}}
                  </span>
                </button>

                <!-- Trendyol -->
                <button 
                  (click)="filteredOrder('TRENDYOL')"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2"
                  [ngClass]="currentFilter === 'TRENDYOL' ? 
                    'bg-orange-600 text-white border-orange-600 shadow-lg shadow-orange-500/25' : 
                    'bg-white text-orange-600 border-orange-200 hover:bg-orange-50 dark:bg-gray-700 dark:text-orange-400 dark:border-orange-600'"
                >
                  <img src="/assets/images/trendyollogo.png" alt="Trendyol" class="w-5 h-5 object-contain">
                  <span class="hidden sm:inline">Trendyol</span>
                  <span class="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {{summary.byType.trendyol}}
                  </span>
                </button>

                <!-- Migros -->
                <button 
                  (click)="filteredOrder('MIGROS')"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2"
                  [ngClass]="currentFilter === 'MIGROS' ? 
                    'bg-green-600 text-white border-green-600 shadow-lg shadow-green-500/25' : 
                    'bg-white text-green-600 border-green-200 hover:bg-green-50 dark:bg-gray-700 dark:text-green-400 dark:border-green-600'"
                >
                  <img src="/assets/images/migros-yemek.png" alt="Migros" class="w-5 h-5 object-contain">
                  <span class="hidden sm:inline">Migros</span>
                  <span class="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {{summary.byType.migros}}
                  </span>
                </button>

                <!-- Getir -->
                <button 
                  (click)="filteredOrder('GETIR')"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border-2"
                  [ngClass]="currentFilter === 'GETIR' ? 
                    'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/25' : 
                    'bg-white text-purple-600 border-purple-200 hover:bg-purple-50 dark:bg-gray-700 dark:text-purple-400 dark:border-purple-600'"
                >
                  <img src="/assets/images/getir.png" alt="Getir" class="w-5 h-5 object-contain">
                  <span class="hidden sm:inline">Getir</span>
                  <span class="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full text-xs font-bold">
                    {{summary.byType.getir}}
                  </span>
                </button>
              </div>
            </div>

            <!-- Kontrol Butonları -->
            <div class="flex items-center gap-3">
              <!-- Ses Kontrol -->
              <button 
                (click)="toggleSound()"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                [ngClass]="isSoundEnabled ? 
                  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 shadow-lg shadow-green-500/20' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'"
              >
                <span class="material-icons text-lg">
                  {{isSoundEnabled ? 'volume_up' : 'volume_off'}}
                </span>
                <span class="hidden sm:inline">
                  {{isSoundEnabled ? 'Ses Açık' : 'Ses Kapalı'}}
                </span>
                <div *ngIf="isSoundEnabled && isPlaying" class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </button>

              <!-- Otomatik Onay Kontrol -->
              <button 
                (click)="toggleAutoApprove()"
                class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                [ngClass]="isAutoApproveEnabled ? 
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shadow-lg shadow-blue-500/20' : 
                  'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'"
              >
                <span class="material-icons text-lg">
                  {{isAutoApproveEnabled ? 'auto_awesome' : 'auto_awesome_off'}}
                </span>
                <span class="hidden sm:inline">
                  {{isAutoApproveEnabled ? 'Otomatik Onay Açık' : 'Otomatik Onay Kapalı'}}
                </span>
                <div *ngIf="isAutoApproveEnabled" class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              </button>

              <!-- Manual Refresh -->
              <button 
                (click)="loadOrders()"
                [disabled]="loading || isRefreshing"
                class="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-300 text-white rounded-lg text-sm font-medium transition-colors duration-200"
              >
                <span class="material-icons text-lg" [class.animate-spin]="loading || isRefreshing">refresh</span>
                <span class="hidden sm:inline">Yenile</span>
              </button>
            </div>
          </div>

          <!-- Bağlantı Durumu ve İstatistikler -->
          <div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between text-sm">
              <div class="flex items-center gap-4">
                <!-- Bağlantı Durumu -->
                <div class="flex items-center gap-2">
                  <div class="w-3 h-3 rounded-full" [ngClass]="{
                    'bg-green-500 animate-pulse': !loading && !isRefreshing && consecutiveFailures === 0,
                    'bg-blue-500 animate-spin': isRefreshing,
                    'bg-yellow-500 animate-pulse': loading,
                    'bg-red-500 animate-ping': consecutiveFailures > 0
                  }"></div>
                  <span class="text-gray-600 dark:text-gray-400">
                    {{ loading ? 'Yükleniyor' : 
                       isRefreshing ? 'Güncelleniyor' : 
                       consecutiveFailures > 0 ? 'Bağlantı Sorunu (' + consecutiveFailures + ')' : 'Bağlı' }}
                  </span>
                </div>

                <!-- Son Güncelleme -->
                <div class="text-gray-500 dark:text-gray-400">
                  Son güncelleme: {{ lastRefreshTime ? (lastRefreshTime | date:'HH:mm:ss') : 'Henüz yok' }}
                </div>
              </div>

              <!-- Yeni Sipariş Sayısı -->
              <div *ngIf="newOrders.size > 0" class="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium">
                <span class="material-icons text-lg animate-pulse">notifications_active</span>
                <span>{{newOrders.size}} yeni sipariş</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Sipariş Listesi -->
    <div *ngIf="!loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      <ng-container *ngFor="let order of filteredOrders; trackBy: trackByOrderId">
        <div
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-200 dark:border-gray-700 overflow-hidden"
          [ngClass]="{
            'ring-4 ring-red-500 ring-opacity-50 shadow-2xl shadow-red-500/25 transform scale-105 new-order-animation': isNewOrder(order),
            'border-l-4 border-l-blue-500': order.type === 'YEMEKSEPETI',
            'border-l-4 border-l-orange-500': order.type === 'TRENDYOL',
            'border-l-4 border-l-green-500': order.type === 'MIGROS',
            'border-l-4 border-l-purple-500': order.type === 'GETIR'
          }"
          (click)="openOrderDetails(order)"
        >
          <!-- Sipariş Başlığı -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700" [ngClass]="{
            'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20': isNewOrder(order)
          }">
            <div class="flex justify-between items-start">
              <div class="flex items-center gap-3">
                <div class="relative">
                  <img [src]="getSourceLogo(order.type)" [alt]="order.type"
                    class="w-12 h-12 object-contain rounded-lg bg-white p-1 shadow-sm">
                  
                  <!-- Yeni Sipariş Indicator -->
                  <div *ngIf="isNewOrder(order)" class="absolute -top-2 -right-2">
                    <span class="flex h-4 w-4">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  </div>
                </div>
                
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-bold" [ngClass]="{
                      'text-red-600 dark:text-red-400': isNewOrder(order),
                      'text-gray-900 dark:text-white': !isNewOrder(order)
                    }">
                      #{{getOrderId(order)}}
                    </span>
                    
                    <!-- Yeni Badge -->
                    <span *ngIf="isNewOrder(order)" 
                      class="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                      YENİ
                    </span>
                  </div>
                  
                  <!-- Status Badge -->
                  <span [class]="'inline-block px-3 py-1 text-xs font-medium rounded-full mt-1 ' + getStatusClass(order.status)">
                    {{getStatusText(order.status)}}
                  </span>
                  
                  <!-- Order Type -->
                  <div class="mt-2">
                    <span class="px-2 py-1 text-xs rounded-md bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {{getOrderType(order)}}
                    </span>
                  </div>
                  
                  <!-- İleri Tarihli Sipariş Zamanı -->
                  <div *ngIf="order.type === 'GETIR' && (order.status.toString() === '325' || order.status.toString() === '1600') && order.rawData?.isScheduled" 
                    class="mt-2 flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded">
                    <span class="material-icons text-sm">schedule</span>
                    <span>Sipariş Zamanı: {{formatDate(order.rawData.scheduledDate)}}</span>
                  </div>
                </div>
              </div>
              
              <!-- Fiyat ve Ödeme -->
              <div class="text-right">
                <div class="text-xl font-bold text-gray-900 dark:text-white">
                  {{formatPrice(getOrderAmount(order))}} ₺
                </div>
                <div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {{getPaymentType(order)}}
                </div>
                
                <!-- Payment Mapping Status -->
                <div class="mt-1">
                  <span *ngIf="hasPaymentMapping(order)" class="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <span class="material-icons text-sm">check_circle</span>
                    <span>Ödeme Eşleşmiş</span>
                  </span>
                  <span *ngIf="!hasPaymentMapping(order)" class="text-xs text-red-500 flex items-center gap-1">
                    <span class="material-icons text-sm">error</span>
                    <span>Ödeme Eşleşmemiş</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Sipariş İçeriği -->
          <div class="p-4">
            <!-- Müşteri Bilgisi -->
            <div class="flex justify-between items-center mb-3">
              <div class="flex items-center gap-2">
                <span class="material-icons text-lg text-gray-500">person</span>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{getCustomerName(order)}}
                </span>
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">
                {{formatDate(order.createdAt)}}
              </span>
            </div>

            <!-- Telefon Numarası -->
            <div *ngIf="getCustomerPhone(order)" class="flex items-center gap-2 mb-3">
              <span class="material-icons text-sm text-gray-500">phone</span>
              <span class="text-xs text-gray-600 dark:text-gray-400">
                {{getCustomerPhone(order)}}
              </span>
            </div>

            <!-- Ürün Listesi (İlk 3) -->
            <div class="space-y-2">
              <ng-container *ngFor="let product of getProducts(order); let i = index">
                <div *ngIf="i < 3" class="flex justify-between items-center text-sm">
                  <div class="flex items-start gap-2 flex-1">
                    <span class="text-gray-700 dark:text-gray-300 truncate">
                      {{getProductName(product)}}
                    </span>
                    
                    <!-- Ürün Eşleştirme Durumu -->
                    <span class="text-xs" [ngClass]="{
                      'text-green-500': (order.type !== 'TRENDYOL' && product.mapping?.localProduct) || (order.type === 'TRENDYOL' && product.mapping?.eslestirilenUrun),
                      'text-red-500': (order.type !== 'TRENDYOL' && !product.mapping?.localProduct) || (order.type === 'TRENDYOL' && !product.mapping?.eslestirilenUrun)
                    }">
                      {{ (order.type !== 'TRENDYOL' && product.mapping?.localProduct) || (order.type === 'TRENDYOL' && product.mapping?.eslestirilenUrun) ? '✓' : '✗' }}
                    </span>
                  </div>
                  <span class="text-gray-500 dark:text-gray-400 font-medium ml-2">
                    x{{getProductQuantity(product)}}
                  </span>
                </div>
              </ng-container>
              
              <!-- Daha fazla ürün varsa -->
              <div *ngIf="(getProducts(order)?.length || 0) > 3" 
                class="text-sm text-blue-600 dark:text-blue-400 font-medium">
                +{{(getProducts(order).length || 0) - 3}} {{ 'moreproducts' | translate }}...
              </div>
            </div>

            <!-- Eşleştirme ve Onay Durumu -->
            <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
              <!-- Eşleştirme Durumu -->
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-500 dark:text-gray-400">Eşleştirme:</span>
                <span [ngClass]="{
                  'text-green-600 dark:text-green-400': !hasAnyMapping(order),
                  'text-red-500': hasAnyMapping(order)
                }" class="text-xs font-medium flex items-center gap-1">
                  <span class="material-icons text-sm">
                    {{ !hasAnyMapping(order) ? 'check_circle' : 'error' }}
                  </span>
                  {{ !hasAnyMapping(order) ? 'Tamamlanmış' : 'Eksiklikler Var' }}
                </span>
              </div>

              <!-- Otomatik Onay Indicator -->
              <div *ngIf="isAutoApproveEnabled && canAutoApproveOrder(order)" 
                class="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                <span class="material-icons text-sm animate-pulse">auto_awesome</span>
                <span>Otomatik onaylanacak</span>
              </div>

              <!-- Manual Onay Gerekli -->
              <div *ngIf="!canAutoApproveOrder(order) && isNewOrder(order)" 
                class="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                <span class="material-icons text-sm">touch_app</span>
                <span>Manuel onay gerekli</span>
              </div>
            </div>
          </div>
        </div>
      </ng-container>
    </div>

    <!-- Veri Yoksa (Enhanced) -->
    <div *ngIf="!loading && filteredOrders.length === 0" class="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
      <div class="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
        <span class="material-icons text-4xl text-gray-400 dark:text-gray-500">
          {{ currentFilter === 'ALL' ? 'inbox' : 'filter_list' }}
        </span>
      </div>
      
      <h3 class="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
        {{ currentFilter === 'ALL' ? 'Henüz sipariş yok' : currentFilter + ' siparişi bulunamadı' }}
      </h3>
      
      <p class="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-6">
        {{ currentFilter === 'ALL' ? 
          'Yeni siparişler geldiğinde burada görünecek. Otomatik sync sistemleri çalışıyor.' :
          'Bu platform için sipariş bulunamadı. Diğer platformları kontrol edebilirsiniz.' }}
      </p>
      
      <!-- Sync Status -->
      <div class="flex flex-col items-center gap-3">
        <div class="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <div class="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span>Bağlantı aktif - Siparişler takip ediliyor</span>
        </div>
        
        <div class="text-xs text-gray-400 dark:text-gray-500">
          Mağaza: {{ (stores | find:'_id':selectedStore)?.magazaAdi || 'Seçilmemiş' }}
        </div>
      </div>
    </div>
  </div>

  <!-- Overlay ve Sipariş Detay Drawer -->
  <div *ngIf="selectedOrder" 
    class="fixed inset-0 z-[9998] bg-black bg-opacity-50 backdrop-blur-sm transition-opacity duration-300"
    (click)="closeOrderDetails()">
  </div>

  <div [class.translate-x-0]="selectedOrder" [class.translate-x-full]="!selectedOrder"
    class="fixed top-0 right-0 z-[9999] w-full lg:w-[900px] h-full transition-transform duration-300 ease-in-out">
    <div class="h-full bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-2xl overflow-y-auto">
      
      <!-- Drawer Header -->
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 z-10">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-semibold">{{ 'orderdetail' | translate }}</h3>
          <button 
            (click)="closeOrderDetails()" 
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <span class="material-icons text-xl">close</span>
          </button>
        </div>
      </div>

      <!-- Sipariş Detayları -->
      <div *ngIf="selectedOrder" class="p-6 space-y-8">
        
        <!-- Sipariş Başlığı -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="relative">
                <img [src]="getSourceLogo(selectedOrder.type)" [alt]="selectedOrder.type"
                  class="w-16 h-16 object-contain rounded-xl bg-white p-2 shadow-md">
                
                <!-- Platform Badge -->
                <div class="absolute -bottom-1 -right-1 px-2 py-0.5 text-xs font-bold rounded-full text-white"
                  [ngClass]="{
                    'bg-blue-500': selectedOrder.type === 'YEMEKSEPETI',
                    'bg-orange-500': selectedOrder.type === 'TRENDYOL',
                    'bg-green-500': selectedOrder.type === 'MIGROS',
                    'bg-purple-500': selectedOrder.type === 'GETIR'
                  }">
                  {{selectedOrder.type}}
                </div>
              </div>
              
              <div>
                <div class="text-2xl font-bold flex items-center gap-2">
                  #{{getOrderId(selectedOrder)}}
                  <span *ngIf="isNewOrder(selectedOrder)" class="text-red-500 text-lg animate-pulse">🆕</span>
                </div>
                
                <div class="flex items-center gap-2 mt-2">
                  <span [class]="'inline-block px-4 py-1.5 rounded-full text-sm font-medium ' + getStatusClass(selectedOrder.status)">
                    {{getStatusText(selectedOrder.status)}}
                  </span>
                  
                  <!-- Auto Approve Indicator -->
                  <span *ngIf="isAutoApproveEnabled && canAutoApproveOrder(selectedOrder)" 
                    class="inline-block px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-medium">
                    <span class="material-icons text-sm mr-1">auto_awesome</span>
                    Otomatik Onaylanacak
                  </span>
                </div>
                
                <div class="mt-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                  <span class="material-icons text-sm">local_shipping</span>
                  <span>{{getOrderType(selectedOrder)}}</span>
                </div>
                
                <!-- İleri Tarihli Sipariş Zamanı -->
                <div *ngIf="selectedOrder.type === 'GETIR' && selectedOrder.rawData?.isScheduled"
                  class="mt-2 text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-lg">
                  <span class="material-icons text-sm">schedule</span>
                  <span>{{ 'ordertime' | translate }}: {{formatDate(selectedOrder.rawData.scheduledDate)}}</span>
                </div>
              </div>
            </div>
            
            <!-- Fiyat ve Ödeme Bilgisi -->
            <div class="text-right">
              <div class="text-3xl font-bold text-gray-900 dark:text-white">
                {{formatPrice(getOrderAmount(selectedOrder))}} ₺
              </div>
              <div class="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
                <span class="material-icons text-sm">payment</span>
                <span>{{getPaymentType(selectedOrder)}}</span>
              </div>
              
              <!-- Payment Mapping -->
              <div class="mt-2">
                <span *ngIf="hasPaymentMapping(selectedOrder)" class="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                  <span class="material-icons text-sm">check_circle</span>
                  <span>({{getPaymentMappingName(selectedOrder)}})</span>
                </span>
                <span *ngIf="!hasPaymentMapping(selectedOrder)" class="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                  <span class="material-icons text-sm">error</span>
                  <span>({{ 'nopaymentmapping' | translate }})</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Müşteri Bilgileri -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span class="material-icons">person</span>
            {{ 'customerinformation' | translate }}
          </h4>
          
          <div class="bg-gray-50 dark:bg-gray-900 p-6 rounded-xl space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Ad Soyad -->
              <div class="flex items-center gap-3">
                <span class="material-icons text-gray-500">badge</span>
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'namesurname' | translate }}</div>
                  <div class="font-medium">{{getCustomerName(selectedOrder)}}</div>
                </div>
              </div>
              
              <!-- Telefon -->
              <div class="flex items-center gap-3">
                <span class="material-icons text-gray-500">phone</span>
                <div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'phone' | translate }}</div>
                  <div class="font-medium">{{getCustomerPhone(selectedOrder)}}</div>
                </div>
              </div>
            </div>
            
            <!-- Adres Bilgileri -->
            <ng-container *ngIf="getDeliveryAddress(selectedOrder) as address">
              <div *ngIf="address.address" class="flex items-start gap-3">
                <span class="material-icons text-gray-500 mt-1">location_on</span>
                <div class="flex-1">
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'address' | translate }}</div>
                  <div class="font-medium">{{address.address}}</div>
                </div>
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4" *ngIf="address.doorNo || address.floor">
                <div *ngIf="address.doorNo" class="flex items-center gap-3">
                  <span class="material-icons text-gray-500">door_front</span>
                  <div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'flat' | translate }}</div>
                    <div class="font-medium">{{address.doorNo}}</div>
                  </div>
                </div>
                
                <div *ngIf="address.floor" class="flex items-center gap-3">
                  <span class="material-icons text-gray-500">layers</span>
                  <div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'floor' | translate }}</div>
                    <div class="font-medium">{{address.floor}}</div>
                  </div>
                </div>
              </div>
              
              <div *ngIf="address.description" class="flex items-start gap-3">
                <span class="material-icons text-gray-500 mt-1">note</span>
                <div class="flex-1">
                  <div class="text-xs text-gray-500 dark:text-gray-400">{{ 'note' | translate }}</div>
                  <div class="font-medium">{{address.description}}</div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>

        <!-- Ürünler Detayı -->
        <div class="space-y-4">
          <h4 class="text-lg font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span class="material-icons">restaurant_menu</span>
            {{ 'ordercontent' | translate }}
            <span class="text-sm text-gray-500">({{getProducts(selectedOrder).length}} ürün)</span>
          </h4>
          
          <div class="space-y-4">
            <div *ngFor="let product of getProducts(selectedOrder); let i = index" 
              class="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              
              <!-- Ürün Header -->
              <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                  <div class="flex items-start gap-3">
                    <!-- Ürün Adı -->
                    <div class="flex-1">
                      <span class="font-medium text-base text-gray-900 dark:text-white">
                        {{getProductName(product)}}
                      </span>
                      
                      <!-- Ürün Eşleştirme Durumu -->
                      <div class="flex items-center gap-2 mt-1">
                        <span class="text-xs text-gray-500">{{ 'mapping' | translate }}:</span>
                        <span *ngIf="(selectedOrder?.type !== 'TRENDYOL' && product.mapping?.localProduct) ||
                                    (selectedOrder?.type === 'TRENDYOL' && product.mapping?.eslestirilenUrun)"
                          class="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <span class="material-icons text-sm">check_circle</span>
                          <span>{{selectedOrder?.type === 'TRENDYOL' ? product.mapping.eslestirilenUrun.urunAdi : product.mapping.localProduct.urunAdi}}</span>
                        </span>
                        <span *ngIf="(selectedOrder?.type !== 'TRENDYOL' && !product.mapping?.localProduct) ||
                                    (selectedOrder?.type === 'TRENDYOL' && !product.mapping?.eslestirilenUrun)"
                          class="text-red-500 flex items-center gap-1 text-xs">
                          <span class="material-icons text-sm">error</span>
                          <span>{{ 'nomapping' | translate }}</span>
                        </span>
                      </div>
                    </div>
                    
                    <!-- Miktar ve Fiyat -->
                    <div class="text-right">
                      <div class="font-medium text-lg">x{{getProductQuantity(product)}}</div>
                      <div class="text-sm text-gray-500">{{(product.price || 0) | currency:'TRY':'symbol':'1.2-2'}}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Platform-Specific Ürün Detayları -->
              
              <!-- Getir Ürün Seçimleri -->
              <div *ngIf="selectedOrder?.type === 'GETIR' && product?.options?.length > 0"
                class="mt-4 space-y-3 pl-4 border-l-2 border-purple-200 dark:border-purple-700">
                <h5 class="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                  <span class="material-icons text-sm">tune</span>
                  Ürün Seçimleri
                </h5>
                
                <div *ngFor="let category of product.options" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span class="material-icons text-sm text-gray-500">category</span>
                    <div class="font-medium text-sm">{{category.name?.tr || category.name?.en}}</div>
                  </div>
                  
                  <div class="pl-6 space-y-2">
                    <div *ngFor="let option of category.options" class="space-y-1">
                      <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                          <span class="material-icons text-sm text-gray-400">arrow_right</span>
                          <span class="text-sm text-gray-700 dark:text-gray-300">
                            {{option.name?.tr || option.name?.en}}
                          </span>
                          <span *ngIf="option.price > 0" class="text-xs text-gray-500">
                            (+{{formatPrice(option.price)}} ₺)
                          </span>
                        </div>
                        
                        <!-- Option Eşleştirme -->
                        <div class="flex items-center gap-1">
                          <span *ngIf="option.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                            <span class="material-icons text-xs">check</span>
                            <span>{{option.mapping.localProduct.urunAdi}}</span>
                          </span>
                          <span *ngIf="!option.mapping?.localProduct" class="text-red-500 text-xs flex items-center gap-1">
                            <span class="material-icons text-xs">close</span>
                            <span>{{ 'nomapping' | translate }}</span>
                          </span>
                        </div>
                      </div>

                      <!-- Alt Seçenekler (Soslar, Çıkarılacak Malzemeler) -->
                      <div *ngIf="option.optionCategories && option.optionCategories.length > 0" class="pl-4 space-y-1">
                        <div *ngFor="let optionCategory of option.optionCategories">
                          <div class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {{optionCategory.name?.tr || optionCategory.name?.en}}:
                          </div>
                          <div class="pl-2 space-y-1">
                            <div *ngFor="let subOption of optionCategory.options" class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                                <span class="text-xs text-gray-600 dark:text-gray-400">
                                  {{subOption.name?.tr || subOption.name?.en}}
                                </span>
                                <span *ngIf="subOption.price > 0" class="text-xs text-gray-500">
                                  (+{{formatPrice(subOption.price)}} ₺)
                                </span>
                              </div>
                              
                              <!-- SubOption Eşleştirme -->
                              <div class="flex items-center gap-1">
                                <span *ngIf="subOption.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs">
                                  ✓ {{subOption.mapping.localProduct.urunAdi}}
                                </span>
                                <span *ngIf="!subOption.mapping?.localProduct" class="text-red-500 text-xs">
                                  ✗ {{ 'nomapping' | translate }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Migros Ürün Seçimleri -->
              <div *ngIf="selectedOrder?.type === 'MIGROS' && product?.options?.length > 0"
                class="mt-4 space-y-3 pl-4 border-l-2 border-green-200 dark:border-green-700">
                <h5 class="text-sm font-medium text-green-700 dark:text-green-300 flex items-center gap-2">
                  <span class="material-icons text-sm">tune</span>
                  Ürün Seçimleri
                </h5>
                
                <div *ngFor="let option of product.options" class="space-y-2">
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div class="flex items-center justify-between mb-2">
                      <div class="flex items-center gap-2">
                        <span class="material-icons text-sm text-gray-500">label</span>
                        <div class="font-medium text-sm">{{option.headerName}}</div>
                      </div>
                      
                      <!-- Option Eşleştirme -->
                      <div class="flex items-center gap-1">
                        <span *ngIf="option.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">check</span>
                          <span>{{option.mapping.localProduct.urunAdi}}</span>
                        </span>
                        <span *ngIf="!option.mapping?.localProduct" class="text-red-500 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">close</span>
                          <span>{{ 'nomapping' | translate }}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div class="flex items-center justify-between">
                      <div class="text-sm text-gray-600 dark:text-gray-400">
                        {{option.itemNames}}
                      </div>
                      <div *ngIf="option.primaryDiscountedPrice > 0" class="text-xs text-gray-500">
                        (+{{option.primaryDiscountedPriceText}})
                      </div>
                    </div>

                    <!-- Migros Alt Seçenekler -->
                    <div *ngIf="option.subOptions && option.subOptions.length > 0" class="mt-3 pl-3 border-l border-gray-200 dark:border-gray-600">
                      <div *ngFor="let subOption of option.subOptions" class="mb-2">
                        <div class="flex items-center justify-between">
                          <div class="flex items-center gap-2">
                            <span class="material-icons text-sm text-gray-400">subdirectory_arrow_right</span>
                            <div>
                              <div class="text-xs font-medium text-gray-600 dark:text-gray-400">{{subOption.headerName}}</div>
                              <div class="text-sm">{{subOption.itemNames}}</div>
                            </div>
                          </div>
                          
                          <!-- SubOption Eşleştirme -->
                          <div class="flex items-center gap-1">
                            <span *ngIf="subOption.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs">
                              ✓ {{subOption.mapping.localProduct.urunAdi}}
                            </span>
                            <span *ngIf="!subOption.mapping?.localProduct" class="text-red-500 text-xs">
                              ✗ {{ 'nomapping' | translate }}
                            </span>
                          </div>
                        </div>
                        
                        <div *ngIf="subOption.primaryDiscountedPrice > 0" class="text-xs text-gray-500 ml-6">
                          (+{{subOption.primaryDiscountedPriceText}})
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- YemekSepeti Ürün Seçimleri -->
              <div *ngIf="selectedOrder?.type === 'YEMEKSEPETI' && hasSelectedToppings(product)"
                class="mt-4 space-y-3 pl-4 border-l-2 border-blue-200 dark:border-blue-700">
                <h5 class="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                  <span class="material-icons text-sm">add_circle</span>
                  Seçili Toppings
                </h5>
                
                <div *ngFor="let topping of getSelectedToppings(product)" class="space-y-2">
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-icons text-sm text-gray-500">add</span>
                        <div class="font-medium text-sm">{{topping?.name || ''}}</div>
                      </div>
                      
                      <!-- Topping Eşleştirme -->
                      <div class="flex items-center gap-1">
                        <span *ngIf="topping.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">check</span>
                          <span>{{topping.mapping.localProduct.urunAdi}}</span>
                        </span>
                        <span *ngIf="!topping.mapping?.localProduct" class="text-red-500 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">close</span>
                          <span>{{ 'nomapping' | translate }}</span>
                        </span>
                      </div>
                    </div>
                    
                    <!-- Children -->
                    <div *ngIf="topping?.children?.length > 0" class="mt-2 pl-3 border-l border-gray-200 dark:border-gray-600">
                      <div *ngFor="let child of topping.children" class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                          <span class="w-1 h-1 bg-gray-400 rounded-full"></span>
                          <span class="text-sm text-gray-600 dark:text-gray-400">
                            {{child?.name || ''}}
                          </span>
                          <span *ngIf="child?.price > 0" class="text-xs text-gray-500">
                            (+{{formatPrice(child.price)}} ₺)
                          </span>
                        </div>
                        
                        <!-- Child Eşleştirme -->
                        <div class="flex items-center gap-1">
                          <span *ngIf="child.mapping?.localProduct" class="text-green-600 dark:text-green-400 text-xs">
                            ✓ {{child.mapping.localProduct.urunAdi}}
                          </span>
                          <span *ngIf="!child.mapping?.localProduct" class="text-red-500 text-xs">
                            ✗ {{ 'nomapping' | translate }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Trendyol Ürün Seçimleri -->
              <div *ngIf="selectedOrder?.type === 'TRENDYOL' && product?.modifierProducts?.length > 0"
                class="mt-4 space-y-3 pl-4 border-l-2 border-orange-200 dark:border-orange-700">
                <h5 class="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                  <span class="material-icons text-sm">extension</span>
                  Modifier Products
                </h5>
                
                <div *ngFor="let modifier of product.modifierProducts" class="space-y-2">
                  <div class="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="material-icons text-sm" [ngClass]="{
                          'text-red-500': modifier.name?.toLowerCase().includes('istemiyorum'),
                          'text-gray-500': !modifier.name?.toLowerCase().includes('istemiyorum')
                        }">
                          {{ modifier.name?.toLowerCase().includes('istemiyorum') ? 'remove_circle' : 'add_circle' }}
                        </span>
                        <div class="font-medium text-sm" [ngClass]="{
                          'text-red-600 dark:text-red-400': modifier.name?.toLowerCase().includes('istemiyorum'),
                          'text-gray-900 dark:text-white': !modifier.name?.toLowerCase().includes('istemiyorum')
                        }">
                          {{modifier.name || ''}}
                        </div>
                        <div *ngIf="modifier.price > 0" class="text-xs text-gray-500">
                          (+{{formatPrice(modifier.price)}} ₺)
                        </div>
                      </div>
                      
                      <!-- Modifier Eşleştirme -->
                      <div class="flex items-center gap-1">
                        <span *ngIf="modifier.mapping?.eslestirilenUrun" class="text-green-600 dark:text-green-400 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">check</span>
                          <span>{{modifier.mapping.eslestirilenUrun.urunAdi}}</span>
                        </span>
                        <span *ngIf="!modifier.mapping?.eslestirilenUrun" class="text-red-500 text-xs flex items-center gap-1">
                          <span class="material-icons text-xs">close</span>
                          <span>{{ 'nomapping' | translate }}</span>
                        </span>
                      </div>
                    </div>

                    <!-- Alt Modifierlar -->
                    <div *ngIf="modifier.modifierProducts?.length > 0" class="mt-2 pl-3 border-l border-gray-200 dark:border-gray-600">
                      <div *ngFor="let subModifier of modifier.modifierProducts" class="flex items-center justify-between mb-1">
                        <div class="flex items-center gap-2">
                          <span class="material-icons text-xs" [ngClass]="{
                            'text-red-500': subModifier.name?.toLowerCase().includes('istemiyorum'),
                            'text-gray-400': !subModifier.name?.toLowerCase().includes('istemiyorum')
                          }">
                            {{ subModifier.name?.toLowerCase().includes('istemiyorum') ? 'remove' : 'arrow_right' }}
                          </span>
                          <span class="text-sm" [ngClass]="{
                            'text-red-600 dark:text-red-400 line-through': subModifier.name?.toLowerCase().includes('istemiyorum'),
                            'text-gray-600 dark:text-gray-400': !subModifier.name?.toLowerCase().includes('istemiyorum')
                          }">
                            {{subModifier.name || ''}}
                          </span>
                          <span *ngIf="subModifier.price > 0" class="text-xs text-gray-500">
                            (+{{formatPrice(subModifier.price)}} ₺)
                          </span>
                        </div>
                        
                        <!-- SubModifier Eşleştirme -->
                        <div class="flex items-center gap-1">
                          <span *ngIf="subModifier.mapping?.eslestirilenUrun" class="text-green-600 dark:text-green-400 text-xs">
                            ✓ {{subModifier.mapping.eslestirilenUrun.urunAdi}}
                          </span>
                          <span *ngIf="!subModifier.mapping?.eslestirilenUrun" class="text-red-500 text-xs">
                            ✗ {{ 'nomapping' | translate }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sipariş Özeti ve Aksiyonlar -->
        <div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
          <!-- Özet Bilgiler -->
          <div class="flex justify-between items-center text-xl mb-6">
            <span class="font-medium flex items-center gap-2">
              <span class="material-icons">receipt</span>
              {{ 'totalamount' | translate }}
            </span>
            <span class="font-bold text-2xl">{{formatPrice(getOrderAmount(selectedOrder))}} ₺</span>
          </div>

          <!-- Onaylama Durumu -->
          <div class="mb-6 p-4 rounded-lg" [ngClass]="{
            'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700': !hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder),
            'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700': hasAnyMapping(selectedOrder) || !hasPaymentMapping(selectedOrder)
          }">
            <div class="flex items-center gap-2 mb-2">
              <span class="material-icons text-lg" [ngClass]="{
                'text-green-600': !hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder),
                'text-red-500': hasAnyMapping(selectedOrder) || !hasPaymentMapping(selectedOrder)
              }">
                {{ (!hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder)) ? 'check_circle' : 'error' }}
              </span>
              <span class="font-medium" [ngClass]="{
                'text-green-700 dark:text-green-300': !hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder),
                'text-red-700 dark:text-red-300': hasAnyMapping(selectedOrder) || !hasPaymentMapping(selectedOrder)
              }">
                {{ (!hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder)) ? 'Sipariş Onaylanabilir' : 'Onaylama Engelleri Var' }}
              </span>
            </div>
            
            <div class="text-sm space-y-1">
              <div class="flex items-center gap-2">
                <span class="material-icons text-sm" [ngClass]="{
                  'text-green-500': !hasAnyMapping(selectedOrder),
                  'text-red-500': hasAnyMapping(selectedOrder)
                }">
                  {{ !hasAnyMapping(selectedOrder) ? 'check' : 'close' }}
                </span>
                <span>Ürün Eşleştirmeleri: {{ !hasAnyMapping(selectedOrder) ? 'Tamamlanmış' : 'Eksiklikler Var' }}</span>
              </div>
              
              <div class="flex items-center gap-2">
                <span class="material-icons text-sm" [ngClass]="{
                  'text-green-500': hasPaymentMapping(selectedOrder),
                  'text-red-500': !hasPaymentMapping(selectedOrder)
                }">
                  {{ hasPaymentMapping(selectedOrder) ? 'check' : 'close' }}
                </span>
                <span>Ödeme Eşleştirmesi: {{ hasPaymentMapping(selectedOrder) ? 'Tamamlanmış' : 'Eksik' }}</span>
              </div>
            </div>
          </div>

          <!-- Aksiyon Butonları -->
          <div class="flex flex-wrap gap-3 justify-end">
            
            <!-- Eşleştirme Sayfasına Git -->
            <button 
              *ngIf="hasAnyMapping(selectedOrder)"
              (click)="goToMapping(selectedOrder.type)"
              class="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">link</span>
              <span>Eşleştirme Sayfası</span>
            </button>

            <!-- Sipariş Onaylama Butonu -->
            <button
              *ngIf="!hasAnyMapping(selectedOrder) && hasPaymentMapping(selectedOrder) && 
                    selectedOrder?.status?.toString() !== 'accepted' && selectedOrder?.status?.toString() !== '200' &&
                    ((selectedOrder?.type === 'YEMEKSEPETI' && (selectedOrder?.status?.toString() === 'processed' || selectedOrder?.status?.toString() === 'received')) ||
                     (selectedOrder?.type === 'GETIR' && (selectedOrder?.status?.toString() === '400' ||
                      (selectedOrder?.status?.toString() === '325' && selectedOrder?.rawData?.isScheduled) ||
                      (selectedOrder?.status?.toString() === '1600' && selectedOrder?.rawData?.isScheduled))) ||
                     (selectedOrder?.type === 'TRENDYOL' && selectedOrder?.rawData?.packageStatus?.toLowerCase() === 'created') ||
                     (selectedOrder?.type === 'MIGROS' && (selectedOrder?.status?.toString().toLowerCase().includes('new') || selectedOrder?.status?.toString().toLowerCase() === 'new_pending')))"
              (click)="approveOrder(selectedOrder)"
              class="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-all duration-200 flex items-center gap-2 font-medium"
            >
              <span class="material-icons text-lg">check_circle</span>
              <span>{{ 'confirmtheorder' | translate }}</span>
            </button>

            <!-- Tekrar Onay Gönder -->
            <button 
              (click)="approveOrder(selectedOrder)"
              class="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">refresh</span>
              <span>{{ 'tekraronaygonder' | translate }}</span>
            </button>

            <!-- Termal Yazdır -->
            <button 
              (click)="printToThermalPrinter(selectedOrder)"
              class="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">print</span>
              <span>Termal Yazdır</span>
            </button>

            <!-- Hesap Fişi Yazdır -->
            <button 
              (click)="printToThermalPrinterDestek(selectedOrder)"
              class="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">receipt_long</span>
              <span>Hesap Fişi</span>
            </button>

            <!-- JSON Kopyala -->
            <button 
              (click)="copyOrderJson(selectedOrder)"
              class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">code</span>
              <span>JSON Kopyala</span>
            </button>

            <!-- Mutfak Kontrolleri -->
            <button 
              *ngIf="!mutfakKullanimi" 
              (click)="hazirlandi(selectedOrder, 'hazirla')"
              class="px-4 py-2 bg-orange-500 hover:bg-green-400 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">restaurant</span>
              <span>Hazırlandı</span>
            </button>

            <button 
              *ngIf="!bankoKullanimi" 
              (click)="hazirlandi(selectedOrder, 'tamamlandi')"
              class="px-4 py-2 bg-orange-500 hover:bg-green-700 text-white rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <span class="material-icons text-lg">done_all</span>
              <span>Tamamlandı</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

## 🔧 Component TypeScript Metodları

### Temel Helper Metodları
```typescript
// src/app/components/orders/orders.component.ts

// Track by function for ngFor performance
trackByOrderId = (index: number, order: Order): string => {
  return this.getOrderId(order);
}

// Pipe alternatifi - Find pipe
findStore(stores: any[], field: string, value: any): any {
  return stores.find(store => store[field] === value);
}

// Format date for display
formatDate(date: string | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      console.warn('⚠️ Geçersiz tarih formatı:', date);
      return '';
    }
    
    return dateObj.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error('❌ Tarih formatlama hatası:', error, date);
    return '';
  }
}

// Format price with Turkish locale
formatPrice(price: number): string {
  if (typeof price !== 'number' || isNaN(price)) {
    console.warn('⚠️ Geçersiz fiyat değeri:', price);
    return '0,00';
  }
  
  // 2 ondalık basamağa yuvarla
  const roundedPrice = Math.round(price * 100) / 100;
  
  return roundedPrice.toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// Get payment icon based on type
getPaymentIcon(type: string | undefined): string {
  if (!type) return 'payment';

  const typeStr = type.toLowerCase();
  
  if (typeStr.includes('card') || typeStr.includes('kart')) {
    return 'credit_card';
  } else if (typeStr.includes('cash') || typeStr.includes('nakit')) {
    return 'payments';
  } else if (typeStr.includes('meal') || typeStr.includes('yemek')) {
    return 'restaurant';
  }
  
  return 'payment';
}
```

### Selected Toppings Helper
```typescript
hasSelectedToppings(product: any): boolean {
  return Array.isArray(product?.selectedToppings) && product.selectedToppings.length > 0;
}

getSelectedToppings(product: any): any[] {
  if (!this.hasSelectedToppings(product)) {
    return [];
  }
  
  return product.selectedToppings.filter((topping: any) => {
    // Null/undefined toppings'leri filtrele
    return topping && topping.name;
  });
}
```

### Order Completion Check
```typescript
isOrderCompleted(order: Order): boolean {
  if (!order || !order.status) return false;

  const status = order.status.toString().toLowerCase();

  // Platform bazında tamamlanma durumları
  switch (order.type) {
    case 'GETIR':
      // 700: tamamlandı, 800: iptal edildi
      return ['700', '800'].includes(status);
      
    case 'YEMEKSEPETI':
      return ['completed', 'delivered', 'cancelled'].includes(status);
      
    case 'TRENDYOL':
      return ['completed', 'delivered', 'cancelled'].includes(status);
      
    case 'MIGROS':
      return ['completed', 'delivered', 'cancelled', 'cancelled_by_customer', 'cancelled_by_restaurant'].includes(status);
      
    default:
      return ['completed', 'delivered', 'cancelled'].includes(status);
  }
}
```

### Page Visibility Control
```typescript
private setupPageVisibilityControl(): void {
  this.visibilityChangeListener = () => {
    this.isPageVisible = !document.hidden;
    console.log(`👁️ Page visibility değişti: ${this.isPageVisible ? 'görünür' : 'gizli'}`);
    
    // Görünür olduğunda hemen refresh yap
    if (this.isPageVisible && this.selectedStore && !this.loading) {
      setTimeout(() => {
        this.silentRefresh();
      }, 1000);
    }
  };

  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', this.visibilityChangeListener);
  }
}
```

Bu dosyada **HTML template'in tamamen detaylı** yapısı var! Artık resimdeki gibi sipariş bilgileri düzgün görünecek.

**Önemli HTML özellikleri:**
- ✅ Platform logoları ve renkli border'lar
- ✅ Yeni sipariş animasyonları ve badge'ler
- ✅ Eşleştirme durumu göstergeleri
- ✅ Platform-specific ürün detayları
- ✅ Responsive design
- ✅ Dark mode desteği
- ✅ Loading states
- ✅ Empty states

**Devam edeyim mi?** Son dosyalar:
- `09-BUILD-DEPLOY-GUIDE.md` (GitHub Actions, release)
- `10-KURULUM-REHBERI.md` (Adım adım kurulum)

🚀
