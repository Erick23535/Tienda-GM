import { Injectable } from '@angular/core';
import {
  HttpEvent, HttpHandler, HttpInterceptor, HttpRequest
} from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

// Endpoints que solo un cliente puede llamar (usan `cliente_token`, nunca
// el token de administrador). "/notificaciones/" también cubre
// PUT /notificaciones/{id}/leer, por eso se excluye "-admin" explícitamente.
// "/confirmar-recepcion" es el cliente confirmando SU propio pedido
// (PUT /ventas/{id}/confirmar-recepcion) — no confundir con las rutas de
// administración de ventas (listar/anular/estado-envio), que sí van con
// el token de admin.
function esRutaSoloCliente(url: string): boolean {
  return url.includes('/favoritos')
      || url.includes('/resenas')
      || url.includes('/ventas/cliente')
      || url.includes('/confirmar-recepcion')
      || (url.includes('/notificaciones/') && !url.includes('/notificaciones-admin'));
}

// Los propios endpoints de login responden 401 cuando el correo/contraseña
// son incorrectos — eso no es "sesión expirada", así que no debe disparar
// el logout global de abajo. Si se dejara pasar, un login fallido del
// cliente terminaba limpiando el localStorage y mandando al usuario al
// login del ADMIN en vez de mostrarle el error en su propia pantalla.
function esRutaLogin(url: string): boolean {
  return url.endsWith('/auth/login') || url.endsWith('/clientes/login');
}

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const esRutaCliente = esRutaSoloCliente(req.url);

    // Crear una venta lo usa tanto el checkout del cliente como el POS del
    // admin contra la misma URL; se prioriza el token de cliente si existe.
    const esCrearVenta = req.method === 'POST' && /\/ventas$/.test(req.url);

    let token: string | null;
    let usaTokenCliente: boolean;

    if (esRutaCliente) {
      token = localStorage.getItem('cliente_token');
      usaTokenCliente = true;
    } else if (esCrearVenta && localStorage.getItem('cliente_token')) {
      token = localStorage.getItem('cliente_token');
      usaTokenCliente = true;
    } else {
      token = localStorage.getItem('token');
      usaTokenCliente = false;
    }

    const request = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

    return next.handle(request).pipe(
      catchError(error => {
        if (error.status === 401 && !esRutaLogin(req.url)) {
          if (usaTokenCliente) {
            localStorage.removeItem('cliente_token');
            localStorage.removeItem('cliente_id');
            localStorage.removeItem('cliente_nombre');
            localStorage.removeItem('cliente_correo');
            this.router.navigate(['/login-cliente']);
          } else {
            localStorage.clear();
            this.router.navigate(['/login']);
          }
        }
        return throwError(() => error);
      })
    );
  }
}
