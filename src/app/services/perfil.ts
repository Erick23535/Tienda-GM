import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';


@Injectable({ providedIn: 'root' })
export class PerfilService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  obtener() {
    return this.http.get<any>(`${this.API}/perfil`,
      { headers: this.headers() });
  }

  actualizar(datos: any) {
    return this.http.put<any>(`${this.API}/perfil`, datos,
      { headers: this.headers() });
  }

  cambiarContrasena(datos: any) {
    return this.http.put<any>(`${this.API}/perfil/contrasena`, datos,
      { headers: this.headers() });
  }
}