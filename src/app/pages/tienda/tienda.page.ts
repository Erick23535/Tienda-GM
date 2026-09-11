import {
  Component, OnInit, AfterViewInit, ChangeDetectorRef,
  ElementRef, QueryList, ViewChild, ViewChildren
} from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { animate, stagger } from 'animejs';
import { ProductoService } from '../../services/producto';
import { ConfiguracionService } from '../../services/configuracion';
import { VentaService } from '../../services/venta';
import { NotificacionService } from '../../services/notificacion';
import { FavoritoService } from '../../services/favorito';
import { ResenaService } from '../../services/resena';
import { ProductCardComponent } from '../../components/product-card/product-card';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: false
})
export class TiendaPage implements OnInit, AfterViewInit {

  @ViewChild('heroRef') heroRef?: ElementRef<HTMLElement>;
  @ViewChildren(ProductCardComponent, { read: ElementRef }) productCardEls?: QueryList<ElementRef<HTMLElement>>;

  nombre   = '';
  correo   = '';
  seccion  = 'inicio';

  productos:   any[] = [];
  busqueda   = '';
  categoriaSeleccionada = 'todas';
  categorias: string[] = [];
  categoriasInfo: any[] = [];
  carrito: any[] = [];
  favoritosIds: number[] = [];
  misFavoritos: any[] = [];

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
  modoAvisoDatos = false;
  modoExitoPedido = false;
  ultimoPedidoId: number | null = null;
  tallaSeleccionada: any = null;

  bannerUrl = '';
  ivaActivo = true;

  // El catálogo es público; esto controla el modal que pide iniciar sesión
  // solo cuando el visitante intenta comprar o marcar un favorito.
  modoRequiereLogin = false;
  mensajeRequiereLogin = '';

  // Reseñas del producto que se está viendo en el modal de detalle.
  resenasProducto: any[] = [];
  promedioResenas: number | null = null;
  totalResenas = 0;
  miResena: any = null;
  calificacionForm = 0;
  comentarioForm = '';
  enviandoResena = false;

  get haySesionCliente(): boolean {
    return !!localStorage.getItem('cliente_id');
  }

  contadorProductos = 0;
  contadorCategorias = 0;
  contadoresAnimados = false;
  heroParallax = { x: 0, y: 0 };

  misPedidos: any[] = [];

  notificaciones: any[] = [];
  totalNoLeidas = 0;
  modoNotificaciones = false;

