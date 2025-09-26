import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private readonly baseUrl = environment.baseappurl;

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getOrderHesapFisi(orderId: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get(`${this.baseUrl}/api/orders/${orderId}/hesap-fisi`, { 
      headers,
      responseType: 'text' 
    });
  }

  posthesapFisi(htmlContent: string): Observable<any> {
    return this.http.post('http://localhost:41411/api/receipt/print', htmlContent, {
      headers: new HttpHeaders({
        'Content-Type': 'text/html;charset=UTF-8'
      }),
      responseType: 'text'
    });
  }
}
