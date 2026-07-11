import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
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
  clienteDetalle: any = null;

  constructor(
    private clienteSvc: ClienteAdminService,
    private alert:      AlertController,
    private loading:    LoadingController,
    private toast:      ToastController
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

  async toggleActivo(cliente: any) {
    const accion = cliente.activo ? 'desactivar' : 'activar';
    const alerta = await this.alert.create({
      header:  `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} cliente?`,
      message: `¿Estás seguro de ${accion} a ${cliente.nombres} ${cliente.apellidos}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion.charAt(0).toUpperCase() + accion.slice(1),
          handler: () => {
            this.clienteSvc.toggleActivo(cliente.id_cliente).subscribe({
              next: (res) => {
                cliente.activo = res.datos.activo;
                this.mostrarToast(res.mensaje, 'success');
                this.cargarStats();
                if (this.clienteDetalle) {
                  this.clienteDetalle.activo = res.datos.activo;
                }
              },
              error: () => this.mostrarToast('Error al actualizar.', 'danger')
            });
          }
        }
      ]
    });
    await alerta.present();
  }

  async confirmarEliminar(cliente: any) {
    const alerta = await this.alert.create({
      header:  'Eliminar cliente',
      message: `¿Eliminar a ${cliente.nombres} ${cliente.apellidos}? Esta acción no se puede deshacer.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => {
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
        }
      ]
    });
    await alerta.present();
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}
