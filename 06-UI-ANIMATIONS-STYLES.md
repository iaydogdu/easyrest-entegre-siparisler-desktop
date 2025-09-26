# 🎨 UI Animations ve Styles - TAMAMEN DETAYLI

## 🌟 CSS Animations

### Yeni Sipariş Animasyonları
```css
/* src/app/components/orders/orders.component.css */

/* Ana yeni sipariş animasyonu */
@keyframes newOrderPulse {
  0% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
  }
  25% {
    transform: scale(1.02);
    opacity: 0.9;
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.5);
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
    box-shadow: 0 0 0 20px rgba(239, 68, 68, 0.3);
  }
  75% {
    transform: scale(1.02);
    opacity: 0.9;
    box-shadow: 0 0 0 10px rgba(239, 68, 68, 0.5);
  }
  100% {
    transform: scale(1);
    opacity: 1;
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
  }
}

.new-order-animation {
  animation: newOrderPulse 2s ease-in-out infinite;
  border: 2px solid #ef4444 !important;
  position: relative;
  z-index: 10;
}

/* Yeni sipariş badge animasyonu */
@keyframes badgePulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.new-order-badge {
  animation: badgePulse 1s ease-in-out infinite;
  background: linear-gradient(45deg, #ef4444, #dc2626);
  color: white;
  font-weight: bold;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Ping animasyonu (notification dot) */
@keyframes ping {
  75%, 100% {
    transform: scale(2);
    opacity: 0;
  }
}

.animate-ping {
  animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
}

/* Glow effect */
@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 5px rgba(239, 68, 68, 0.5);
  }
  50% {
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 0 30px rgba(239, 68, 68, 0.6);
  }
}

.new-order-glow {
  animation: glow 2s ease-in-out infinite;
}
```

### Loading Animations
```css
/* Spinner animasyonları */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Gelişmiş loading spinner */
@keyframes spinFade {
  0% {
    transform: rotate(0deg);
    opacity: 1;
  }
  50% {
    transform: rotate(180deg);
    opacity: 0.5;
  }
  100% {
    transform: rotate(360deg);
    opacity: 1;
  }
}

.loading-spinner-advanced {
  animation: spinFade 1.5s ease-in-out infinite;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #3498db;
  border-radius: 50%;
  width: 40px;
  height: 40px;
}

/* Pulse loading */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Skeleton loading */
@keyframes skeleton {
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
}

.skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200px 100%;
  animation: skeleton 1.5s infinite;
}
```

### Hover ve Transition Effects
```css
/* Card hover effects */
.order-card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.order-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.order-card:active {
  transform: translateY(-2px);
  transition: all 0.1s;
}

/* Button animations */
.btn-animated {
  transition: all 0.2s ease-in-out;
  position: relative;
  overflow: hidden;
}

.btn-animated:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.btn-animated:active {
  transform: translateY(0);
  box-shadow: 0 5px 10px rgba(0,0,0,0.2);
}

/* Ripple effect */
.btn-animated::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.3);
  transition: width 0.6s, height 0.6s, top 0.6s, left 0.6s;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.btn-animated:active::before {
  width: 300px;
  height: 300px;
}
```

## 🎯 Platform-Specific Styling

### Platform Renk Sistemi
```css
/* Platform-specific colors */
:root {
  --yemeksepeti-primary: #0066cc;
  --yemeksepeti-secondary: #004499;
  --yemeksepeti-light: #e6f2ff;
  
  --trendyol-primary: #f27a1a;
  --trendyol-secondary: #e6690a;
  --trendyol-light: #fff4e6;
  
  --migros-primary: #00a651;
  --migros-secondary: #008a44;
  --migros-light: #e6f7ed;
  
  --getir-primary: #5d3ebc;
  --getir-secondary: #4a329a;
  --getir-light: #f0ebff;
  
  --status-new: #3b82f6;
  --status-approved: #10b981;
  --status-cancelled: #ef4444;
  --status-completed: #8b5cf6;
}

/* Platform card styling */
.order-card-yemeksepeti {
  border-left: 4px solid var(--yemeksepeti-primary);
}

.order-card-yemeksepeti.new-order {
  background: linear-gradient(135deg, var(--yemeksepeti-light), #ffffff);
  border-left: 4px solid var(--yemeksepeti-primary);
}

.order-card-trendyol {
  border-left: 4px solid var(--trendyol-primary);
}

.order-card-trendyol.new-order {
  background: linear-gradient(135deg, var(--trendyol-light), #ffffff);
  border-left: 4px solid var(--trendyol-primary);
}

.order-card-migros {
  border-left: 4px solid var(--migros-primary);
}

.order-card-migros.new-order {
  background: linear-gradient(135deg, var(--migros-light), #ffffff);
  border-left: 4px solid var(--migros-primary);
}

.order-card-getir {
  border-left: 4px solid var(--getir-primary);
}

.order-card-getir.new-order {
  background: linear-gradient(135deg, var(--getir-light), #ffffff);
  border-left: 4px solid var(--getir-primary);
}
```

