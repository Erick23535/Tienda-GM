import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

  mostrarPass = false;
  cargando    = false;
  errorMsg    = '';

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private clienteSvc: ClienteService,
    private router:     Router,
    private route:      ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['verificado']) {
        this.mostrarToast('¡Correo verificado! Ya puedes iniciar sesión.', 'success');
      }
    });
  }

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

    this.clienteSvc.login(this.correo, this.contrasena).subscribe({
      next: (res) => {
        this.cargando = false;
        localStorage.setItem('cliente_token',  res.datos.token);
        localStorage.setItem('cliente_nombre', res.datos.nombres + ' ' + res.datos.apellidos);
        localStorage.setItem('cliente_id', res.datos.id_cliente);
        localStorage.setItem('cliente_correo', res.datos.correo);
        this.router.navigate(['/tienda']);
      },
      error: (err) => {
        this.cargando = false;
        this.errorMsg = err.error?.mensaje || 'No pudimos iniciar sesión.';
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
