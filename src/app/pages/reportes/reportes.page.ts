import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { ReporteService } from '../../services/reporte';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-reportes',
  templateUrl: './reportes.page.html',
  styleUrls: ['./reportes.page.scss'],
  standalone: false
})
export class ReportesPage implements OnInit {

  seccion     = 'resumen';
  resumen: any      = {};
  ventasDia: any[]  = [];
  stockBajo: any[]  = [];
  masVendidos: any[] = [];
  proveedoresTop: any[] = [];

  toastAbierto = false;
  mensajeToast = '';
  tipoToast: 'success' | 'danger' | 'warning' = 'danger';

  // Filtro de fechas para el resumen general (mismo patrón que el dashboard).
  mostrarFiltroFechas = false;
  filtroDesde = '';
  filtroHasta = '';
  filtroActivo = false;
  productosVendidos: any[] = [];

  constructor(
    private reporteSvc: ReporteService,
    private loading:    LoadingController
  ) {}

  ngOnInit() {
    this.cargarResumen();
  }

  get totalDia(): number {
    return this.ventasDia.reduce((acc, v) => acc + +v.total, 0);
  }

  get maxVendido(): number {
  if (this.masVendidos.length === 0) return 1;
  return Math.max(...this.masVendidos.map(p => Number(p.total_vendido)));
 }

  cambiarSeccion(sec: string) {
    this.seccion = sec;
    if (sec === 'resumen')      this.cargarResumen();
    if (sec === 'ventas-dia')   this.cargarVentasDia();
    if (sec === 'stock-bajo')   this.cargarStockBajo();
    if (sec === 'mas-vendidos') this.cargarMasVendidos();
    if (sec === 'proveedores')  this.cargarProveedoresTop();
  }

