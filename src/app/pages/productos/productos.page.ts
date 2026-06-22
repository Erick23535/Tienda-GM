import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ProductoService } from '../../services/producto';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: false,
})
export class ProductosPage implements OnInit {

  productos:  any[] = [];
  categorias: any[] = [];
  busqueda  = '';
  modoFormulario = false;
  editando       = false;
  productoActual: any = {};

  constructor(
    private productoSvc: ProductoService,
    private alert:       AlertController,
    private loading:     LoadingController,
    private toast:       ToastController
  ) {}

  ngOnInit() {
    this.cargarProductos();
    this.cargarCategorias();
  }

  async cargarProductos() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.productoSvc.listar().subscribe({
      next: (res) => { this.productos = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  cargarCategorias() {
    this.productoSvc.categorias().subscribe({
      next: (res) => this.categorias = res.datos
    });
  }

  get productosFiltrados() {
    if (!this.busqueda) return this.productos;
    const b = this.busqueda.toLowerCase();
    return this.productos.filter(p =>
      p.nombre.toLowerCase().includes(b) ||
      p.codigo.toLowerCase().includes(b)
    );
  }

  abrirFormulario(producto?: any) {
    this.editando       = !!producto;
    this.productoActual = producto ? { ...producto } : {
      id_categoria: '', codigo: '', nombre: '', talla: '',
      color: '', marca: '', imagen_url: '',
      precio_compra: 0, precio_venta: 0,
      stock_actual: 0, stock_minimo: 5
    };
    this.modoFormulario = true;
  }

  cerrarFormulario() {
    this.modoFormulario = false;
    this.productoActual = {};
  }

  async guardar() {
    if (!this.productoActual.nombre || !this.productoActual.codigo ||
        !this.productoActual.id_categoria) {
      this.mostrarToast('Nombre, código y categoría son obligatorios.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Guardando...' });
    await loader.present();

    const accion = this.editando
      ? this.productoSvc.editar(this.productoActual.id_producto, this.productoActual)
      : this.productoSvc.crear(this.productoActual);

    accion.subscribe({
      next: async () => {
        await loader.dismiss();
        this.mostrarToast(this.editando ? 'Producto actualizado.' : 'Producto creado.', 'success');
        this.cerrarFormulario();
        this.cargarProductos();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
      }
    });
  }

  async confirmarEliminar(producto: any) {
    const alerta = await this.alert.create({
      header:  'Eliminar producto',
      message: `¿Eliminar "${producto.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: () => this.eliminar(producto.id_producto) }
      ]
    });
    await alerta.present();
  }

  eliminar(id: number) {
    this.productoSvc.eliminar(id).subscribe({
      next: () => { this.mostrarToast('Producto eliminado.', 'success'); this.cargarProductos(); },
      error: (err) => { this.mostrarToast(err.error?.mensaje || 'Error al eliminar.', 'danger'); }
    });
  }

  stockBajo(producto: any): boolean {
    return producto.stock_actual <= producto.stock_minimo;
  }

  imagenError(event: any) {
    event.target.style.display = 'none';
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}