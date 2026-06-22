import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { ClienteService } from '../../services/cliente';

@Component({
  selector: 'app-login-cliente',
  templateUrl: './login-cliente.page.html',
  styleUrls: ['./login-cliente.page.scss'],
  standalone: false
})
export class LoginClientePage implements OnInit {

  correo     = '';
  contrasena = '';

  constructor(
    private clienteSvc: ClienteService,
    private router:     Router,
    private route:      ActivatedRoute,
    private loading:    LoadingController,
    private toast:      ToastController
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['verificado']) {
        this.mostrarToast('¡Correo verificado! Ya puedes iniciar sesión.', 'success');
      }
    });
  }

  async iniciarSesion() {
    if (!this.correo || !this.contrasena) {
      this.mostrarToast('Completa todos los campos.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Ingresando...' });
    await loader.present();

    this.clienteSvc.login(this.correo, this.contrasena).subscribe({
      next: async (res) => {
        await loader.dismiss();
        localStorage.setItem('cliente_token',  res.datos.token);
        localStorage.setItem('cliente_nombre', res.datos.nombres + ' ' + res.datos.apellidos);
        this.router.navigate(['/tienda']);
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al iniciar sesión.', 'danger');
      }
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 4000, color });
    t.present();
  }
}