import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { PerfilService } from '../../services/perfil';
import { AuthService } from '../../services/auth';
import { ConfiguracionService } from '../../services/configuracion';

@Component({
  selector: 'app-perfil-admin',
  templateUrl: './perfil-admin.page.html',
  styleUrls: ['./perfil-admin.page.scss'],
  standalone: false
})
export class PerfilAdminPage implements OnInit {

  seccion = 'perfil'; // perfil | editar | contrasena

  perfil: any = {};

  // Editar datos
  editNombres   = '';
  editApellidos = '';
  editCorreo    = '';

  // Cambiar contraseña
  passActual   = '';
  passNueva    = '';
  passConfirmar = '';
  //banner
  bannerUrl = '';

  constructor(
  private perfilSvc: PerfilService,
  private authSvc:   AuthService,
  private configSvc: ConfiguracionService,
  private router:    Router,
  private loading:   LoadingController,
  private toast:     ToastController
) {}

  ngOnInit() {
  this.cargarPerfil();
  this.cargarConfiguracion();
}

  async cargarPerfil() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.perfilSvc.obtener().subscribe({
      next: (res) => {
        this.perfil = res.datos;
        this.editNombres   = res.datos.nombres;
        this.editApellidos = res.datos.apellidos;
        this.editCorreo    = res.datos.correo;
        loader.dismiss();
      },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar perfil.', 'danger'); }
    });
  }
  cargarConfiguracion() {
  this.configSvc.obtener().subscribe({
    next: (res) => this.bannerUrl = res.datos.banner_url || ''
  });
}

async guardarBanner() {
  const loader = await this.loading.create({ message: 'Guardando...' });
  await loader.present();

  this.configSvc.actualizar({ banner_url: this.bannerUrl }).subscribe({
    next: async () => {
      await loader.dismiss();
      this.mostrarToast('Imagen de banner actualizada.', 'success');
    },
    error: async () => {
      await loader.dismiss();
      this.mostrarToast('Error al guardar.', 'danger');
    }
  });
}

  async guardarDatos() {
    if (!this.editNombres || !this.editApellidos || !this.editCorreo) {
      this.mostrarToast('Todos los campos son obligatorios.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Guardando...' });
    await loader.present();

    this.perfilSvc.actualizar({
      nombres:   this.editNombres,
      apellidos: this.editApellidos,
      correo:    this.editCorreo
    }).subscribe({
      next: async (res) => {
        await loader.dismiss();
        // Actualizar localStorage
        localStorage.setItem('nombre', `${res.datos.nombres} ${res.datos.apellidos}`);
        this.perfil.nombres   = res.datos.nombres;
        this.perfil.apellidos = res.datos.apellidos;
        this.mostrarToast('Perfil actualizado.', 'success');
        this.seccion = 'perfil';
        this.cargarPerfil();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  async cambiarContrasena() {
    if (!this.passActual || !this.passNueva || !this.passConfirmar) {
      this.mostrarToast('Completa todos los campos.', 'warning');
      return;
    }

    if (this.passNueva !== this.passConfirmar) {
      this.mostrarToast('Las contraseñas nuevas no coinciden.', 'warning');
      return;
    }

    if (this.passNueva.length < 6) {
      this.mostrarToast('Mínimo 6 caracteres.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Cambiando contraseña...' });
    await loader.present();

    this.perfilSvc.cambiarContrasena({
      contrasena_actual: this.passActual,
      contrasena_nueva:  this.passNueva,
      confirmar:         this.passConfirmar
    }).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mostrarToast(res.mensaje, 'success');
        this.passActual    = '';
        this.passNueva     = '';
        this.passConfirmar = '';
        this.seccion = 'perfil';
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al cambiar.', 'danger');
      }
    });
  }

  cerrarSesion() {
    this.authSvc.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}