  notiCarrito: any = null;
  notiFavorito: { producto: any, agregado: boolean } | null = null;

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

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
    private notiSvc:      NotificacionService,
    private favoritoSvc:  FavoritoService,
    private resenaSvc:    ResenaService,
    private loading:     LoadingController,
    private cdr:          ChangeDetectorRef
  ) {}

  ngOnInit() {
  this.modoCerrarSesion = false;
  this.modoConfirmarPedido = false;
  this.modoNotificaciones = false;
  this.productoVista = null;
  this.nombre = localStorage.getItem('cliente_nombre') || 'Cliente';
  this.correo = localStorage.getItem('cliente_correo') || '';
  this.cargarCarritoLocal();
  this.cargarProductos();
  this.cargarBanner();
  this.cargarContadorNotificaciones();
  this.cargarFavoritosIds();
}

  ngAfterViewInit() {
    this.animarHero();

    // Cada vez que cambia la lista de tarjetas renderizadas (cambio de
    // sección, filtro de categoría, búsqueda, favoritos cargados) se
    // vuelve a animar la entrada de las que están visibles ahora.
    this.productCardEls?.changes.subscribe(() => this.animarTarjetasProducto());
    this.animarTarjetasProducto();
  }

  private animarHero() {
    const el = this.heroRef?.nativeElement;
    if (!el) return;

    const targets = el.querySelectorAll('.fade-in-up');
    if (!targets.length) return;

    animate(targets, {
      opacity: [0, 1],
      translateY: [14, 0],
      delay: stagger(90),
      duration: 550,
      ease: 'outQuad',
    });
  }

  private animarTarjetasProducto() {
    const els = this.productCardEls?.map(ref => ref.nativeElement).filter(Boolean) ?? [];
    if (!els.length) return;

    animate(els, {
      opacity: [0, 1],
      translateY: [16, 0],
      scale: [0.96, 1],
      delay: stagger(60, { start: 80 }),
      duration: 500,
      ease: 'outQuad',
    });
  }

  cargarBanner() {
  this.configSvc.obtener().subscribe({
    next: (res) => {
      this.bannerUrl = res.datos.banner_url || '';
      this.ivaActivo = res.datos.iva_activo === undefined ? true : res.datos.iva_activo === '1';
    }
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
        this.animarContadoresHero();
      }
    });
  }

  // Cuenta de 0 al valor real una sola vez, para el hero de inicio.
  private animarContadoresHero() {
    if (this.contadoresAnimados) return;
    this.contadoresAnimados = true;

    const duracionMs = 900;
    const inicio = performance.now();
    const metaProductos  = this.productos.length;
    const metaCategorias = this.categorias.length;

    const paso = (ahora: number) => {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs);
      const easing = 1 - Math.pow(1 - progreso, 3);
      this.contadorProductos  = Math.round(metaProductos  * easing);
      this.contadorCategorias = Math.round(metaCategorias * easing);
      if (progreso < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  // Parallax sutil de los blobs decorativos del hero (solo escritorio,
  // el CSS ignora esto en pantallas angostas vía media query).
  onHeroMouseMove(event: MouseEvent) {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width  - 0.5;
    const relY = (event.clientY - rect.top)  / rect.height - 0.5;
    this.heroParallax = { x: relX * 16, y: relY * 16 };
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

  get ivaCarrito(): number {
  return this.ivaActivo ? this.totalCarrito * 0.15 : 0;
  }

  get totalConIva(): number {
  return this.totalCarrito + this.ivaCarrito;
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
  this.tallaSeleccionada = null;
  if (producto.tallas && producto.tallas.length > 0) {
    const primeraDisponible = producto.tallas.find((t: any) => t.stock_actual > 0);
    if (primeraDisponible) this.tallaSeleccionada = primeraDisponible;
  }
  this.cargarResenas(producto.id_producto);
  }

  cargarResenas(id_producto: number) {
    this.resenasProducto = [];
    this.promedioResenas = null;
    this.totalResenas = 0;
    this.miResena = null;
    this.calificacionForm = 0;
    this.comentarioForm = '';

    this.resenaSvc.porProducto(id_producto).subscribe({
      next: (res) => {
        this.resenasProducto = res.datos.resenas;
        this.promedioResenas = res.datos.promedio;
        this.totalResenas = res.datos.total;

        const id_cliente = localStorage.getItem('cliente_id');
        if (id_cliente) {
          const propia = this.resenasProducto.find(r => r.id_cliente === +id_cliente);
          if (propia) {
            this.miResena = propia;
            this.calificacionForm = propia.calificacion;
            this.comentarioForm = propia.comentario || '';
          }
        }
      }
    });
  }

  seleccionarEstrella(n: number) {
    this.calificacionForm = n;
  }

  enviarResena() {
    if (!this.haySesionCliente) {
      this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para dejar tu reseña.';
      this.modoRequiereLogin = true;
      return;
    }
    if (this.calificacionForm < 1) {
      this.mostrarToast('Selecciona al menos una estrella.', 'warning');
      return;
    }

    this.enviandoResena = true;
    this.resenaSvc.guardar(this.productoVista.id_producto, this.calificacionForm, this.comentarioForm).subscribe({
      next: () => {
        this.enviandoResena = false;
        this.mostrarToast(this.miResena ? 'Reseña actualizada.' : '¡Gracias por tu reseña!', 'success');
        this.cargarResenas(this.productoVista.id_producto);
      },
      error: (err) => {
        this.enviandoResena = false;
        this.mostrarToast(err.error?.mensaje || 'Error al enviar tu reseña.', 'danger');
      }
    });
  }

  eliminarMiResena() {
    if (!this.miResena) return;
    this.resenaSvc.eliminar(this.miResena.id_resena).subscribe({
      next: () => {
        this.mostrarToast('Reseña eliminada.', 'success');
        this.cargarResenas(this.productoVista.id_producto);
      },
      error: () => this.mostrarToast('Error al eliminar tu reseña.', 'danger')
    });
  }

  cargarFavoritosIds() {
  const id_cliente = localStorage.getItem('cliente_id');
  if (!id_cliente) return;

  this.favoritoSvc.listarIds(id_cliente).subscribe({
    next: (res) => this.favoritosIds = res.datos
  });
}

esFavorito(producto: any): boolean {
  return this.favoritosIds.includes(producto.id_producto);
}

toggleFavorito(producto: any, event?: Event) {
  if (event) event.stopPropagation();
  const id_cliente = localStorage.getItem('cliente_id');
  if (!id_cliente) {
    this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para guardar productos en tus favoritos.';
    this.modoRequiereLogin = true;
    return;
  }

  this.favoritoSvc.toggle(id_cliente, producto.id_producto).subscribe({
    next: (res) => {
      if (res.datos.favorito) {
        this.favoritosIds = [...this.favoritosIds, producto.id_producto];
      } else {
        this.favoritosIds = this.favoritosIds.filter(id => id !== producto.id_producto);
        if (this.seccion === 'favoritos') this.cargarMisFavoritos();
      }
      this.mostrarNotiFavorito(producto, res.datos.favorito);
      this.cdr.detectChanges();
    },
    error: () => this.mostrarToast('Error al actualizar favoritos.', 'danger')
  });
}

mostrarNotiFavorito(producto: any, agregado: boolean) {
  this.notiFavorito = { producto, agregado };
  this.cdr.detectChanges();
  setTimeout(() => {
    this.notiFavorito = null;
    this.cdr.detectChanges();
  }, 2200);
}

cargarMisFavoritos() {
  const id_cliente = localStorage.getItem('cliente_id');
  if (!id_cliente) return;

  this.favoritoSvc.listar(id_cliente).subscribe({
    next: (res) => this.misFavoritos = res.datos,
    error: () => this.mostrarToast('Error al cargar favoritos.', 'danger')
  });
}

irAFavoritos() {
  if (!this.haySesionCliente) {
    this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para ver tus favoritos.';
    this.modoRequiereLogin = true;
    return;
  }
  this.seccion = 'favoritos';
  this.cargarMisFavoritos();
}

// Handler de la barra de navegación inferior.
cambiarSeccion(sec: string) {
  if (sec === 'favoritos') {
    this.irAFavoritos();
  } else {
    this.seccion = sec;
  }
}

  seleccionarTalla(t: any) {
  if (t.stock_actual <= 0) return;
  this.tallaSeleccionada = t;
  }

  cerrarModal() {
    this.productoVista = null;
  }

  agregarDesdeModal() {
    this.agregarAlCarrito(this.productoVista);
    this.cerrarModal();
  }

 // El carrito se guarda en localStorage (no atado a la cuenta) para que
 // sobreviva la ida y vuelta a login/registro cuando un invitado decide
 // comprar, y a un refresco de página.
 private cargarCarritoLocal() {
   try {
     const guardado = localStorage.getItem('carrito_tienda');
     this.carrito = guardado ? JSON.parse(guardado) : [];
   } catch {
     this.carrito = [];
   }
 }

 private guardarCarritoLocal() {
   localStorage.setItem('carrito_tienda', JSON.stringify(this.carrito));
 }

 agregarAlCarrito(producto: any) {
  const usaTallas = producto.tallas && producto.tallas.length > 0;

  if (usaTallas && !this.tallaSeleccionada) {
    this.mostrarToast('Selecciona una talla.', 'warning');
    return;
  }

  const precioUnitario = Number(producto.precio_venta) || 0;
  const tallaTexto = usaTallas ? this.tallaSeleccionada.talla : producto.talla;
  const stockDisponible = usaTallas ? this.tallaSeleccionada.stock_actual : producto.stock_actual;
  const idTalla = usaTallas ? this.tallaSeleccionada.id_talla : null;

  const claveUnica = usaTallas ? `${producto.id_producto}-${idTalla}` : `${producto.id_producto}`;
  const existe = this.carrito.find(i => i.clave === claveUnica);

  if (existe) {
    if (existe.cantidad < stockDisponible) {
      existe.cantidad++;
      existe.subtotal = existe.cantidad * precioUnitario;
      existe.precio_unitario = precioUnitario;
      this.mostrarNotiCarrito(producto);
    } else {
      this.mostrarToast('Stock máximo alcanzado.', 'warning');
    }
  } else {
    this.carrito = [...this.carrito, {
      clave:           claveUnica,
      id_producto:     producto.id_producto,
      id_talla:        idTalla,
      nombre:          producto.nombre,
      talla:           tallaTexto,
      color:           producto.color,
      imagen_url:      producto.imagen_url,
      precio_unitario: precioUnitario,
      cantidad:        1,
      subtotal:        precioUnitario,
      stock_max:       stockDisponible
    }];
    this.mostrarNotiCarrito(producto);
    }
    this.guardarCarritoLocal();
    this.cdr.detectChanges();
    this.tallaSeleccionada = null;
  }

  mostrarNotiCarrito(producto: any) {
    this.notiCarrito = producto;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.notiCarrito = null;
      this.cdr.detectChanges();
    }, 2500);
  }

  cambiarCantidad(item: any, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 1) {
      this.carrito = this.carrito.filter(i => i !== item);
      this.guardarCarritoLocal();
      this.cdr.detectChanges();
      return;
    }
    if (nueva > item.stock_max) {
      this.mostrarToast('Stock máximo alcanzado.', 'warning');
      return;
    }
    item.cantidad = nueva;
    item.subtotal = nueva * item.precio_unitario;
    this.guardarCarritoLocal();
    this.cdr.detectChanges();
  }

  eliminarDelCarrito(item: any) {
    this.carrito = this.carrito.filter(i => i !== item);
    this.guardarCarritoLocal();
    this.cdr.detectChanges();
  }

  confirmarPedido() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Tu carrito está vacío.', 'warning');
      return;
    }
    if (!this.haySesionCliente) {
      this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para completar tu compra. No perderás lo que tienes en el carrito.';
      this.modoRequiereLogin = true;
      return;
    }
    this.pasoConfirmacion = 1;
    this.modoConfirmarPedido = true;
  }

  cerrarRequiereLogin() {
    this.modoRequiereLogin = false;
  }

  irALoginDesdeAviso() {
    this.modoRequiereLogin = false;
    this.router.navigate(['/login-cliente']);
  }

  irARegistroDesdeAviso() {
    this.modoRequiereLogin = false;
    this.router.navigate(['/registro-cliente']);
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
    this.modoAvisoDatos = true;
    setTimeout(() => this.modoAvisoDatos = false, 2200);
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
      id_talla:    i.id_talla || null,
      cantidad:    i.cantidad
     }))
    };

    this.ventaSvc.crear(payload).subscribe({
  next: async (res) => {
    await loader.dismiss();
    this.carrito = [];
    this.guardarCarritoLocal();
    this.seccion = 'inicio';
    this.cerrarConfirmarPedido();
    this.ultimoPedidoId = res.datos.id_venta;
    this.modoExitoPedido = true;
    this.cargarProductos();
    this.cargarContadorNotificaciones();
    setTimeout(() => this.modoExitoPedido = false, 3500);
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
    if (!id_cliente) {
      this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para ver tus pedidos.';
      this.modoRequiereLogin = true;
      return;
    }

    this.ventaSvc.listarPorCliente(id_cliente).subscribe({
      next: (res) => {
        this.misPedidos = res.datos;
        this.seccion = 'pedidos';
      },
      error: () => this.mostrarToast('Error al cargar pedidos.', 'danger')
    });
  }
  confirmarRecepcion(pedido: any) {
  this.ventaSvc.confirmarRecepcion(pedido.id_venta).subscribe({
    next: (res) => {
      pedido.confirmado_cliente = 1;
      this.mostrarToast(res.mensaje, 'success');
    },
    error: (err) => this.mostrarToast(err.error?.mensaje || 'Error al confirmar.', 'danger')
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

  // Pasos del timeline de seguimiento para un pedido, en orden.
  pasosEnvio(pedido: any): { icono: string, titulo: string, completado: boolean, activo: boolean }[] {
    const estado = pedido.estado_envio || 'pendiente';
    const orden = ['pendiente', 'despachado', 'entregado'];
    const indiceActual = orden.indexOf(estado);

    const pasos = [
      { icono: 'checkmark-done-outline', titulo: 'Pedido confirmado', clave: 'pendiente' },
      { icono: 'car-outline',            titulo: 'En camino',         clave: 'despachado' },
      { icono: 'home-outline',           titulo: 'Entregado',         clave: 'entregado' },
    ].map((p, i) => ({
      icono: p.icono,
      titulo: p.titulo,
      completado: i <= indiceActual,
      activo: i === indiceActual,
    }));

    if (pedido.confirmado_cliente) {
      pasos.push({
        icono: 'checkmark-circle-outline',
        titulo: 'Recepción confirmada',
        completado: true,
        activo: true,
      });
    }

    return pasos;
  }

  cargarContadorNotificaciones() {
    const id_cliente = localStorage.getItem('cliente_id');
    if (!id_cliente) return;

    this.notiSvc.contarNoLeidas(id_cliente).subscribe({
      next: (res) => this.totalNoLeidas = res.datos.total
    });
  }

  abrirNotificaciones() {
    const id_cliente = localStorage.getItem('cliente_id');
    if (!id_cliente) {
      this.mensajeRequiereLogin = 'Inicia sesión o crea una cuenta para ver tus notificaciones.';
      this.modoRequiereLogin = true;
      return;
    }

    this.notiSvc.listarPorCliente(id_cliente).subscribe({
      next: (res) => {
        this.notificaciones = res.datos;
        this.modoNotificaciones = true;
      }
    });
  }

  cerrarNotificaciones() {
    this.modoNotificaciones = false;
  }

  marcarTodasLeidas() {
    const id_cliente = localStorage.getItem('cliente_id');
    if (!id_cliente) return;

    this.notiSvc.marcarTodasLeidas(id_cliente).subscribe({
      next: () => {
        this.notificaciones.forEach(n => n.leida = 1);
        this.totalNoLeidas = 0;
      }
    });
  }

  abrirNotificacion(n: any) {
    if (!n.leida) {
      this.notiSvc.marcarLeida(n.id_notificacion).subscribe({
        next: () => {
          n.leida = 1;
          this.totalNoLeidas = Math.max(0, this.totalNoLeidas - 1);
        }
      });
    }
  }

  iconoNotificacion(tipo: string): string {
    const iconos: any = {
      pedido: 'bag-check-outline',
      envio:  'car-outline'
    };
    return iconos[tipo] || 'notifications-outline';
  }

  tiempoRelativo(fecha: string): string {
    const ahora = new Date();
    const f = new Date(fecha);
    const diffMs = ahora.getTime() - f.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);
    const diffDias = Math.floor(diffHoras / 24);

    if (diffMin < 1) return 'Ahora';
    if (diffMin < 60) return `Hace ${diffMin} min`;
    if (diffHoras < 24) return `Hace ${diffHoras} h`;
    return `Hace ${diffDias} d`;
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

    // No se saca al visitante de la tienda: se queda viendo el catálogo
    // como invitado, igual que si nunca hubiera iniciado sesión.
    this.modoCerrarSesion = false;
    this.nombre = 'Cliente';
    this.correo = '';
    this.favoritosIds = [];
    this.misFavoritos = [];
    this.misPedidos = [];
    this.notificaciones = [];
    this.totalNoLeidas = 0;
    this.seccion = 'inicio';
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
  trackByProducto(index: number, item: any): any {
  return item.clave || item.id_producto;
  } 
  
}