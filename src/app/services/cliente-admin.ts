import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClienteAdminService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar(busqueda = '') {
    const params = busqueda ? `?busqueda=${busqueda}` : '';
    return this.http.get<any>(`${this.API}/admin/clientes${params}`);
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/admin/clientes/${id}`);
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.API}/admin/clientes/${id}/activar`, {});
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/admin/clientes/${id}`);
  }

  stats() {
    return this.http.get<any>(`${this.API}/admin/clientes/stats`);
  }
}