  async cargarResumen() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.resumen(
      this.filtroActivo ? this.filtroDesde : undefined,
      this.filtroActivo ? this.filtroHasta : undefined
    ).subscribe({
      next: (res) => { this.resumen = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  alternarFiltroFechas() {
    this.mostrarFiltroFechas = !this.mostrarFiltroFechas;
  }

  aplicarFiltroFechas() {
    if (!this.filtroDesde || !this.filtroHasta) return;
    this.filtroActivo = true;
    this.mostrarFiltroFechas = false;
    this.cargarResumen();
  }

  limpiarFiltroFechas() {
    this.filtroDesde  = '';
    this.filtroHasta  = '';
    this.filtroActivo = false;
    this.mostrarFiltroFechas = false;
    this.cargarResumen();
  }

  async cargarVentasDia() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.ventasDelDia().subscribe({
      next: (res) => { this.ventasDia = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  async cargarStockBajo() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.stockBajo().subscribe({
      next: (res) => { this.stockBajo = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  async cargarMasVendidos() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.masVendidos().subscribe({
      next: (res) => { this.masVendidos = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  async cargarProveedoresTop() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.proveedoresTop().subscribe({
      next: (res) => { this.proveedoresTop = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
  }

  // ============ EXPORTAR A PDF ============

  private encabezadoPDF(doc: jsPDF, titulo: string) {
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('TIENDA GM', 14, 15);
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(titulo, 14, 23);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const fecha = new Date().toLocaleString('es-ES');
    doc.text(`Generado: ${fecha}`, 14, 37);
  }

  async exportarResumenPDF() {
    const loader = await this.loading.create({ message: 'Generando PDF...' });
    await loader.present();

    this.reporteSvc.productosVendidos(
      this.filtroActivo ? this.filtroDesde : undefined,
      this.filtroActivo ? this.filtroHasta : undefined
    ).subscribe({
      next: (res) => { loader.dismiss(); this.generarResumenPDF(res.datos || []); },
      error: () => { loader.dismiss(); this.generarResumenPDF([]); }
    });
  }

  private generarResumenPDF(productosVendidos: any[]) {
    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Resumen General');

    const periodoTexto = this.filtroActivo
      ? `${this.formatearFecha(this.filtroDesde)} — ${this.formatearFecha(this.filtroHasta)}`
      : `Mes en curso (${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`;

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Periodo de ingresos: ${periodoTexto}`, 14, 43);

    autoTable(doc, {
      startY: 48,
      head: [['Indicador', 'Valor']],
      body: [
        ['Ventas hoy', `${this.resumen.ventas_hoy || 0}`],
        ['Ingresos hoy', `$${this.resumen.ingresos_hoy || 0}`],
        [this.filtroActivo ? 'Ingresos del periodo' : 'Ingresos del mes', `$${Number(this.resumen.ingresos_mes || 0).toFixed(2)}`],
        ['Ventas del periodo', `${this.resumen.ventas_periodo || 0}`],
        ['Productos con stock bajo', `${this.resumen.stock_bajo || 0}`],
        ['Clientes registrados', `${this.resumen.total_clientes || 0}`],
      ],
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 10 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Productos vendidos en el periodo', 14, finalY);

    if (productosVendidos.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('No se vendieron productos en este periodo.', 14, finalY + 8);
    } else {
      const filasProductos = productosVendidos.map(p => [
        p.nombre,
        p.codigo || '-',
        p.talla || '-',
        p.color || '-',
        `${p.cantidad_vendida}`,
        `$${Number(p.ingresos).toFixed(2)}`
      ]);

      autoTable(doc, {
        startY: finalY + 6,
        head: [['Producto', 'Código', 'Talla', 'Color', 'Cant.', 'Ingresos']],
        body: filasProductos,
        headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
        styles: { fontSize: 8 },
        columnStyles: { 0: { cellWidth: 60 } },
      });
    }

    const sufijo = this.filtroActivo ? `${this.filtroDesde}_a_${this.filtroHasta}` : this.fechaArchivo();
    doc.save(`resumen-tienda-gm-${sufijo}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
  }

  private formatearFecha(iso: string): string {
    if (!iso) return '';
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }

  async exportarVentasDiaPDF() {
    if (this.ventasDia.length === 0) {
      this.mostrarToast('No hay ventas para exportar.', 'warning');
      return;
    }

    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Ventas del Día');

    const filas = this.ventasDia.map(v => [
      `#${v.id_venta}`,
      v.cliente || 'Sin cliente',
      v.vendedor,
      v.metodo_pago,
      v.estado,
      `$${v.total}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Venta', 'Cliente', 'Vendedor', 'Pago', 'Estado', 'Total']],
      body: filas,
      foot: [['', '', '', '', 'TOTAL', `$${this.totalDia.toFixed(2)}`]],
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
      styles: { fontSize: 9 },
    });

    doc.save(`ventas-dia-tienda-gm-${this.fechaArchivo()}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
  }

  async exportarStockBajoPDF() {
    if (this.stockBajo.length === 0) {
      this.mostrarToast('No hay productos con stock bajo.', 'warning');
      return;
    }

    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Stock Bajo');

    const filas = this.stockBajo.map(p => [
      p.codigo,
      p.nombre,
      p.categoria,
      p.talla || '-',
      `${p.stock_actual}`,
      `${p.stock_minimo}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Código', 'Producto', 'Categoría', 'Talla', 'Stock actual', 'Stock mínimo']],
      body: filas,
      headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    doc.save(`stock-bajo-tienda-gm-${this.fechaArchivo()}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
  }

  async exportarMasVendidosPDF() {
    if (this.masVendidos.length === 0) {
      this.mostrarToast('No hay datos de ventas para exportar.', 'warning');
      return;
    }

    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Productos Más Vendidos');

    const filas = this.masVendidos.map((p, i) => [
      `#${i + 1}`,
      p.codigo,
      p.nombre,
      p.talla || '-',
      `${p.total_vendido}`,
      `$${p.total_ingresos}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Puesto', 'Código', 'Producto', 'Talla', 'Unidades vendidas', 'Ingresos']],
      body: filas,
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 9 },
    });

    doc.save(`mas-vendidos-tienda-gm-${this.fechaArchivo()}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
  }

  async exportarProveedoresTopPDF() {
    if (this.proveedoresTop.length === 0) {
      this.mostrarToast('No hay datos de proveedores para exportar.', 'warning');
      return;
    }

    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Proveedores Principales');

    const filas = this.proveedoresTop.map((p, i) => [
      `#${i + 1}`,
      p.nombre,
      p.ruc || '-',
      `${p.total_compras}`,
      `$${p.total_invertido}`
    ]);

    autoTable(doc, {
      startY: 44,
      head: [['Puesto', 'Proveedor', 'RUC', 'Compras', 'Total invertido']],
      body: filas,
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 9 },
    });

    doc.save(`proveedores-top-tienda-gm-${this.fechaArchivo()}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
  }

  private fechaArchivo(): string {
    const d = new Date();
    return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}`;
  }

  mostrarToast(mensaje: string, tipo: 'success' | 'danger' | 'warning' = 'danger') {
    this.mensajeToast = mensaje;
    this.tipoToast = tipo;
    this.toastAbierto = true;
    setTimeout(() => this.toastAbierto = false, 2800);
  }
}