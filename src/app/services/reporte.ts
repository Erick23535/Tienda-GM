import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReporteService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  resumen(desde?: string, hasta?: string) {
    if (desde && hasta) {
      return this.http.get<any>(`${this.API}/reportes/resumen?desde=${desde}&hasta=${hasta}`);
    }
    return this.http.get<any>(`${this.API}/reportes/resumen`);
  }

  ventasDelDia() {
    return this.http.get<any>(`${this.API}/reportes/ventas-dia`);
  }

  stockBajo() {
    return this.http.get<any>(`${this.API}/reportes/stock-bajo`);
  }

  masVendidos() {
    return this.http.get<any>(`${this.API}/reportes/mas-vendidos`);
  }

  ventasSemana() {
    return this.http.get<any>(`${this.API}/reportes/ventas-semana`);
  }

  productosVendidos(desde?: string, hasta?: string) {
    if (desde && hasta) {
      return this.http.get<any>(`${this.API}/reportes/productos-vendidos?desde=${desde}&hasta=${hasta}`);
    }
    return this.http.get<any>(`${this.API}/reportes/productos-vendidos`);
  }

  proveedoresTop() {
    return this.http.get<any>(`${this.API}/reportes/proveedores-top`);
  }
}
