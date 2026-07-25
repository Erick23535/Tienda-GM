import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { ProductoService } from '../../services/producto';
import { ConfiguracionService } from '../../services/configuracion';
import { VentaService } from '../../services/venta';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: false
})
export class TiendaPage implements OnInit {

  nombre   = '';
  correo   = '';
  seccion  = 'inicio';

  productos:   any[] = [];
  busqueda   = '';
  categoriaSeleccionada = 'todas';
  categorias: string[] = [];
  categoriasInfo: any[] = [];

  carrito: any[] = [];

  productoVista: any = null;
  modoConfirmarPedido = false;
  modoCerrarSesion = false;
  pasoConfirmacion = 1;
  metodoPago = 'efectivo';
  comprobante_url = '';
  tarjeta_nombre = '';
  tarjeta_numero = '';
  tarjeta_expiry = '';
  tarjeta_cvv = '';
  direccion_envio = '';
  ciudad_envio = '';
  telefono_contacto = '';

  bannerUrl = '';

  misPedidos: any[] = [];

  coloresCategorias: any = {
    'Camisetas':      { color1: '#7c3aed', color2: '#a78bfa', icon: 'shirt-outline' },
    'Pantalones':     { color1: '#0369a1', color2: '#38bdf8', icon: 'shirt-outline' },
    'Vestidos':       { color1: '#be185d', color2: '#f472b6', icon: 'shirt-outline' },
    'Ropa deportiva': { color1: '#15803d', color2: '#4ade80', icon: 'fitness-outline' },
    'Accesorios':     { color1: '#b45309', color2: '#fbbf24', icon: 'watch-outline' },
  };

