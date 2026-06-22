import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class ClienteService {

  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  registro(datos: any) {
    return this.http.post<any>(`${this.API}/clientes/registro`, datos);
  }

  login(correo: string, contrasena: string) {
    return this.http.post<any>(`${this.API}/clientes/login`, { correo, contrasena });
  }

  obtenerPreguntas(correo: string) {
    return this.http.post<any>(`${this.API}/clientes/preguntas`, { correo });
  }

  verificarRespuestas(correo: string, respuesta1: string, respuesta2: string) {
    return this.http.post<any>(`${this.API}/clientes/verificar-respuestas`,
      { correo, respuesta1, respuesta2 });
  }

  nuevaContrasena(token: string, contrasena: string) {
    return this.http.post<any>(`${this.API}/clientes/nueva-contrasena`,
      { token, contrasena });
  }
}
