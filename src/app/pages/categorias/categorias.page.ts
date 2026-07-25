import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
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
  modoFormulario = false;
  editando       = false;
  actual:        any = {};

  constructor(
    private svc:     CategoriaAdminService,
    private alert:   AlertController,
    private loading: LoadingController,
    private toast:   ToastController
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
        this.mostrarToast(this.editando ? 'Categoría actualizada.' : 'Categoría creada.', 'success');
        this.cerrarFormulario();
        this.cargar();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  async confirmarEliminar(item: any) {
    const alerta = await this.alert.create({
      header:  'Eliminar categoría',
      message: `¿Eliminar "${item.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar', role: 'destructive',
          handler: () => {
            this.svc.eliminar(item.id_categoria).subscribe({
              next: () => { this.mostrarToast('Eliminada.', 'success'); this.cargar(); },
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