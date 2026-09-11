import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { ActivatedRoute } from '@angular/router';
import { VentaService } from '../../services/venta';
import { ProductoService } from '../../services/producto';
import { ClienteAdminService } from '../../services/cliente-admin';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthService } from '../../services/auth';

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
  ordenVentas = 'fecha-desc';

  get ventasOrdenadas() {
    const lista = [...this.ventas];
    switch (this.ordenVentas) {
      case 'fecha-asc':  lista.sort((a, b) => new Date(a.fecha_venta).getTime() - new Date(b.fecha_venta).getTime()); break;
      case 'total-desc': lista.sort((a, b) => Number(b.total) - Number(a.total)); break;
      case 'total-asc':  lista.sort((a, b) => Number(a.total) - Number(b.total)); break;
      default:           lista.sort((a, b) => new Date(b.fecha_venta).getTime() - new Date(a.fecha_venta).getTime());
    }
    return lista;
  }

  modoConfirmarVenta = false;
  modoExito = false;
  mensajeExito = '';
  ultimaVentaTotal = 0;

  modoSeleccionTalla = false;
  productoParaTalla: any = null;

  modoExitoEnvio = false;
  mensajeExitoEnvio = '';

  modoCliente: 'manual' | 'registrado' = 'manual';
  clienteManual = { nombre: '', cedula: '', telefono: '', direccion: '' };
  clientesRegistrados: any[] = [];
  id_cliente_sel = '';
  modoSeleccionCliente = false;
  busquedaCliente = '';

  modoSeleccionPago = false;
  metodosPago = [
    { valor: 'efectivo', nombre: 'Efectivo', icono: 'cash-outline', color: '#22c55e' },
    { valor: 'tarjeta', nombre: 'Tarjeta', icono: 'card-outline', color: '#38bdf8' },
    { valor: 'transferencia', nombre: 'Transferencia', icono: 'swap-horizontal-outline', color: '#a78bfa' }
  ];

  modoFactura = false;
  detalleFactura: any[] = [];
  datosFacturaVenta: any = null;

  modoConfirmarAnular = false;
  ventaAAnular: any = null;

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  constructor(
    private ventaSvc:    VentaService,
    private productoSvc: ProductoService,
    private clienteAdminSvc: ClienteAdminService,
    private loading:     LoadingController,
    private cdr:          ChangeDetectorRef,
    private route:        ActivatedRoute,
    private authSvc:      AuthService
  ) {}

  ngOnInit() {
    this.cargarProductos();
    this.cargarClientesRegistrados();

    this.route.queryParams.subscribe(params => {
      if (params['seccion'] === 'historial') {
        this.cambiarSeccion('historial');
      }
    });
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

  cargarClientesRegistrados() {
    this.clienteAdminSvc.listar('').subscribe({
      next: (res) => this.clientesRegistrados = res.datos,
      error: () => {}
    });
  }

  get clientesFiltrados() {
    if (!this.busquedaCliente) return this.clientesRegistrados;
    const b = this.busquedaCliente.toLowerCase();
    return this.clientesRegistrados.filter(c =>
      `${c.nombres} ${c.apellidos}`.toLowerCase().includes(b) ||
      (c.correo && c.correo.toLowerCase().includes(b))
    );
  }

  get clienteSeleccionadoNombre(): string {
    const c = this.clientesRegistrados.find(c => c.id_cliente === this.id_cliente_sel);
    return c ? `${c.nombres} ${c.apellidos}` : '';
  }

  abrirSelectorCliente() {
    this.modoSeleccionCliente = true;
    this.busquedaCliente = '';
  }

  cerrarSelectorCliente() {
    this.modoSeleccionCliente = false;
  }

  seleccionarCliente(c: any) {
    this.id_cliente_sel = c.id_cliente;
    this.cerrarSelectorCliente();
  }

  abrirSelectorPago() {
    this.modoSeleccionPago = true;
  }

  cerrarSelectorPago() {
    this.modoSeleccionPago = false;
  }

  seleccionarMetodoPago(valor: string) {
    this.metodo_pago = valor;
    this.cerrarSelectorPago();
  }

  get metodoPagoActual() {
    return this.metodosPago.find(m => m.valor === this.metodo_pago) || this.metodosPago[0];
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
  const usaTallas = producto.tallas && producto.tallas.length > 0;

  if (usaTallas) {
    this.productoParaTalla = producto;
    this.modoSeleccionTalla = true;
    return;
  }

  this.agregarAlCarritoFinal(producto, null, null);
}

seleccionarTallaVenta(talla: any) {
  if (talla.stock_actual <= 0) return;
  this.agregarAlCarritoFinal(this.productoParaTalla, talla.id_talla, talla.talla, talla.stock_actual);
  this.modoSeleccionTalla = false;
  this.productoParaTalla = null;
}

cerrarSelectorTalla() {
  this.modoSeleccionTalla = false;
  this.productoParaTalla = null;
}

agregarAlCarritoFinal(producto: any, idTalla: number | null, tallaTexto: string | null, stockTalla?: number) {
  const precioUnitario = Number(producto.precio_venta) || 0;
  const stockDisponible = idTalla ? (stockTalla ?? 0) : producto.stock_actual;
  const claveUnica = idTalla ? `${producto.id_producto}-${idTalla}` : `${producto.id_producto}`;

  const existe = this.carrito.find(i => i.clave === claveUnica);
  if (existe) {
    if (existe.cantidad < stockDisponible) {
      existe.cantidad++;
      existe.subtotal = existe.cantidad * precioUnitario;
      existe.precio_unitario = precioUnitario;
    } else {
      this.mostrarToast('Stock máximo alcanzado.', 'warning');
    }
  } else {
    this.carrito = [...this.carrito, {
      clave:           claveUnica,
      id_producto:     producto.id_producto,
      id_talla:        idTalla,
      nombre:          producto.nombre,
      talla:           tallaTexto || producto.talla,
      color:           producto.color,
      imagen_url:      producto.imagen_url,
      precio_unitario: precioUnitario,
      cantidad:        1,
      subtotal:        precioUnitario,
      stock_max:       stockDisponible
    }];
  }
  this.cdr.detectChanges();
}

  quitarDelCarrito(index: number) {
    this.carrito.splice(index, 1);
    this.cdr.detectChanges();
  }

  cambiarCantidad(item: any, delta: number) {
    const nueva = item.cantidad + delta;
    if (nueva < 1) {
      this.carrito = this.carrito.filter(i => i !== item);
      this.cdr.detectChanges();
      return;
    }
    if (nueva > item.stock_max) {
      this.mostrarToast('Stock máximo alcanzado.', 'warning');
      return;
    }
    item.cantidad = nueva;
    item.subtotal = nueva * item.precio_unitario;
    this.cdr.detectChanges();
  }

  get subtotal() {
    return this.carrito.reduce((acc, i) => acc + i.subtotal, 0);
  }

  get total() {
    const t = this.subtotal - this.descuento;
    return t < 0 ? 0 : t;
  }

  registrarVenta() {
    if (this.carrito.length === 0) {
      this.mostrarToast('Agrega productos al carrito.', 'warning');
      return;
    }
    this.modoConfirmarVenta = true;
  }

  cerrarConfirmarVenta() {
    this.modoConfirmarVenta = false;
  }

  trackByProducto(index: number, item: any): any {
  return item.clave || item.id_producto;
  }

  async procesarVenta() {
    this.modoConfirmarVenta = false;
    const loader = await this.loading.create({ message: 'Registrando venta...' });
    await loader.present();

    const id_usuario = this.authSvc.getIdUsuario();

    const payload: any = {
      id_usuario,
      id_cliente:    this.modoCliente === 'registrado' ? this.id_cliente_sel : null,
      metodo_pago:   this.metodo_pago,
      descuento:     this.descuento,
      observaciones: this.observaciones,
      detalle: this.carrito.map(i => ({
      id_producto: i.id_producto,
      id_talla:    i.id_talla || null,
      cantidad:    i.cantidad
      }))
    };

    if (this.modoCliente === 'manual') {
      payload.cliente_nombre    = this.clienteManual.nombre || null;
      payload.cliente_cedula    = this.clienteManual.cedula || null;
      payload.cliente_telefono  = this.clienteManual.telefono || null;
      payload.cliente_direccion = this.clienteManual.direccion || null;
    }

    const carritoSnapshot = [...this.carrito];
    const nombreClienteFactura = this.modoCliente === 'registrado'
      ? this.clienteSeleccionadoNombre
      : (this.clienteManual.nombre || 'Cliente de mostrador');

    this.ventaSvc.crear(payload).subscribe({
      next: async (res) => {
        await loader.dismiss();
        this.mensajeExito     = `Venta #${res.datos.id_venta} registrada`;
        this.ultimaVentaTotal = res.datos.total;
        this.modoExito = true;

        this.datosFacturaVenta = {
          id_venta: res.datos.id_venta,
          fecha: new Date(),
          total: res.datos.total,
          subtotal: this.subtotal,
          descuento: this.descuento,
          metodo_pago: this.metodo_pago,
          cliente_nombre: nombreClienteFactura,
          cliente_cedula: this.modoCliente === 'manual' ? this.clienteManual.cedula : '',
          cliente_telefono: this.modoCliente === 'manual' ? this.clienteManual.telefono : '',
          cliente_direccion: this.modoCliente === 'manual' ? this.clienteManual.direccion : ''
        };
        this.detalleFactura = carritoSnapshot;

        this.carrito       = [];
        this.descuento     = 0;
        this.observaciones = '';
        this.modoCliente = 'manual';
        this.clienteManual = { nombre: '', cedula: '', telefono: '', direccion: '' };
        this.id_cliente_sel = '';
        this.metodo_pago = 'efectivo';
        this.cargarProductos();

        setTimeout(() => this.modoExito = false, 4000);
      },
      error: async (err) => {
        await loader.dismiss();
        this.mostrarToast(err.error?.mensaje || 'Error al registrar.', 'danger');
      }
    });
  }

  descargarFacturaActual() {
    if (!this.datosFacturaVenta) return;
    this.generarFacturaPDF(this.datosFacturaVenta, this.detalleFactura);
  }

  verFacturaHistorial(venta: any) {
    this.ventaSvc.obtener(venta.id_venta).subscribe({
      next: (res) => {
        const v = res.datos;
        const datos = {
          id_venta: v.id_venta,
          fecha: v.fecha_venta,
          total: v.total,
          subtotal: v.subtotal,
          descuento: v.descuento,
          metodo_pago: v.metodo_pago,
          cliente_nombre: v.cliente_registrado || v.cliente_nombre || 'Cliente de mostrador',
          cliente_cedula: v.cliente_cedula || '',
          cliente_telefono: v.cliente_telefono || v.telefono_contacto || '',
          cliente_direccion: v.cliente_direccion || v.direccion_envio || ''
        };
        const detalle = v.detalle.map((d: any) => ({
          nombre: d.nombre,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          subtotal: d.subtotal
        }));
        this.generarFacturaPDF(datos, detalle);
      },
      error: () => this.mostrarToast('Error al cargar la factura.', 'danger')
    });
  }

  generarFacturaPDF(venta: any, detalle: any[]) {
    const doc = new jsPDF();

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TIENDA GM', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Factura de venta', 14, 24);
    doc.setFontSize(9);
    doc.text(`N.° ${venta.id_venta.toString().padStart(6, '0')}`, 14, 30);

    const fecha = new Date(venta.fecha).toLocaleString('es-ES');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha}`, 150, 30);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 14, 44);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Nombre: ${venta.cliente_nombre || 'Cliente de mostrador'}`, 14, 50);
    if (venta.cliente_cedula)    doc.text(`Cédula/RUC: ${venta.cliente_cedula}`, 14, 55);
    if (venta.cliente_telefono)  doc.text(`Teléfono: ${venta.cliente_telefono}`, 110, 50);
    if (venta.cliente_direccion) doc.text(`Dirección: ${venta.cliente_direccion}`, 14, 60);

    const filas = detalle.map(d => [
      d.nombre,
      `${d.cantidad}`,
      `$${Number(d.precio_unitario).toFixed(2)}`,
      `$${Number(d.subtotal).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: 68,
      head: [['Producto', 'Cant.', 'P. Unitario', 'Subtotal']],
      body: filas,
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 9 },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 8;

    doc.setFontSize(10);
    doc.text(`Subtotal: $${Number(venta.subtotal).toFixed(2)}`, 150, finalY);
    doc.text(`Descuento: -$${Number(venta.descuento || 0).toFixed(2)}`, 150, finalY + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: $${Number(venta.total).toFixed(2)}`, 150, finalY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Método de pago: ${venta.metodo_pago}`, 14, finalY + 14);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Gracias por tu compra en Tienda GM', 14, 285);

    doc.save(`factura-${venta.id_venta}-tienda-gm.pdf`);
  }

  confirmarAnular(venta: any) {
    this.ventaAAnular = venta;
    this.modoConfirmarAnular = true;
  }

  cancelarAnular() {
    this.modoConfirmarAnular = false;
    this.ventaAAnular = null;
  }

  anularConfirmada() {
    const venta = this.ventaAAnular;
    this.modoConfirmarAnular = false;
    this.anularVenta(venta.id_venta);
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
        this.mensajeExitoEnvio = nuevoEstado === 'despachado'
          ? `Pedido #${venta.id_venta} despachado`
          : `Pedido #${venta.id_venta} entregado`;
        this.modoExitoEnvio = true;
        setTimeout(() => this.modoExitoEnvio = false, 2200);
      },
      error: (err) => this.mostrarToast(err.error?.mensaje || 'Error.', 'danger')
    });
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 3200);
  }
}