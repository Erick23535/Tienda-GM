import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
import { ProductoService } from '../../services/producto';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: false
})
export class TiendaPage implements OnInit {

  nombre   = '';
  seccion  = 'inicio';

  productos:   any[] = [];
  busqueda   = '';
  categoriaSeleccionada = 'todas';
  categorias: string[] = [];

  carrito: any[] = [];

  // Modal producto
  productoVista: any = null;

  constructor(
    private router:      Router,
    private productoSvc: ProductoService,
    private alert:       AlertController,
    private loading:     LoadingController,
    private toast:       ToastController
  ) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('cliente_nombre') || 'Cliente';
    this.cargarProductos();
  }

  async cargarProductos() {
    this.productoSvc.listar().subscribe({
      next: (res) => {
        this.productos = res.datos.filter((p: any) =>
          p.stock_actual > 0 && p.estado === 'activo'
        );
        const cats = [...new Set(this.productos.map((p: any) => p.categoria))];
        this.categorias = cats.filter(c => c) as string[];
      }
    });
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

  // Abrir modal del producto
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

  async confirmarPedido() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Tu carrito está vacío.', 'warning');
      return;
    }
    const alerta = await this.alert.create({
      header:  'Confirmar pedido',
      message: `Total: $${this.totalCarrito.toFixed(2)}\n\nTu pedido será procesado por la tienda.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          handler: () => {
            this.carrito = [];
            this.seccion = 'inicio';
            this.mostrarToast('¡Pedido enviado! Te contactaremos pronto.', 'success');
          }
        }
      ]
    });
    await alerta.present();
  }

  irACatalogo() {
    this.seccion = 'catalogo';
  }

  cerrarSesion() {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('cliente_nombre');
    this.router.navigate(['/login-cliente']);
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 2500, color });
    t.present();
  }
}