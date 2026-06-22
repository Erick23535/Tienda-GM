import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ReporteService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  resumen() {
    return this.http.get<any>(`${this.API}/reportes/resumen`,
      { headers: this.headers() });
  }

  ventasDelDia() {
    return this.http.get<any>(`${this.API}/reportes/ventas-dia`,
      { headers: this.headers() });
  }

  stockBajo() {
    return this.http.get<any>(`${this.API}/reportes/stock-bajo`,
      { headers: this.headers() });
  }

  masVendidos() {
    return this.http.get<any>(`${this.API}/reportes/mas-vendidos`,
      { headers: this.headers() });
  }

  ventasSemana() {
    return this.http.get<any>(`${this.API}/reportes/ventas-semana`,
      { headers: this.headers() });
  }
}