### Status Badge Styling
```css
/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
}

.status-badge-new {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  animation: pulse 2s infinite;
}

.status-badge-approved {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.status-badge-cancelled {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.status-badge-completed {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
}

.status-badge-pending {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

/* Status icons */
.status-badge::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.8;
}

.status-badge-new::before {
  animation: ping 1s infinite;
}
```

## 🌙 Dark Mode Support

### Dark Mode Variables
```css
/* Dark mode color scheme */
:root {
  --bg-primary: #ffffff;
  --bg-secondary: #f8fafc;
  --bg-tertiary: #f1f5f9;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-tertiary: #9ca3af;
  --border-primary: #e5e7eb;
  --border-secondary: #d1d5db;
}

[data-theme="dark"] {
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
  --text-primary: #f9fafb;
  --text-secondary: #d1d5db;
  --text-tertiary: #9ca3af;
  --border-primary: #374151;
  --border-secondary: #4b5563;
}

/* Dark mode sipariş kartları */
.dark .order-card {
  background: var(--bg-secondary);
  border-color: var(--border-primary);
  color: var(--text-primary);
}

.dark .order-card:hover {
  background: var(--bg-tertiary);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
}

/* Dark mode yeni sipariş */
.dark .order-card.new-order {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), var(--bg-secondary));
  border-color: #ef4444;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3);
}
```

### Responsive Design
```css
/* Mobile responsive */
@media (max-width: 768px) {
  .order-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .order-card {
    margin: 0 8px;
  }
  
  .order-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .order-amount {
    align-self: flex-end;
  }
  
  .control-buttons {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .control-button {
    flex: 1;
    min-width: 120px;
  }
}

/* Tablet responsive */
@media (min-width: 769px) and (max-width: 1024px) {
  .order-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
}

/* Desktop responsive */
@media (min-width: 1025px) {
  .order-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px;
  }
}

/* Large desktop */
@media (min-width: 1400px) {
  .order-grid {
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 24px;
  }
}
```

## 🎭 Component State Animations

### Loading State Animations
```css
/* Loading skeleton */
.skeleton-loader {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

@keyframes skeleton-loading {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.dark .skeleton-loader {
  background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
  background-size: 200% 100%;
}

/* Sipariş kartları için skeleton */
.order-card-skeleton {
  height: 200px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.order-card-skeleton .skeleton-header {
  height: 20px;
  width: 60%;
  margin-bottom: 12px;
}

.order-card-skeleton .skeleton-content {
  height: 16px;
  width: 100%;
  margin-bottom: 8px;
}

.order-card-skeleton .skeleton-content:last-child {
  width: 40%;
}
```

### Interactive Animations
```css
/* Button press animations */
@keyframes buttonPress {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.btn-press:active {
  animation: buttonPress 0.1s ease-in-out;
}

/* Success animation */
@keyframes successPulse {
  0% {
    background-color: #10b981;
    transform: scale(1);
  }
  50% {
    background-color: #059669;
    transform: scale(1.05);
  }
  100% {
    background-color: #10b981;
    transform: scale(1);
  }
}

.success-animation {
  animation: successPulse 0.6s ease-in-out;
}

/* Error shake animation */
@keyframes errorShake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10px);
  }
}

.error-shake {
  animation: errorShake 0.82s cubic-bezier(.36,.07,.19,.97) both;
}
```

## 📱 Responsive Layout System

