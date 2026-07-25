import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class VentaService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  private headers() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  listar() {
    return this.http.get<any>(`${this.API}/ventas`, { headers: this.headers() });
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/ventas/${id}`, { headers: this.headers() });
  }

  crear(venta: any) {
    return this.http.post<any>(`${this.API}/ventas`, venta, { headers: this.headers() });
  }

  anular(id: number) {
    return this.http.put<any>(`${this.API}/ventas/${id}/anular`, {}, { headers: this.headers() });
  }

  actualizarEstadoEnvio(id: number, estado_envio: string) {
    return this.http.put<any>(`${this.API}/ventas/${id}/estado-envio`, { estado_envio },
      { headers: this.headers() });
  }

  listarPorCliente(id_cliente: string) {
    return this.http.get<any>(`${this.API}/ventas/cliente/${id_cliente}`,
      { headers: this.headers() });
  }
}