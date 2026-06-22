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

  productos:     any[] = [];
  carrito:       any[] = [];
  metodo_pago  = 'efectivo';
  descuento    = 0;
  observaciones  = '';
  busqueda     = '';

  // Transferencia
  comprobante_url  = '';
  comprobante_preview = '';

  // Tarjeta
  tarjeta_nombre   = '';
  tarjeta_numero   = '';
  tarjeta_expiry   = '';
  tarjeta_cvv      = '';

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
        id_producto:     producto.id_producto,
        nombre:          producto.nombre,
        talla:           producto.talla,
        color:           producto.color,
        imagen_url:      producto.imagen_url,
        precio_unitario: producto.precio_venta,
        cantidad:        1,
        subtotal:        producto.precio_venta,
        stock_max:       producto.stock_actual
      });
    }
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

  // Previsualizar imagen del comprobante al pegar URL
  onComprobanteUrlChange() {
    this.comprobante_preview = this.comprobante_url;
  }

  // Formatear número de tarjeta con espacios
  formatearTarjeta() {
    let val = this.tarjeta_numero.replace(/\D/g, '').substring(0, 16);
    this.tarjeta_numero = val.replace(/(.{4})/g, '$1 ').trim();
  }

  // Formatear expiración MM/AA
  formatearExpiry() {
    let val = this.tarjeta_expiry.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      this.tarjeta_expiry = val.substring(0, 2) + '/' + val.substring(2);
    } else {
      this.tarjeta_expiry = val;
    }
  }

  validarPago(): boolean {
    if (this.metodo_pago === 'transferencia') {
      if (!this.comprobante_url) {
        this.mostrarToast('Debes adjuntar el comprobante de transferencia.', 'warning');
        return false;
      }
    }
    if (this.metodo_pago === 'tarjeta') {
      if (!this.tarjeta_nombre || !this.tarjeta_numero || !this.tarjeta_expiry || !this.tarjeta_cvv) {
        this.mostrarToast('Completa todos los datos de la tarjeta.', 'warning');
        return false;
      }
    }
    return true;
  }

  async registrarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Agrega productos al carrito.', 'warning');
      return;
    }

    if (!this.validarPago()) return;

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

    // Armar datos de tarjeta como string
    let datos_tarjeta = null;
    if (this.metodo_pago === 'tarjeta') {
      const num = this.tarjeta_numero.replace(/\s/g, '');
      datos_tarjeta = `${this.tarjeta_nombre}|****${num.slice(-4)}|${this.tarjeta_expiry}`;
    }

    const payload = {
      id_usuario,
      id_cliente:      null,
      metodo_pago:     this.metodo_pago,
      descuento:       this.descuento,
      observaciones:   this.observaciones,
      comprobante_url: this.metodo_pago === 'transferencia' ? this.comprobante_url : null,
      datos_tarjeta,
      detalle: this.carrito.map(i => ({
        id_producto: i.id_producto,
        cantidad:    i.cantidad
      }))
    };

    this.ventaSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mostrarToast(`Venta #${res.datos.id_venta} registrada. Total: $${res.datos.total}`, 'success');
        this.limpiarFormulario();
        this.cargarProductos();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar.', 'danger');
      }
    });
  }

  limpiarFormulario() {
    this.carrito          = [];
    this.descuento        = 0;
    this.observaciones    = '';
    this.comprobante_url  = '';
    this.comprobante_preview = '';
    this.tarjeta_nombre   = '';
    this.tarjeta_numero   = '';
    this.tarjeta_expiry   = '';
    this.tarjeta_cvv      = '';
  }

  async confirmarAnular(venta: any) {
    const alerta = await this.alert.create({
      header:  'Anular venta',
      message: `¿Anular venta #${venta.id_venta}? El stock será devuelto.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Anular', role: 'destructive', handler: () => this.anularVenta(venta.id_venta) }
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

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 4000, color });
    t.present();
  }
}