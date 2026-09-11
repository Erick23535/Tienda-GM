import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ClienteGuard implements CanActivate {

  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('cliente_token');
    if (token) {
      return true;
    }
    this.router.navigate(['/login-cliente']);
    return false;
  }
}