  constructor(
    private router:      Router,
    private productoSvc: ProductoService,
    private configSvc:   ConfiguracionService,
    private ventaSvc:    VentaService,
    private loading:     LoadingController,
    private toast:       ToastController
  ) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('cliente_nombre') || 'Cliente';
    this.correo = localStorage.getItem('cliente_correo') || '';
    this.cargarProductos();
    this.cargarBanner();
  }

  cargarBanner() {
    this.configSvc.obtener().subscribe({
      next: (res) => this.bannerUrl = res.datos.banner_url || ''
    });
  }

  get iniciales(): string {
    const partes = this.nombre.trim().split(' ');
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return this.nombre.substring(0, 2).toUpperCase();
  }

  async cargarProductos() {
    this.productoSvc.listar().subscribe({
      next: (res) => {
        this.productos = res.datos.filter((p: any) =>
          p.stock_actual > 0 && p.estado === 'activo'
        );
        const cats = [...new Set(this.productos.map((p: any) => p.categoria))];
        this.categorias = cats.filter(c => c) as string[];
        this.cargarInfoCategorias();
      }
    });
  }

  cargarInfoCategorias() {
    this.productoSvc.categorias().subscribe({
      next: (res) => this.categoriasInfo = res.datos
    });
  }

  imagenCategoria(nombreCat: string): string | null {
    const cat = this.categoriasInfo.find(c => c.nombre === nombreCat);
    return cat?.imagen_url || null;
  }

  get productosFiltrados() {
    let lista = this.productos;
    if (this.categoriaSeleccionada !== 'todas') {
      lista = lista.filter(p => p.categoria === this.categoriaSeleccionada);
    }
    if (this.busqueda) {
      const b = this.busqueda.toLowerCase();
      lista = lista.filter(p =>
        p.nombre.toLowerCase().includes(b) ||
        (p.marca && p.marca.toLowerCase().includes(b))
      );
    }
    return lista;
  }

  get totalCarrito(): number {
    return this.carrito.reduce((acc, i) => acc + i.subtotal, 0);
  }

  get cantidadCarrito(): number {
    return this.carrito.reduce((acc, i) => acc + i.cantidad, 0);
  }

  get totalProductos(): number {
    return this.productos.length;
  }

  colorCategoria(cat: string, indice: number) {
    if (this.coloresCategorias[cat]) return this.coloresCategorias[cat];
    const paleta = [
      { color1: '#7c3aed', color2: '#a78bfa', icon: 'shirt-outline' },
      { color1: '#0369a1', color2: '#38bdf8', icon: 'shirt-outline' },
      { color1: '#be185d', color2: '#f472b6', icon: 'shirt-outline' },
      { color1: '#15803d', color2: '#4ade80', icon: 'shirt-outline' },
      { color1: '#b45309', color2: '#fbbf24', icon: 'shirt-outline' },
    ];
    return paleta[indice % paleta.length];
  }

  contarPorCategoria(cat: string): number {
    return this.productos.filter(p => p.categoria === cat).length;
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

  verProducto(producto: any) {
    this.productoVista = producto;
  }

  cerrarModal() {
    this.productoVista = null;
  }

  agregarDesdeModal() {
    this.agregarAlCarrito(this.productoVista);
    this.cerrarModal();
  }

  agregarAlCarrito(producto: any) {
    const existe = this.carrito.find(i => i.id_producto === producto.id_producto);
    if (existe) {
      if (existe.cantidad < producto.stock_actual) {
        existe.cantidad++;
        existe.subtotal = existe.cantidad * existe.precio_unitario;
        this.mostrarToast(`+1 ${producto.nombre}`, 'success');
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
      this.mostrarToast(`${producto.nombre} agregado al carrito 🛒`, 'success');
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

  eliminarDelCarrito(item: any) {
    this.carrito = this.carrito.filter(i => i !== item);
  }

  confirmarPedido() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Tu carrito está vacío.', 'warning');
      return;
    }
    this.pasoConfirmacion = 1;
    this.modoConfirmarPedido = true;
  }

  cerrarConfirmarPedido() {
    this.modoConfirmarPedido = false;
    this.metodoPago = 'efectivo';
    this.comprobante_url = '';
    this.tarjeta_nombre = '';
    this.tarjeta_numero = '';
    this.tarjeta_expiry = '';
    this.tarjeta_cvv = '';
    this.direccion_envio = '';
    this.ciudad_envio = '';
    this.telefono_contacto = '';
  }

  irADireccion() {
    this.pasoConfirmacion = 2;
  }

  irAPago() {
    if (!this.direccion_envio || !this.ciudad_envio || !this.telefono_contacto) {
      this.mostrarToast('Completa todos los datos de envío.', 'warning');
      return;
    }
    this.pasoConfirmacion = 3;
  }

  volverAResumen() {
    this.pasoConfirmacion = 1;
  }

  volverADireccion() {
    this.pasoConfirmacion = 2;
  }

  formatearTarjeta() {
    let val = this.tarjeta_numero.replace(/\D/g, '').substring(0, 16);
    this.tarjeta_numero = val.replace(/(.{4})/g, '$1 ').trim();
  }

  formatearExpiry() {
    let val = this.tarjeta_expiry.replace(/\D/g, '').substring(0, 4);
    this.tarjeta_expiry = val.length >= 3 ? val.substring(0,2) + '/' + val.substring(2) : val;
  }

  async procesarPedidoFinal() {
    if (this.metodoPago === 'transferencia' && !this.comprobante_url) {
      this.mostrarToast('Adjunta el comprobante de transferencia.', 'warning');
      return;
    }
    if (this.metodoPago === 'tarjeta' && (!this.tarjeta_nombre || !this.tarjeta_numero || !this.tarjeta_expiry || !this.tarjeta_cvv)) {
      this.mostrarToast('Completa los datos de la tarjeta.', 'warning');
      return;
    }

    const loader = await this.loading.create({ message: 'Enviando pedido...' });
    await loader.present();

    const id_cliente = localStorage.getItem('cliente_id');

    let datos_tarjeta = null;
    if (this.metodoPago === 'tarjeta') {
      const num = this.tarjeta_numero.replace(/\s/g, '');
      datos_tarjeta = `${this.tarjeta_nombre}|****${num.slice(-4)}|${this.tarjeta_expiry}`;
    }

    const payload = {
      id_usuario:        1,
      id_cliente:        id_cliente,
      metodo_pago:       this.metodoPago,
      descuento:         0,
      observaciones:     'Pedido realizado desde la tienda por el cliente',
      comprobante_url:   this.metodoPago === 'transferencia' ? this.comprobante_url : null,
      datos_tarjeta,
      direccion_envio:   this.direccion_envio,
      ciudad_envio:      this.ciudad_envio,
      telefono_contacto: this.telefono_contacto,
      detalle: this.carrito.map(i => ({
        id_producto: i.id_producto,
        cantidad:    i.cantidad
      }))
    };

    this.ventaSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.carrito = [];
        this.seccion = 'inicio';
        this.cerrarConfirmarPedido();
        this.mostrarToast(`¡Pedido #${res.datos.id_venta} enviado! Te contactaremos pronto.`, 'success');
        this.cargarProductos();
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al procesar el pedido.', 'danger');
      }
    });
  }

  irACatalogo() {
    this.seccion = 'catalogo';
  }

  verMisPedidos() {
    const id_cliente = localStorage.getItem('cliente_id');
    if (!id_cliente) return;

    this.ventaSvc.listarPorCliente(id_cliente).subscribe({
      next: (res) => {
        this.misPedidos = res.datos;
        this.seccion = 'pedidos';
      },
      error: () => this.mostrarToast('Error al cargar pedidos.', 'danger')
    });
  }

  textoEstadoEnvio(estado: string): string {
    const textos: any = {
      pendiente:  'Preparando tu pedido',
      despachado: 'En camino',
      entregado:  'Entregado'
    };
    return textos[estado] || 'Preparando tu pedido';
  }

  colorEstadoEnvio(estado: string): string {
    const colores: any = {
      pendiente:  '#f97316',
      despachado: '#38bdf8',
      entregado:  '#22c55e'
    };
    return colores[estado] || '#f97316';
  }

  confirmarCerrarSesion() {
    this.modoCerrarSesion = true;
  }

  cancelarCerrarSesion() {
    this.modoCerrarSesion = false;
  }

  cerrarSesion() {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('cliente_nombre');
    localStorage.removeItem('cliente_correo');
    localStorage.removeItem('cliente_id');
    this.router.navigate(['/login-cliente']);
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 2500, color });
    t.present();
  }
}