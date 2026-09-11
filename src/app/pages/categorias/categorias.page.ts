import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { CategoriaAdminService } from '../../services/categoria-admin';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss'],
  standalone: false
})
export class CategoriasPage implements OnInit {

  categorias:     any[] = [];
  busqueda = '';
  vistaGrid = true;
  modoFormulario = false;
  editando       = false;
  actual:        any = {};
  aEliminar:     any = null;
  modoExito = false;
  mensajeExito = '';
  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private svc:     CategoriaAdminService,
    private loading: LoadingController
  ) {}

  ngOnInit() { this.cargar(); }

  async cargar() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.svc.listar().subscribe({
      next: (res) => { this.categorias = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  get categoriasFiltradas() {
    if (!this.busqueda) return this.categorias;
    const b = this.busqueda.toLowerCase();
    return this.categorias.filter(c => c.nombre.toLowerCase().includes(b));
  }

  get totalCategorias(): number {
    return this.categorias.length;
  }

  get totalProductosAsociados(): number {
    return this.categorias.reduce((acc, c) => acc + Number(c.total_productos || 0), 0);
  }

  get categoriaMasGrande(): string {
    if (this.categorias.length === 0) return '-';
    const top = [...this.categorias].sort((a, b) => b.total_productos - a.total_productos)[0];
    return top?.nombre || '-';
  }

  abrirFormulario(item?: any) {
    this.editando = !!item;
    this.actual   = item ? { ...item } : { nombre: '', descripcion: '' };
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
      ? this.svc.editar(this.actual.id_categoria, this.actual)
      : this.svc.crear(this.actual);

    accion.subscribe({
      next: async () => {
        await loader.dismiss();
        this.mensajeExito = this.editando ? 'Categoría actualizada' : 'Categoría creada';
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

  confirmarEliminar(item: any) {
    this.aEliminar = item;
  }

  cancelarEliminar() {
    this.aEliminar = null;
  }

  // Eliminar con ventana para deshacer: se quita de la vista de inmediato,
  // pero el borrado real en el servidor solo ocurre si nadie lo deshace
  // dentro de los siguientes segundos (además del modal de confirmación,
  // no en su lugar).
  pendienteEliminar: any = null;
  private pendienteTimeoutId: any;

  eliminarConfirmado() {
    const item = this.aEliminar;
    this.aEliminar = null;

    this.categorias = this.categorias.filter(c => c.id_categoria !== item.id_categoria);
    this.pendienteEliminar = item;

    this.pendienteTimeoutId = setTimeout(() => this.eliminarDefinitivo(item), 5000);
  }

  deshacerEliminar() {
    if (!this.pendienteEliminar) return;
    clearTimeout(this.pendienteTimeoutId);
    this.categorias = [this.pendienteEliminar, ...this.categorias];
    this.pendienteEliminar = null;
  }

  private eliminarDefinitivo(item: any) {
    this.pendienteEliminar = null;
    this.svc.eliminar(item.id_categoria).subscribe({
      next: () => {
        this.mensajeExito = 'Categoría eliminada';
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