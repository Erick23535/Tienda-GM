import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  constructor(
    private authSvc: AuthService,
    private router:  Router
  ) {}

  canActivate(): boolean {
    if (this.authSvc.estaLogueado()) {
      return true;
    }
    this.router.navigate(['/login']);
    return false;
  }
}