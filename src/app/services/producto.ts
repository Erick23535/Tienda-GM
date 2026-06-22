import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProductoService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar() {
    return this.http.get<any>(`${this.API}/productos`, { headers: this.headers() });
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/productos/${id}`, { headers: this.headers() });
  }

  crear(producto: any) {
    return this.http.post<any>(`${this.API}/productos`, producto, { headers: this.headers() });
  }

  editar(id: number, producto: any) {
    return this.http.put<any>(`${this.API}/productos/${id}`, producto, { headers: this.headers() });
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/productos/${id}`, { headers: this.headers() });
  }

  categorias() {
    return this.http.get<any>(`${this.API}/productos/categorias`, { headers: this.headers() });
  }
}