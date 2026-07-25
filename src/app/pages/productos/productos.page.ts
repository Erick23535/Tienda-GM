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
  categoriaFiltro = 'todas';
  vistaGrid = true;
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
    let lista = this.productos;
    if (this.categoriaFiltro !== 'todas') {
      lista = lista.filter(p => p.categoria === this.categoriaFiltro);
    }
    if (this.busqueda) {
      const b = this.busqueda.toLowerCase();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(b) ||
        p.codigo.toLowerCase().includes(b)
      );
    }
    return lista;
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  get totalStockBajo(): number {
    return this.productos.filter(p => this.stockBajo(p)).length;
  }

  get valorInventario(): number {
    return this.productos.reduce((acc, p) => acc + (Number(p.precio_venta) * Number(p.stock_actual)), 0);
  }

  get nombresCategorias(): string[] {
    const cats = [...new Set(this.productos.map(p => p.categoria))];
    return cats.filter(c => c) as string[];
  }

  esNuevo(producto: any): boolean {
    if (!producto.fecha_creacion) return false;
    const fecha = new Date(producto.fecha_creacion);
    const dias  = (Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24);
    return dias <= 7;
  }

  tieneDescuento(producto: any): boolean {
    return producto.precio_original && producto.precio_original > producto.precio_venta;
  }

  porcentajeDescuento(producto: any): number {
    if (!this.tieneDescuento(producto)) return 0;
    return Math.round(100 - (producto.precio_venta / producto.precio_original * 100));
  }

  abrirFormulario(producto?: any) {
    this.editando       = !!producto;
    this.productoActual = producto ? { ...producto } : {
      id_categoria: '', codigo: '', nombre: '', talla: '',
      color: '', marca: '', imagen_url: '',
      precio_compra: 0, precio_venta: 0, precio_original: null,
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
      message: `¿Eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`,
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