### Grid Layout
```css
/* Ana grid sistemi */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 20px;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* Grid animations */
.orders-grid .order-card {
  opacity: 0;
  transform: translateY(20px);
  animation: slideInUp 0.4s ease-out forwards;
}

.orders-grid .order-card:nth-child(1) { animation-delay: 0.1s; }
.orders-grid .order-card:nth-child(2) { animation-delay: 0.2s; }
.orders-grid .order-card:nth-child(3) { animation-delay: 0.3s; }
.orders-grid .order-card:nth-child(4) { animation-delay: 0.4s; }
.orders-grid .order-card:nth-child(n+5) { animation-delay: 0.5s; }

@keyframes slideInUp {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Masonry layout için */
.orders-masonry {
  columns: auto;
  column-width: 350px;
  column-gap: 20px;
  padding: 20px;
}

.orders-masonry .order-card {
  break-inside: avoid;
  margin-bottom: 20px;
}
```

### Drawer Animation
```css
/* Sipariş detay drawer */
.order-drawer {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 100%;
  max-width: 800px;
  background: var(--bg-primary);
  box-shadow: -10px 0 25px rgba(0,0,0,0.15);
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  overflow-y: auto;
}

.order-drawer.open {
  transform: translateX(0);
}

.order-drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 999;
  pointer-events: none;
}

.order-drawer-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

/* Drawer content animations */
.drawer-content {
  padding: 24px;
  animation: slideInRight 0.4s ease-out;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

## 🎨 Custom Scrollbar

### Modern Scrollbar Design
```css
/* Custom scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--bg-tertiary);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: linear-gradient(135deg, #cbd5e1, #94a3b8);
  border-radius: 4px;
  transition: all 0.2s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(135deg, #94a3b8, #64748b);
}

::-webkit-scrollbar-corner {
  background: var(--bg-tertiary);
}

/* Firefox scrollbar */
* {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 var(--bg-tertiary);
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

.smooth-scroll {
  scroll-behavior: smooth;
}
```

## 🌈 Status Indicator Animations

### Sync Status Indicators
```css
/* Sync status animasyonları */
.sync-indicator {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.sync-indicator-active {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.sync-indicator-inactive {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  color: white;
}

.sync-indicator-running {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

/* Sync status icon animations */
.sync-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.sync-icon-active {
  background: #10b981;
  animation: pulse 2s infinite;
}

.sync-icon-running {
  background: #3b82f6;
  animation: spin 1s linear infinite;
}

.sync-icon-inactive {
  background: #6b7280;
}

/* Connection status */
.connection-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.connection-dot-connected {
  background: #10b981;
  animation: pulse 2s infinite;
}

.connection-dot-connecting {
  background: #f59e0b;
  animation: spin 1s linear infinite;
}

.connection-dot-disconnected {
  background: #ef4444;
  animation: errorShake 2s infinite;
}
```

## 🎯 Interactive Elements

### Control Button Styling
```css
/* Control buttons */
.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

.control-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  transition: left 0.5s;
}

.control-button:hover::before {
  left: 100%;
}

/* Sound button */
.sound-button-enabled {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.sound-button-enabled:hover {
  background: linear-gradient(135deg, #059669, #047857);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(16, 185, 129, 0.4);
}

.sound-button-disabled {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border-color: var(--border-primary);
}

.sound-button-disabled:hover {
  background: var(--bg-secondary);
  border-color: var(--border-secondary);
}

/* Auto approve button */
.auto-approve-button-enabled {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.auto-approve-button-enabled:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

/* Active indicator */
.control-button-active::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}
```

### Filter Button Animations
```css
/* Platform filter buttons */
.filter-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 2px solid;
  position: relative;
}

.filter-button-all {
  border-color: #6b7280;
  color: #6b7280;
  background: white;
}

.filter-button-all.active {
  background: #6b7280;
  color: white;
  transform: scale(1.05);
}

.filter-button-yemeksepeti {
  border-color: var(--yemeksepeti-primary);
  color: var(--yemeksepeti-primary);
  background: white;
}

.filter-button-yemeksepeti.active {
  background: var(--yemeksepeti-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);
}

.filter-button-trendyol {
  border-color: var(--trendyol-primary);
  color: var(--trendyol-primary);
  background: white;
}

.filter-button-trendyol.active {
  background: var(--trendyol-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(242, 122, 26, 0.3);
}

.filter-button-migros {
  border-color: var(--migros-primary);
  color: var(--migros-primary);
  background: white;
}

.filter-button-migros.active {
  background: var(--migros-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 166, 81, 0.3);
}

.filter-button-getir {
  border-color: var(--getir-primary);
  color: var(--getir-primary);
  background: white;
}

.filter-button-getir.active {
  background: var(--getir-primary);
  color: white;
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(93, 62, 188, 0.3);
}

/* Badge counter animations */
.filter-badge {
  background: rgba(0,0,0,0.1);
  color: inherit;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.filter-button.active .filter-badge {
  background: rgba(255,255,255,0.2);
  color: white;
}

/* Count change animation */
@keyframes countChange {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
    background: #fbbf24;
  }
  100% {
    transform: scale(1);
  }
}

.filter-badge.count-changed {
  animation: countChange 0.5s ease-in-out;
}
```

## 🎪 Advanced UI Components

### Toast Notification Styling
```css
/* Toast container */
.toast-container {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
}

.toast-notification {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  margin: 8px;
  padding: 16px 20px;
  max-width: 400px;
  min-width: 300px;
  pointer-events: auto;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(100%);
  opacity: 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

.toast-notification.show {
  transform: translateX(0);
  opacity: 1;
}

.toast-notification:hover {
  transform: translateX(-5px) scale(1.02);
  box-shadow: 0 15px 35px rgba(0,0,0,0.2);
}

/* Toast types */
.toast-success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.toast-error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.toast-warning {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.toast-info {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
}

/* Toast content */
.toast-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toast-icon {
  font-size: 20px;
  opacity: 0.9;
}

.toast-message {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
}

.toast-close {
  font-size: 16px;
  opacity: 0.7;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.toast-close:hover {
  opacity: 1;
}
```

### Modal ve Overlay Styling
```css
/* Modal overlay */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.modal-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

/* Modal content */
.modal-content {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  background: var(--bg-primary);
  border-radius: 16px;
  box-shadow: 0 25px 50px rgba(0,0,0,0.25);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  z-index: 9999;
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-content.visible {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}
```

## 🎨 Theme System

### Dynamic Theme Switching
```typescript
// Theme service
export class ThemeService {
  private currentTheme: 'light' | 'dark' = 'light';
  
  constructor() {
    this.loadTheme();
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    this.currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    this.applyTheme();
  }

  toggleTheme(): void {
    this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    localStorage.setItem('theme', this.currentTheme);
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.currentTheme);
    
    if (this.currentTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  getCurrentTheme(): 'light' | 'dark' {
    return this.currentTheme;
  }
}
```

### Theme-aware Animations
```css
/* Theme transition */
* {
  transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
}

/* Theme-specific animations */
.light-mode-enter {
  animation: lightModeEnter 0.5s ease-out;
}

@keyframes lightModeEnter {
  from {
    background-color: #111827;
    color: #f9fafb;
  }
  to {
    background-color: #ffffff;
    color: #1f2937;
  }
}

.dark-mode-enter {
  animation: darkModeEnter 0.5s ease-out;
}

@keyframes darkModeEnter {
  from {
    background-color: #ffffff;
    color: #1f2937;
  }
  to {
    background-color: #111827;
    color: #f9fafb;
  }
}
```

Bu dosyada **UI animations ve styling'in tamamen detaylı** sistemi var! 

**Şu ana kadar oluşturulan dosyalar:**
- ✅ `ENTEGRE-SIPARISLER-DETAYLI-KILAVUZ.md` (Ana kılavuz - 1518 satır)
- ✅ `02-SIPARIS-YONETIMI-DETAY.md` (Sipariş yönetimi - 500+ satır)
- ✅ `03-OTOMATIK-ONAY-SISTEMI.md` (Otomatik onay - 600+ satır)
- ✅ `04-PLATFORM-ENTEGRASYONLARI.md` (4 platform detayı - 700+ satır)
- ✅ `05-TERMAL-YAZDIRMA-SISTEMI.md` (Yazdırma sistemi - 600+ satır)
- ✅ `06-UI-ANIMATIONS-STYLES.md` (UI ve animasyonlar - 500+ satır)

**Sıradaki dosyalar:**
- `07-ELECTRON-DESKTOP-FEATURES.md` (Tray, shortcuts, auto-updater)
- `08-ERROR-HANDLING-MONITORING.md` (Error management, logging)
- `09-PERFORMANCE-OPTIMIZATION.md` (Memory, performance tracking)
- `10-BUILD-DEPLOY-CICD.md` (GitHub Actions, release)

**Toplam: 4000+ satır detaylı kılavuz!** Devam edeyim mi? 🚀
