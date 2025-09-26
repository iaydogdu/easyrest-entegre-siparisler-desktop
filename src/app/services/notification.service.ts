import { Injectable } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'danger';
export type NotificationPosition = 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'top-center' | 'bottom-center';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications: Array<{
    id: string;
    message: string;
    type: NotificationType;
    position: NotificationPosition;
    timeout?: number;
  }> = [];

  constructor() {}

  showNotification(
    message: string, 
    type: NotificationType = 'info', 
    position: NotificationPosition = 'top-end',
    timeout: number = 5000
  ): void {
    const id = Date.now().toString();
    
    // Desktop notification desteği
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('EasyRest', {
        body: message,
        icon: '/assets/images/logo.svg',
        tag: id
      });

      // 5 saniye sonra kapat
      setTimeout(() => {
        notification.close();
      }, timeout);
    }

    // Browser notification fallback
    this.createToast(id, message, type, position, timeout);
  }

  private createToast(
    id: string, 
    message: string, 
    type: NotificationType, 
    position: NotificationPosition,
    timeout: number
  ): void {
    // Toast container oluştur veya mevcut olanı bul
    let container = document.querySelector('.toast-container') as HTMLElement;
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.style.cssText = `
        position: fixed;
        z-index: 9999;
        pointer-events: none;
        ${this.getPositionStyles(position)}
      `;
      document.body.appendChild(container);
    }

    // Toast elementi oluştur
    const toast = document.createElement('div');
    toast.id = id;
    toast.style.cssText = `
      margin: 8px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      word-wrap: break-word;
      pointer-events: auto;
      cursor: pointer;
      transition: all 0.3s ease;
      transform: translateX(100%);
      opacity: 0;
      ${this.getTypeStyles(type)}
    `;
    toast.textContent = message;

    // Click to close
    toast.addEventListener('click', () => {
      this.removeToast(id);
    });

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    }, 10);

    // Auto remove
    setTimeout(() => {
      this.removeToast(id);
    }, timeout);
  }

  private removeToast(id: string): void {
    const toast = document.getElementById(id);
    if (toast) {
      toast.style.transform = 'translateX(100%)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }
  }

  private getPositionStyles(position: NotificationPosition): string {
    switch (position) {
      case 'top-start':
        return 'top: 20px; left: 20px;';
      case 'top-end':
        return 'top: 20px; right: 20px;';
      case 'top-center':
        return 'top: 20px; left: 50%; transform: translateX(-50%);';
      case 'bottom-start':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-end':
        return 'bottom: 20px; right: 20px;';
      case 'bottom-center':
        return 'bottom: 20px; left: 50%; transform: translateX(-50%);';
      default:
        return 'top: 20px; right: 20px;';
    }
  }

  private getTypeStyles(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'background-color: #10b981; border: 1px solid #059669;';
      case 'error':
      case 'danger':
        return 'background-color: #ef4444; border: 1px solid #dc2626;';
      case 'warning':
        return 'background-color: #f59e0b; border: 1px solid #d97706;';
      case 'info':
        return 'background-color: #3b82f6; border: 1px solid #2563eb;';
      default:
        return 'background-color: #6b7280; border: 1px solid #4b5563;';
    }
  }

  // Notification permission iste
  requestPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}