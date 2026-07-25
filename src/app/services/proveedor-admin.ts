import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ProveedorAdminService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar() {
    return this.http.get<any>(`${this.API}/proveedores`, { headers: this.headers() });
  }

  crear(datos: any) {
    return this.http.post<any>(`${this.API}/proveedores`, datos, { headers: this.headers() });
  }

  editar(id: number, datos: any) {
    return this.http.put<any>(`${this.API}/proveedores/${id}`, datos, { headers: this.headers() });
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.API}/proveedores/${id}/activar`, {}, { headers: this.headers() });
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/proveedores/${id}`, { headers: this.headers() });
  }
}