import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { ClienteService } from '../../services/cliente';

@Component({
  selector: 'app-registro-cliente',
  templateUrl: './registro-cliente.page.html',
  standalone: false,
})
export class RegistroClientePage {

  nombres    = '';
  apellidos  = '';
  correo     = '';
  contrasena = '';
  confirmar  = '';

  pregunta1  = '';
  respuesta1 = '';
  pregunta2  = '';
  respuesta2 = '';

  modoSeleccionPregunta1 = false;
  modoSeleccionPregunta2 = false;
  modoExito = false;

  preguntasDisponibles = [
    '¿Cuál es el nombre de tu mascota?',
    '¿En qué ciudad naciste?',
    '¿Cuál es el nombre de tu mejor amigo de infancia?',
    '¿Cuál es el nombre de tu escuela primaria?',
    '¿Cuál es tu comida favorita?',
    '¿Cuál es el nombre de tu madre?',
    '¿Cuál es el nombre de tu padre?',
    '¿Cuál fue tu primer trabajo?'
  ];

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private clienteSvc: ClienteService,
    private router:     Router,
    private loading:    LoadingController
  ) {}

  preguntasDisponibles2() {
    return this.preguntasDisponibles.filter(p => p !== this.pregunta1);
  }

  abrirSelectorPregunta1() {
    this.modoSeleccionPregunta1 = true;
  }

  cerrarSelectorPregunta1() {
    this.modoSeleccionPregunta1 = false;
  }

  seleccionarPregunta1(p: string) {
    this.pregunta1 = p;
    if (this.pregunta2 === p) {
      this.pregunta2  = '';
      this.respuesta2 = '';
    }
    this.cerrarSelectorPregunta1();
  }

  abrirSelectorPregunta2() {
    this.modoSeleccionPregunta2 = true;
  }

  cerrarSelectorPregunta2() {
    this.modoSeleccionPregunta2 = false;
  }

  seleccionarPregunta2(p: string) {
    this.pregunta2 = p;
    this.cerrarSelectorPregunta2();
  }

  async registrarse() {
    if (!this.nombres || !this.apellidos || !this.correo ||
        !this.contrasena || !this.confirmar ||
        !this.pregunta1  || !this.respuesta1 ||
        !this.pregunta2  || !this.respuesta2) {
      this.mostrarToast('Completa todos los campos.', 'warning');
      return;
    }

    if (this.contrasena !== this.confirmar) {
      this.mostrarToast('Las contraseñas no coinciden.', 'warning');
      return;
    }

    if (this.contrasena.length < 6) {
      this.mostrarToast('La contraseña debe tener mínimo 6 caracteres.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Registrando...' });
    await loader.present();

    this.clienteSvc.registro({
      nombres:    this.nombres,
      apellidos:  this.apellidos,
      correo:     this.correo,
      contrasena: this.contrasena,
      pregunta1:  this.pregunta1,
      respuesta1: this.respuesta1,
      pregunta2:  this.pregunta2,
      respuesta2: this.respuesta2
    }).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.modoExito = true;
        setTimeout(() => this.router.navigate(['/login-cliente']), 2500);
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrarse.', 'danger');
      }
    });
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 3200);
  }
}