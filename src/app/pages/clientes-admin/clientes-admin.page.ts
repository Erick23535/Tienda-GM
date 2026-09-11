import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { ClienteAdminService } from '../../services/cliente-admin';

@Component({
  selector: 'app-clientes-admin',
  templateUrl: './clientes-admin.page.html',
  styleUrls: ['./clientes-admin.page.scss'],
  standalone: false
})
export class ClientesAdminPage implements OnInit {

  clientes:  any[] = [];
  stats:     any   = {};
  busqueda = '';
  vistaGrid = true;
  clienteDetalle: any = null;
  modoConfirmarToggle = false;
  modoConfirmarEliminar = false;
  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private clienteSvc: ClienteAdminService,
    private loading:    LoadingController
  ) {}

  ngOnInit() {
    this.cargarStats();
    this.cargarClientes();
  }

  async cargarStats() {
    this.clienteSvc.stats().subscribe({
      next: (res) => this.stats = res.datos
    });
  }

  async cargarClientes(busqueda = '') {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.clienteSvc.listar(busqueda).subscribe({
      next: (res) => { this.clientes = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  buscar() {
    this.cargarClientes(this.busqueda);
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.cargarClientes();
  }

  verDetalle(cliente: any) {
    this.clienteSvc.obtener(cliente.id_cliente).subscribe({
      next: (res) => this.clienteDetalle = res.datos,
      error: () => this.mostrarToast('Error al cargar detalle.', 'danger')
    });
  }

  cerrarDetalle() {
    this.clienteDetalle = null;
  }

  toggleActivo(cliente: any) {
    this.modoConfirmarToggle = true;
  }

  cancelarToggle() {
    this.modoConfirmarToggle = false;
  }

  confirmarToggleActivo() {
    const cliente = this.clienteDetalle;
    this.modoConfirmarToggle = false;
    this.clienteSvc.toggleActivo(cliente.id_cliente).subscribe({
      next: (res) => {
        cliente.activo = res.datos.activo;
        this.mostrarToast(res.mensaje, 'success');
        this.cargarStats();
        const enLista = this.clientes.find(c => c.id_cliente === cliente.id_cliente);
        if (enLista) enLista.activo = res.datos.activo;
      },
      error: () => this.mostrarToast('Error al actualizar.', 'danger')
    });
  }

  confirmarEliminar(cliente: any) {
    this.modoConfirmarEliminar = true;
  }

  cancelarEliminar() {
    this.modoConfirmarEliminar = false;
  }

  eliminarConfirmado() {
    const cliente = this.clienteDetalle;
    this.modoConfirmarEliminar = false;
    this.clienteSvc.eliminar(cliente.id_cliente).subscribe({
      next: () => {
        this.mostrarToast('Cliente eliminado.', 'success');
        this.cerrarDetalle();
        this.cargarClientes();
        this.cargarStats();
      },
      error: (err) => this.mostrarToast(err.error?.mensaje || 'Error al eliminar.', 'danger')
    });
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
}
