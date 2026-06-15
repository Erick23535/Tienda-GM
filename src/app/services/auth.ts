import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // Apunta a tu XAMPP local
  private API = 'http://localhost/tienda-gm-api';

  constructor(private http: HttpClient) {}

  login(correo: string, contrasena: string) {
    return this.http.post<any>(`${this.API}/auth/login`, { correo, contrasena })
      .pipe(tap(res => {
        // Guardar token y datos del usuario
        localStorage.setItem('token', res.datos.token);
        localStorage.setItem('rol',   res.datos.rol);
        localStorage.setItem('nombre', res.datos.nombres + ' ' + res.datos.apellidos);
      }));
  }

  logout() {
    const token = localStorage.getItem('token');
    localStorage.clear();
    return this.http.post(`${this.API}/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  estaLogueado(): boolean {
    return !!localStorage.getItem('token');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}