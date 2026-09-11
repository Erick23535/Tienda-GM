import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompraService } from '../../services/compra';
import { ProductoService } from '../../services/producto';
import { AuthService } from '../../services/auth';

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
  ordenCompras = 'fecha-desc';
  compraDetalle: any = null;

  get comprasOrdenadas() {
    const lista = [...this.compras];
    switch (this.ordenCompras) {
      case 'fecha-asc':  lista.sort((a, b) => new Date(a.fecha_compra).getTime() - new Date(b.fecha_compra).getTime()); break;
      case 'total-desc': lista.sort((a, b) => Number(b.total) - Number(a.total)); break;
      case 'total-asc':  lista.sort((a, b) => Number(a.total) - Number(b.total)); break;
      default:           lista.sort((a, b) => new Date(b.fecha_compra).getTime() - new Date(a.fecha_compra).getTime());
    }
    return lista;
  }
  modoConfirmarCompra = false;

  // Notificaciones nuevas
  notiCarrito: any = null;
  modoAvisoProveedor = false;
  modoExito = false;
  mensajeExito = '';
  ultimaCompraId: number | null = null;
  ultimaCompraTotal = 0;

  modoConfirmarAnular = false;
  compraAAnular: any = null;

  // Selector de talla (productos con variantes)
  modoSeleccionTalla = false;
  productoParaTalla: any = null;

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private compraSvc:   CompraService,
    private productoSvc: ProductoService,
    private loading:     LoadingController,
    private authSvc:      AuthService
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
    const usaTallas = producto.tallas && producto.tallas.length > 0;

    if (usaTallas) {
      this.productoParaTalla = producto;
      this.modoSeleccionTalla = true;
      return;
    }

    this.agregarAlCarritoFinal(producto, null, null);
  }

  seleccionarTallaCompra(t: any) {
    this.agregarAlCarritoFinal(this.productoParaTalla, t.id_talla, t.talla);
    this.modoSeleccionTalla = false;
    this.productoParaTalla = null;
  }

  cerrarSelectorTalla() {
    this.modoSeleccionTalla = false;
    this.productoParaTalla = null;
  }

  agregarAlCarritoFinal(producto: any, idTalla: number | null, tallaTexto: string | null) {
    const claveUnica = idTalla ? `${producto.id_producto}-${idTalla}` : `${producto.id_producto}`;
    const existe = this.carrito.find(i => i.clave === claveUnica);

    if (existe) {
      existe.cantidad++;
      existe.subtotal = existe.cantidad * existe.precio_unitario;
      this.mostrarNotiCarrito(producto, existe.cantidad);
    } else {
      const precio = Number(producto.precio_compra) || 0;
      this.carrito.push({
        clave:           claveUnica,
        id_producto:     producto.id_producto,
        id_talla:        idTalla,
        nombre:          producto.nombre,
        codigo:          producto.codigo,
        talla:           tallaTexto || producto.talla,
        imagen_url:      producto.imagen_url,
        precio_unitario: precio,
        cantidad:        1,
        subtotal:        precio
      });
      this.mostrarNotiCarrito(producto, 1);
    }
  }

  mostrarNotiCarrito(producto: any, cantidad: number) {
    this.notiCarrito = { ...producto, cantidadEnCarrito: cantidad };
    setTimeout(() => this.notiCarrito = null, 2200);
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

  registrarCompra() {
    if (!this.id_proveedor_sel) {
      this.modoAvisoProveedor = true;
      setTimeout(() => this.modoAvisoProveedor = false, 2200);
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

    this.modoConfirmarCompra = true;
  }

  cerrarConfirmarCompra() {
    this.modoConfirmarCompra = false;
  }

  async procesarCompra() {
    this.modoConfirmarCompra = false;
    const loader = await this.loading.create({ message: 'Registrando compra...' });
    await loader.present();

    const payload = {
  id_proveedor: this.id_proveedor_sel,
  id_usuario:   this.authSvc.getIdUsuario(),
  detalle: this.carrito.map(i => ({
    id_producto:     i.id_producto,
    id_talla:        i.id_talla || null,
    cantidad:        i.cantidad,
    precio_unitario: i.precio_unitario
      }))
    };

    this.compraSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.ultimaCompraId    = res.datos.id_compra;
        this.ultimaCompraTotal = res.datos.total;
        this.mensajeExito      = `Compra #${res.datos.id_compra} registrada`;
        this.modoExito = true;
        this.carrito          = [];
        this.id_proveedor_sel = '';
        this.cargarProductos();
        setTimeout(() => this.modoExito = false, 2800);
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

  verFacturaCompra(compra: any) {
    this.compraSvc.obtener(compra.id_compra).subscribe({
      next: (res) => {
        const c = res.datos;
        const detalle = c.detalle.map((d: any) => ({
          nombre: d.nombre,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal
        }));
        this.generarFacturaCompraPDF(c, detalle);
      },
      error: () => this.mostrarToast('Error al cargar la factura.', 'danger')
    });
  }

  generarFacturaCompraPDF(compra: any, detalle: any[]) {
    const doc = new jsPDF();

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TIENDA GM', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Factura de compra', 14, 24);
    doc.setFontSize(9);
    doc.text(`N.° ${compra.id_compra.toString().padStart(6, '0')}`, 14, 30);

    const fecha = new Date(compra.fecha_compra).toLocaleString('es-ES');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha}`, 150, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Proveedor', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nombre: ${compra.proveedor || '-'}`, 14, 50);
    doc.text(`Registrado por: ${compra.usuario || '-'}`, 14, 55);

    const filas = detalle.map(d => [
      d.nombre,
      `${d.cantidad}`,
      `$${Number(d.precio_unitario).toFixed(2)}`,
      `$${Number(d.subtotal).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 64,
      head: [['Producto', 'Cant.', 'P. Unitario', 'Subtotal']],
      body: filas,
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: $${Number(compra.total).toFixed(2)}`, 150, finalY);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Tienda GM - comprobante interno de compra a proveedor', 14, 285);

    doc.save(`factura-compra-${compra.id_compra}-tienda-gm.pdf`);
  }

  confirmarAnular(compra: any) {
    this.compraAAnular = compra;
    this.modoConfirmarAnular = true;
  }

  cancelarAnular() {
    this.modoConfirmarAnular = false;
    this.compraAAnular = null;
  }

  anularConfirmado() {
    const compra = this.compraAAnular;
    this.modoConfirmarAnular = false;
    this.compraSvc.anular(compra.id_compra).subscribe({
      next: () => {
        this.mostrarToast('Compra anulada y stock revertido.', 'success');
        this.compraDetalle = null;
        this.cargarCompras();
      },
      error: (err) => this.mostrarToast(err.error?.mensaje || 'Error.', 'danger')
    });
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
}