import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ProveedorAdminService } from '../../services/proveedor-admin';

@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.page.html',
  styleUrls: ['./proveedores.page.scss'],
  standalone: false
})
export class ProveedoresPage implements OnInit {

  proveedores:    any[] = [];
  busqueda = '';
  modoFormulario = false;
  editando       = false;
  actual:        any = {};

  constructor(
    private svc:     ProveedorAdminService,
    private alert:   AlertController,
    private loading: LoadingController,
    private toast:   ToastController
  ) {}

  ngOnInit() { this.cargar(); }

  async cargar() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.svc.listar().subscribe({
      next: (res) => { this.proveedores = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  get proveedoresFiltrados() {
    if (!this.busqueda) return this.proveedores;
    const b = this.busqueda.toLowerCase();
    return this.proveedores.filter(p =>
      p.nombre.toLowerCase().includes(b) ||
      (p.ruc && p.ruc.toLowerCase().includes(b))
    );
  }

  get totalProveedores(): number {
    return this.proveedores.length;
  }

  get totalActivos(): number {
    return this.proveedores.filter(p => p.activo).length;
  }

  get totalProductosAsociados(): number {
    return this.proveedores.reduce((acc, p) => acc + Number(p.total_productos || 0), 0);
  }

  abrirFormulario(item?: any) {
    this.editando = !!item;
    this.actual   = item ? { ...item } : { nombre: '', ruc: '', telefono: '', correo: '', direccion: '' };
    this.modoFormulario = true;
  }

  cerrarFormulario() {
    this.modoFormulario = false;
    this.actual = {};
  }

  async guardar() {
    if (!this.actual.nombre) {
      this.mostrarToast('El nombre es obligatorio.', 'warning');
      return;
    }
    const loader = await this.loading.create({ message: 'Guardando...' });
    await loader.present();

    const accion = this.editando
      ? this.svc.editar(this.actual.id_proveedor, this.actual)
      : this.svc.crear(this.actual);

    accion.subscribe({
      next: async () => {
        await loader.dismiss();
        this.mostrarToast(this.editando ? 'Proveedor actualizado.' : 'Proveedor creado.', 'success');
        this.cerrarFormulario();
        this.cargar();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  async toggleActivo(item: any) {
    const accion = item.activo ? 'desactivar' : 'activar';
    const alerta = await this.alert.create({
      header:  `¿${accion.charAt(0).toUpperCase() + accion.slice(1)}?`,
      message: `¿${accion === 'activar' ? 'Activar' : 'Desactivar'} a "${item.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: accion.charAt(0).toUpperCase() + accion.slice(1),
          handler: () => {
            this.svc.toggleActivo(item.id_proveedor).subscribe({
              next: (res) => {
                item.activo = res.datos.activo;
                this.mostrarToast(res.mensaje, 'success');
              },
              error: (err) => this.mostrarToast(err.error?.mensaje || 'Error.', 'danger')
            });
          }
        }
      ]
    });
    await alerta.present();
  }

  async confirmarEliminar(item: any) {
    const alerta = await this.alert.create({
      header:  'Eliminar proveedor',
      message: `¿Eliminar a "${item.nombre}"? Solo funciona si no tiene productos ni compras registradas.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.svc.eliminar(item.id_proveedor).subscribe({
              next: () => { this.mostrarToast('Eliminado.', 'success'); this.cargar(); },
              error: (err) => this.mostrarToast(err.error?.mensaje || 'Error.', 'danger')
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