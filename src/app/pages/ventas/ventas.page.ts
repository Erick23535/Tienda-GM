import { Component, OnInit } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { VentaService } from '../../services/venta';
import { ProductoService } from '../../services/producto';

@Component({
  selector: 'app-ventas',
  templateUrl: './ventas.page.html',
  styleUrls: ['./ventas.page.scss'],
  standalone: false
})
export class VentasPage implements OnInit {

  seccion = 'nueva';

  productos:    any[] = [];
  carrito:      any[] = [];
  metodo_pago = 'efectivo';
  descuento   = 0;
  observaciones = '';
  busqueda    = '';

  ventas: any[] = [];

  constructor(
    private ventaSvc:    VentaService,
    private productoSvc: ProductoService,
    private alert:       AlertController,
    private loading:     LoadingController,
    private toast:       ToastController
  ) {}

  ngOnInit() {
    this.cargarProductos();
  }

  cambiarSeccion(sec: string) {
    this.seccion = sec;
    if (sec === 'historial') this.cargarVentas();
  }

  async cargarProductos() {
    this.productoSvc.listar().subscribe({
      next: (res) => this.productos = res.datos.filter((p: any) => p.stock_actual > 0)
    });
  }

  async cargarVentas() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.ventaSvc.listar().subscribe({
      next: (res) => { this.ventas = res.datos; loader.dismiss(); },
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

  agregarAlCarrito(producto: any) {
    const existe = this.carrito.find(i => i.id_producto === producto.id_producto);
    if (existe) {
      if (existe.cantidad < producto.stock_actual) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * existe.precio_unitario;
      } else {
        this.mostrarToast('Stock máximo alcanzado.', 'warning');
      }
    } else {
      this.carrito.push({
        id_producto:   producto.id_producto,
        nombre:        producto.nombre,
        talla:         producto.talla,
        color:         producto.color,
        precio_unitario: producto.precio_venta,
        cantidad:      1,
        subtotal:      producto.precio_venta,
        stock_max:     producto.stock_actual
      });
    }
  }

  quitarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
  }

  cambiarCantidad(item: any, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 1) {
      this.carrito = this.carrito.filter(i => i !== item);
      return;
    }
    if (nueva > item.stock_max) {
      this.mostrarToast('Stock máximo alcanzado.', 'warning');
      return;
    }
    item.cantidad = nueva;
    item.subtotal = nueva * item.precio_unitario;
  }

  get subtotal() {
    return this.carrito.reduce((acc, i) => acc + i.subtotal, 0);
  }

  get total() {
    const t = this.subtotal - this.descuento;
    return t < 0 ? 0 : t;
  }

  async registrarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Agrega productos al carrito.', 'warning');
      return;
    }

    const alerta = await this.alert.create({
      header:  'Confirmar venta',
      message: `Total a cobrar: $${this.total.toFixed(2)}`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', handler: () => this.procesarVenta() }
      ]
    });
    await alerta.present();
  }

  async procesarVenta() {
    const loader = await this.loading.create({ message: 'Registrando venta...' });
    await loader.present();

    const id_usuario = 1;

    const payload = {
      id_usuario,
      id_cliente:    null,
      metodo_pago:   this.metodo_pago,
      descuento:     this.descuento,
      observaciones: this.observaciones,
      detalle: this.carrito.map(i => ({
        id_producto: i.id_producto,
        cantidad:    i.cantidad
      }))
    };

    this.ventaSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mostrarToast(
          `Venta #${res.datos.id_venta} registrada. Total: $${res.datos.total}`,
          'success'
        );
        this.carrito       = [];
        this.descuento     = 0;
        this.observaciones = '';
        this.cargarProductos();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar.', 'danger');
      }
    });
  }

  async confirmarAnular(venta: any) {
    const alerta = await this.alert.create({
      header:  'Anular venta',
      message: `¿Anular venta #${venta.id_venta}? El stock será devuelto.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Anular',
          role: 'destructive',
          handler: () => this.anularVenta(venta.id_venta)
        }
      ]
    });
    await alerta.present();
  }

  anularVenta(id: number) {
    this.ventaSvc.anular(id).subscribe({
      next: () => {
        this.mostrarToast('Venta anulada y stock devuelto.', 'success');
        this.cargarVentas();
        this.cargarProductos();
      },
      error: (err) => {
        this.mostrarToast(err.error?.mensaje || 'Error al anular.', 'danger');
      }
    });
  }

  async cambiarEstadoEnvio(venta: any, nuevoEstado: string) {
    this.ventaSvc.actualizarEstadoEnvio(venta.id_venta, nuevoEstado).subscribe({
      next: () => {
        venta.estado_envio = nuevoEstado;
        this.mostrarToast(`Pedido marcado como ${nuevoEstado}.`, 'success');
      },
      error: (err) => this.mostrarToast(err.error?.mensaje || 'Error.', 'danger')
    });
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 4000, color });
    t.present();
  }
}