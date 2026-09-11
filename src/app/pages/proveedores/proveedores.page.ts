import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
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
  vistaGrid = true;
  modoFormulario = false;
  editando       = false;
  actual:        any = {};

  modoExito = false;
  mensajeExito = '';

  modoConfirmarEliminar = false;
  modoConfirmarToggle = false;
  proveedorSeleccionado: any = null;

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private svc:     ProveedorAdminService,
    private loading: LoadingController
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
        this.mensajeExito = this.editando ? 'Proveedor actualizado' : 'Proveedor creado';
        this.modoExito = true;
        this.cerrarFormulario();
        this.cargar();
        setTimeout(() => this.modoExito = false, 2000);
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  abrirConfirmarToggle(item: any) {
    this.proveedorSeleccionado = item;
    this.modoConfirmarToggle = true;
  }

  cerrarConfirmarToggle() {
    this.modoConfirmarToggle = false;
    this.proveedorSeleccionado = null;
  }

  confirmarToggleActivo() {
  const item = this.proveedorSeleccionado;
  this.svc.toggleActivo(item.id_proveedor).subscribe({
    next: (res) => {
      item.activo = res.datos.activo;
      this.cerrarConfirmarToggle();
      this.mensajeExito = item.activo ? 'Proveedor activado' : 'Proveedor desactivado';
      this.modoExito = true;
      setTimeout(() => this.modoExito = false, 2000);
    },
    error: (err) => {
      this.mostrarToast(err.error?.mensaje || 'Error.', 'danger');
      this.cerrarConfirmarToggle();
    }
  });
}

  abrirConfirmarEliminar(item: any) {
    this.proveedorSeleccionado = item;
    this.modoConfirmarEliminar = true;
  }

  cerrarConfirmarEliminar() {
    this.modoConfirmarEliminar = false;
    this.proveedorSeleccionado = null;
  }

  // Eliminar con ventana para deshacer: se quita de la vista de inmediato,
  // pero el borrado real en el servidor solo ocurre si nadie lo deshace
  // dentro de los siguientes segundos (además del modal de confirmación,
  // no en su lugar).
  pendienteEliminar: any = null;
  private pendienteTimeoutId: any;

  confirmarEliminarDefinitivo() {
    const item = this.proveedorSeleccionado;
    this.cerrarConfirmarEliminar();

    this.proveedores = this.proveedores.filter(p => p.id_proveedor !== item.id_proveedor);
    this.pendienteEliminar = item;

    this.pendienteTimeoutId = setTimeout(() => this.eliminarDefinitivo(item), 5000);
  }

  deshacerEliminar() {
    if (!this.pendienteEliminar) return;
    clearTimeout(this.pendienteTimeoutId);
    this.proveedores = [this.pendienteEliminar, ...this.proveedores];
    this.pendienteEliminar = null;
  }

  private eliminarDefinitivo(item: any) {
    this.pendienteEliminar = null;
    this.svc.eliminar(item.id_proveedor).subscribe({
      next: () => {
        this.mensajeExito = 'Proveedor eliminado';
        this.modoExito = true;
        setTimeout(() => this.modoExito = false, 2000);
      },
      error: (err) => {
        this.cargar();
        this.mostrarToast(err.error?.mensaje || 'Error al eliminar.', 'danger');
      }
    });
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
}