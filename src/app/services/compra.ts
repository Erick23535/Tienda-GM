import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class CompraService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar() {
    return this.http.get<any>(`${this.API}/compras`, { headers: this.headers() });
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/compras/${id}`, { headers: this.headers() });
  }

  crear(compra: any) {
    return this.http.post<any>(`${this.API}/compras`, compra, { headers: this.headers() });
  }

  anular(id: number) {
    return this.http.put<any>(`${this.API}/compras/${id}/anular`, {}, { headers: this.headers() });
  }

  proveedores() {
    return this.http.get<any>(`${this.API}/compras/proveedores`, { headers: this.headers() });
  }
}