import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class NotificacionService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ===== Cliente =====
  listarPorCliente(id_cliente: string) {
    return this.http.get<any>(`${this.API}/notificaciones/cliente/${id_cliente}`);
  }

  contarNoLeidas(id_cliente: string) {
    return this.http.get<any>(`${this.API}/notificaciones/cliente/${id_cliente}/no-leidas`);
  }

  marcarLeida(id: number) {
    return this.http.put<any>(`${this.API}/notificaciones/${id}/leer`, {});
  }

  marcarTodasLeidas(id_cliente: string) {
    return this.http.put<any>(`${this.API}/notificaciones/cliente/${id_cliente}/leer-todas`, {});
  }

  // ===== Admin =====
  listarAdmin() {
    return this.http.get<any>(`${this.API}/notificaciones-admin`);
  }

  contarNoLeidasAdmin() {
    return this.http.get<any>(`${this.API}/notificaciones-admin/no-leidas`);
  }

  marcarLeidaAdmin(id: number) {
    return this.http.put<any>(`${this.API}/notificaciones-admin/${id}/leer`, {});
  }

  marcarTodasLeidasAdmin() {
    return this.http.put<any>(`${this.API}/notificaciones-admin/leer-todas`, {});
  }
}