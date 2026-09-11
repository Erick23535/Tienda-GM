import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { ProductoService } from '../../services/producto';
import { ProveedorAdminService } from '../../services/proveedor-admin';

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
  usaTallas = false;
  tallasProducto: any[] = [];
  proveedores: any[] = [];
  modoSeleccionProveedor = false;
  busquedaProveedor = '';

  modoSeleccionCategoria = false;
  busquedaCategoria = '';

  modoExito = false;
  mensajeExito = '';

  modoConfirmarEliminar = false;
  productoSeleccionado: any = null;

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
  private productoSvc: ProductoService,
  private proveedorSvc: ProveedorAdminService,
  private loading:     LoadingController
) {}

  ngOnInit() {
  this.cargarProductos();
  this.cargarCategorias();
  this.cargarProveedores();
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

  cargarProveedores() {
  this.proveedorSvc.listar().subscribe({
    next: (res) => this.proveedores = res.datos
  });
}

  orden = 'nombre-asc';

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

    lista = [...lista];
    switch (this.orden) {
      case 'nombre-desc': lista.sort((a, b) => b.nombre.localeCompare(a.nombre)); break;
      case 'stock-asc':   lista.sort((a, b) => a.stock_actual - b.stock_actual); break;
      case 'stock-desc':  lista.sort((a, b) => b.stock_actual - a.stock_actual); break;
      case 'precio-asc':  lista.sort((a, b) => a.precio_venta - b.precio_venta); break;
      case 'precio-desc': lista.sort((a, b) => b.precio_venta - a.precio_venta); break;
      default:            lista.sort((a, b) => a.nombre.localeCompare(b.nombre));
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

  get categoriasFiltradas() {
    if (!this.busquedaCategoria) return this.categorias;
    const b = this.busquedaCategoria.toLowerCase();
    return this.categorias.filter(c => c.nombre.toLowerCase().includes(b));
  }

  get categoriaSeleccionadaNombre(): string {
    const c = this.categorias.find(c => c.id_categoria === this.productoActual.id_categoria);
    return c?.nombre || '';
  }

  get proveedorSeleccionadoNombre(): string {
  const p = this.proveedores.find(p => p.id_proveedor === this.productoActual.id_proveedor);
  return p?.nombre || '';
}

get proveedoresFiltrados() {
  if (!this.busquedaProveedor) return this.proveedores;
  const b = this.busquedaProveedor.toLowerCase();
  return this.proveedores.filter(p => p.nombre.toLowerCase().includes(b));
}

  abrirSelectorCategoria() {
    this.modoSeleccionCategoria = true;
    this.busquedaCategoria = '';
  }

  abrirSelectorProveedor() {
  this.modoSeleccionProveedor = true;
  this.busquedaProveedor = '';
}

cerrarSelectorProveedor() {
  this.modoSeleccionProveedor = false;
}

seleccionarProveedor(p: any) {
  this.productoActual.id_proveedor = p.id_proveedor;
  this.cerrarSelectorProveedor();
}

quitarProveedor() {
  this.productoActual.id_proveedor = null;
}

  cerrarSelectorCategoria() {
    this.modoSeleccionCategoria = false;
  }

  seleccionarCategoria(c: any) {
    this.productoActual.id_categoria = c.id_categoria;
    this.cerrarSelectorCategoria();
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

  this.tallasProducto = [];
  this.usaTallas = false;

  if (this.editando) {
    this.productoSvc.obtenerTallas(producto.id_producto).subscribe({
      next: (res) => {
        this.tallasProducto = res.datos;
        this.usaTallas = this.tallasProducto.length > 0;
      }
    });
  }

  this.modoFormulario = true;
  }

  toggleUsaTallas() {
  this.usaTallas = !this.usaTallas;
  if (this.usaTallas && this.tallasProducto.length === 0) {
    this.tallasProducto = [{ talla: '', stock_actual: 0 }];
  }
}

agregarFilaTalla() {
  this.tallasProducto.push({ talla: '', stock_actual: 0 });
}

quitarFilaTalla(index: number) {
  this.tallasProducto.splice(index, 1);
}

get stockTotalTallas(): number {
  return this.tallasProducto.reduce((acc, t) => acc + (Number(t.stock_actual) || 0), 0);
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

  if (this.usaTallas) {
    const tallasValidas = this.tallasProducto.filter(t => t.talla && t.talla.trim());
    if (tallasValidas.length === 0) {
      this.mostrarToast('Agrega al menos una talla o desactiva el uso de tallas.', 'warning');
      return;
    }
    this.productoActual.stock_actual = this.stockTotalTallas;
  }

  const loader = await this.loading.create({ message: 'Guardando...' });
  await loader.present();

  const accion = this.editando
    ? this.productoSvc.editar(this.productoActual.id_producto, this.productoActual)
    : this.productoSvc.crear(this.productoActual);

  accion.subscribe({
    next: async (res: any) => {
      const idProducto = this.editando ? this.productoActual.id_producto : res.datos.id_producto;

      if (this.usaTallas) {
        const tallasValidas = this.tallasProducto.filter(t => t.talla && t.talla.trim());
        this.productoSvc.guardarTallas(idProducto, tallasValidas).subscribe({
          next: async () => this.finalizarGuardado(loader),
          error: async () => this.finalizarGuardado(loader)
        });
      } else {
        this.finalizarGuardado(loader);
      }
    },
    error: async (err) => {
      await loader.dismiss();
      this.mostrarToast(err.error?.mensaje || 'Error al guardar.', 'danger');
    }
  });
}

async finalizarGuardado(loader: any) {
  await loader.dismiss();
  this.mensajeExito = this.editando ? 'Producto actualizado' : 'Producto creado';
  this.modoExito = true;
  this.cerrarFormulario();
  this.cargarProductos();
  setTimeout(() => this.modoExito = false, 2000);
}

  abrirConfirmarEliminar(producto: any) {
    this.productoSeleccionado = producto;
    this.modoConfirmarEliminar = true;
  }

  cerrarConfirmarEliminar() {
    this.modoConfirmarEliminar = false;
    this.productoSeleccionado = null;
  }

  confirmarEliminarDefinitivo() {
    const producto = this.productoSeleccionado;
    this.productoSvc.eliminar(producto.id_producto).subscribe({
      next: () => {
        this.cerrarConfirmarEliminar();
        this.mensajeExito = 'Producto eliminado';
        this.modoExito = true;
        this.cargarProductos();
        setTimeout(() => this.modoExito = false, 2000);
      },
      error: (err) => {
        this.mostrarToast(err.error?.mensaje || 'Error al eliminar.', 'danger');
        this.cerrarConfirmarEliminar();
      }
    });
  }

  stockBajo(producto: any): boolean {
    return producto.stock_actual <= producto.stock_minimo;
  }

  imagenError(event: any) {
    event.target.style.display = 'none';
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
}