import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { LoadingController, ToastController } from '@ionic/angular';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
})
export class LoginPage {
  correo     = '';
  contrasena = '';

  constructor(
    private auth:    AuthService,
    private router:  Router,
    private loading: LoadingController,
    private toast:   ToastController
  ) {}

  async iniciarSesion() {
    if (!this.correo || !this.contrasena) {
      this.mostrarToast('Completa todos los campos.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Ingresando...' });
    await loader.present();

    this.auth.login(this.correo, this.contrasena).subscribe({
      next: async () => {
        await loader.dismiss();
        this.router.navigate(['/dashboard']);
      },
      error: async (err) => {
        await loader.dismiss();
        const msg = err.error?.mensaje || 'Error al iniciar sesión.';
        this.mostrarToast(msg, 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}