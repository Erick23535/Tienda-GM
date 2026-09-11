import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ProductoService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any>(`${this.API}/productos`);
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/productos/${id}`);
  }

  crear(producto: any) {
    return this.http.post<any>(`${this.API}/productos`, producto);
  }

  editar(id: number, producto: any) {
    return this.http.put<any>(`${this.API}/productos/${id}`, producto);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/productos/${id}`);
  }

  categorias() {
    return this.http.get<any>(`${this.API}/productos/categorias`);
  }

  obtenerTallas(id: number) {
    return this.http.get<any>(`${this.API}/productos/${id}/tallas`);
  }

  guardarTallas(id: number, tallas: any[]) {
    return this.http.put<any>(`${this.API}/productos/${id}/tallas`, { tallas });
  }
}
