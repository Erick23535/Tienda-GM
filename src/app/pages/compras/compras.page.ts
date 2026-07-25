import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { CompraService } from '../../services/compra';
import { ProductoService } from '../../services/producto';

@Component({
  selector: 'app-compras',
  templateUrl: './compras.page.html',
  styleUrls: ['./compras.page.scss'],
  standalone: false
})
export class ComprasPage implements OnInit {

  seccion = 'nueva'; // nueva | historial

  // Nueva compra
  proveedores:      any[] = [];
  productos:        any[] = [];
  id_proveedor_sel = '';
  busqueda         = '';
  carrito:          any[] = [];

  // Selector de proveedor
  modoSeleccionProveedor = false;
  busquedaProveedor = '';

  // Historial
  compras:     any[] = [];
  compraDetalle: any = null;

  constructor(
    private compraSvc:   CompraService,
    private productoSvc: ProductoService,
    private alert:       AlertController,
    private loading:     LoadingController,
    private toast:       ToastController
  ) {}

  ngOnInit() {
    this.cargarProveedores();
    this.cargarProductos();
  }

  cambiarSeccion(sec: string) {
    this.seccion = sec;
    if (sec === 'historial') this.cargarCompras();
    this.compraDetalle = null;
  }

  async cargarProveedores() {
    this.compraSvc.proveedores().subscribe({
      next: (res) => this.proveedores = res.datos
    });
  }

  async cargarProductos() {
    this.productoSvc.listar().subscribe({
      next: (res) => this.productos = res.datos
    });
  }

  async cargarCompras() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.compraSvc.listar().subscribe({
      next: (res) => { this.compras = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); }
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

  get proveedoresFiltrados() {
    if (!this.busquedaProveedor) return this.proveedores;
    const b = this.busquedaProveedor.toLowerCase();
    return this.proveedores.filter(p => p.nombre.toLowerCase().includes(b));
  }

  get proveedorSeleccionadoNombre(): string {
    const p = this.proveedores.find(p => p.id_proveedor === this.id_proveedor_sel);
    return p?.nombre || '';
  }

  abrirSelectorProveedor() {
    this.modoSeleccionProveedor = true;
    this.busquedaProveedor = '';
  }

  cerrarSelectorProveedor() {
    this.modoSeleccionProveedor = false;
  }

  seleccionarProveedor(p: any) {
    this.id_proveedor_sel = p.id_proveedor;
    this.cerrarSelectorProveedor();
  }

  get totalCarrito(): number {
    return this.carrito.reduce((acc, i) => acc + Number(i.subtotal || 0), 0);
  }

  get unidadesCarrito(): number {
    return this.carrito.reduce((acc, i) => acc + i.cantidad, 0);
  }

  get totalHistorial(): number {
    return this.compras
      .filter(c => c.estado === 'recibida')
      .reduce((acc, c) => acc + Number(c.total || 0), 0);
  }

  get totalRecibidas(): number {
    return this.compras.filter(c => c.estado === 'recibida').length;
  }

  get totalAnuladas(): number {
    return this.compras.filter(c => c.estado === 'anulada').length;
  }

  agregarAlCarrito(producto: any) {
    const existe = this.carrito.find(i => i.id_producto === producto.id_producto);
    if (existe) {
      existe.cantidad++;
      existe.subtotal = existe.cantidad * existe.precio_unitario;
      this.mostrarToast(`+1 ${producto.nombre}`, 'success');
    } else {
      const precio = Number(producto.precio_compra) || 0;
      this.carrito.push({
        id_producto:     producto.id_producto,
        nombre:          producto.nombre,
        codigo:          producto.codigo,
        talla:           producto.talla,
        precio_unitario: precio,
        cantidad:        1,
        subtotal:        precio
      });
      this.mostrarToast(`${producto.nombre} agregado`, 'success');
    }
  }

  cambiarCantidad(item: any, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 1) {
      this.carrito = this.carrito.filter(i => i !== item);
      return;
    }
    item.cantidad = nueva;
    item.subtotal = nueva * Number(item.precio_unitario || 0);
  }

  cambiarPrecio(item: any, event: any) {
    const valor  = event?.detail?.value ?? 0;
    const precio = Number(valor) || 0;

    item.precio_unitario = precio;
    item.subtotal        = item.cantidad * precio;
  }

  eliminarDelCarrito(item: any) {
    this.carrito = this.carrito.filter(i => i !== item);
  }

  async registrarCompra() {
    if (!this.id_proveedor_sel) {
      this.mostrarToast('Selecciona un proveedor.', 'warning');
      return;
    }
    if (this.carrito.length === 0) {
      this.mostrarToast('Agrega productos a la compra.', 'warning');
      return;
    }

    const invalidos = this.carrito.filter(i => !i.precio_unitario || i.precio_unitario <= 0);
    if (invalidos.length > 0) {
      this.mostrarToast('Todos los productos deben tener precio de compra.', 'warning');
      return;
    }

    const alerta = await this.alert.create({
      header:  'Confirmar compra',
      message: `Total: $${this.totalCarrito.toFixed(2)}\nSe actualizará el stock automáticamente.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.procesarCompra() }
      ]
    });
    await alerta.present();
  }

  async procesarCompra() {
    const loader = await this.loading.create({ message: 'Registrando compra...' });
    await loader.present();

    const payload = {
      id_proveedor: this.id_proveedor_sel,
      id_usuario:   1,
      detalle: this.carrito.map(i => ({
        id_producto:     i.id_producto,
        cantidad:        i.cantidad,
        precio_unitario: i.precio_unitario
      }))
    };

    this.compraSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mostrarToast(`Compra #${res.datos.id_compra} registrada. Total: $${res.datos.total}`, 'success');
        this.carrito          = [];
        this.id_proveedor_sel = '';
        this.cargarProductos();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar.', 'danger');
      }
    });
  }

  async verDetalle(compra: any) {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.compraSvc.obtener(compra.id_compra).subscribe({
      next: (res) => { this.compraDetalle = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); }
    });
  }

  async confirmarAnular(compra: any) {
    const alerta = await this.alert.create({
      header:  'Anular compra',
      message: `¿Anular compra #${compra.id_compra}? El stock será revertido.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Anular', role: 'destructive',
          handler: () => {
            this.compraSvc.anular(compra.id_compra).subscribe({
              next: () => {
                this.mostrarToast('Compra anulada y stock revertido.', 'success');
                this.compraDetalle = null;
                this.cargarCompras();
              },
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