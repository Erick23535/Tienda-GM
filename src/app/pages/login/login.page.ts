import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage {
  correo     = '';
  contrasena = '';

  mostrarPass = false;
  cargando    = false;
  errorMsg    = '';

  constructor(
    private auth:   AuthService,
    private router: Router
  ) {}

  togglePass() {
    this.mostrarPass = !this.mostrarPass;
  }

  iniciarSesion() {
    this.errorMsg = '';

    if (!this.correo || !this.contrasena) {
      this.errorMsg = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.cargando = true;

    this.auth.login(this.correo, this.contrasena).subscribe({
      next: () => {
        this.cargando = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err.error?.mensaje || 'No pudimos iniciar sesión.';
      }
    });
  }
}
