import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CompraService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any>(`${this.API}/compras`);
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/compras/${id}`);
  }

  crear(compra: any) {
    return this.http.post<any>(`${this.API}/compras`, compra);
  }

  anular(id: number) {
    return this.http.put<any>(`${this.API}/compras/${id}/anular`, {});
  }

  proveedores() {
    return this.http.get<any>(`${this.API}/compras/proveedores`);
  }
}
