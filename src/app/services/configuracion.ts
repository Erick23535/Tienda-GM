import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  obtener() {
    return this.http.get<any>(`${this.API}/configuracion`);
  }

  actualizar(datos: any) {
    const token = localStorage.getItem('token');
    return this.http.put<any>(`${this.API}/configuracion`, datos, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}