import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ClienteAdminService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar(busqueda = '') {
    const params = busqueda ? `?busqueda=${busqueda}` : '';
    return this.http.get<any>(`${this.API}/admin/clientes${params}`,
      { headers: this.headers() });
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/admin/clientes/${id}`,
      { headers: this.headers() });
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.API}/admin/clientes/${id}/activar`, {},
      { headers: this.headers() });
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/admin/clientes/${id}`,
      { headers: this.headers() });
  }

  stats() {
    return this.http.get<any>(`${this.API}/admin/clientes/stats`,
      { headers: this.headers() });
  }
}