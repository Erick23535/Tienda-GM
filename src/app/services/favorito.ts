import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FavoritoService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar(id_cliente: string) {
    return this.http.get<any>(`${this.API}/favoritos/cliente/${id_cliente}`);
  }

  listarIds(id_cliente: string) {
    return this.http.get<any>(`${this.API}/favoritos/cliente/${id_cliente}/ids`);
  }

  toggle(id_cliente: string, id_producto: number) {
    return this.http.post<any>(`${this.API}/favoritos`, { id_cliente, id_producto });
  }
}
