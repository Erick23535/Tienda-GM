import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { ClienteService } from '../../services/cliente';

@Component({
  selector: 'app-recuperar-contrasena',
  templateUrl: './recuperar-contrasena.page.html',
  standalone: false,
})
export class RecuperarContrasenaPage {


  paso = 1;

  correo     = '';
  pregunta1  = '';
  pregunta2  = '';
  respuesta1 = '';
  respuesta2 = '';
  token      = '';
  contrasena = '';
  confirmar  = '';

  constructor(
    private clienteSvc: ClienteService,
    public router:     Router,
    private loading:    LoadingController,
    private toast:      ToastController
  ) {}

  async buscarCorreo() {
    if (!this.correo) {
      this.mostrarToast('Ingresa tu correo.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Buscando...' });
    await loader.present();

    this.clienteSvc.obtenerPreguntas(this.correo).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.pregunta1 = res.datos.pregunta1;
        this.pregunta2 = res.datos.pregunta2;
        this.paso = 2;
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Correo no encontrado.', 'danger');
      }
    });
  }

  async verificarRespuestas() {
    if (!this.respuesta1 || !this.respuesta2) {
      this.mostrarToast('Responde ambas preguntas.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Verificando...' });
    await loader.present();

    this.clienteSvc.verificarRespuestas(
      this.correo, this.respuesta1, this.respuesta2
    ).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.token = res.datos.token;
        this.paso  = 3;
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Respuestas incorrectas.', 'danger');
      }
    });
  }

  async guardarContrasena() {
    if (!this.contrasena || !this.confirmar) {
      this.mostrarToast('Completa los campos.', 'warning');
      return;
    }

    if (this.contrasena !== this.confirmar) {
      this.mostrarToast('Las contraseñas no coinciden.', 'warning');
      return;
    }

    if (this.contrasena.length < 6) {
      this.mostrarToast('Mínimo 6 caracteres.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Guardando...' });
    await loader.present();

    this.clienteSvc.nuevaContrasena(this.token, this.contrasena).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mostrarToast(res.mensaje, 'success');
        setTimeout(() => this.router.navigate(['/login-cliente']), 2000);
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 4000, color });
    t.present();
  }
}