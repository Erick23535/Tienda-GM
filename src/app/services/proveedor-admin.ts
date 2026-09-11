import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProveedorAdminService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any>(`${this.API}/proveedores`);
  }

  crear(datos: any) {
    return this.http.post<any>(`${this.API}/proveedores`, datos);
  }

  editar(id: number, datos: any) {
    return this.http.put<any>(`${this.API}/proveedores/${id}`, datos);
  }

  toggleActivo(id: number) {
    return this.http.put<any>(`${this.API}/proveedores/${id}/activar`, {});
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/proveedores/${id}`);
  }
}
