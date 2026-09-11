import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CategoriaAdminService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any>(`${this.API}/categorias-admin`);
  }

  crear(datos: any) {
    return this.http.post<any>(`${this.API}/categorias-admin`, datos);
  }

  editar(id: number, datos: any) {
    return this.http.put<any>(`${this.API}/categorias-admin/${id}`, datos);
  }

  eliminar(id: number) {
    return this.http.delete<any>(`${this.API}/categorias-admin/${id}`);
  }
}
