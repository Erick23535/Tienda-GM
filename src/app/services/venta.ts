import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VentaService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  listar() {
    return this.http.get<any>(`${this.API}/ventas`);
  }

  obtener(id: number) {
    return this.http.get<any>(`${this.API}/ventas/${id}`);
  }

  crear(venta: any) {
    return this.http.post<any>(`${this.API}/ventas`, venta);
  }

  anular(id: number) {
    return this.http.put<any>(`${this.API}/ventas/${id}/anular`, {});
  }

  actualizarEstadoEnvio(id: number, estado_envio: string) {
    return this.http.put<any>(`${this.API}/ventas/${id}/estado-envio`, { estado_envio });
  }

  confirmarRecepcion(id: number) {
    return this.http.put<any>(`${this.API}/ventas/${id}/confirmar-recepcion`, {});
  }

  listarPorCliente(id_cliente: string) {
    return this.http.get<any>(`${this.API}/ventas/cliente/${id_cliente}`);
  }
}
