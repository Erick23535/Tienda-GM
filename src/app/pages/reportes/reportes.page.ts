import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
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

  constructor(
    private reporteSvc: ReporteService,
    private loading:    LoadingController,
    private toast:      ToastController
  ) {}

  ngOnInit() {
    this.cargarResumen();
  }

  get totalDia(): number {
    return this.ventasDia.reduce((acc, v) => acc + +v.total, 0);
  }

  cambiarSeccion(sec: string) {
    this.seccion = sec;
    if (sec === 'resumen')      this.cargarResumen();
    if (sec === 'ventas-dia')   this.cargarVentasDia();
    if (sec === 'stock-bajo')   this.cargarStockBajo();
    if (sec === 'mas-vendidos') this.cargarMasVendidos();
  }

  async cargarResumen() {
    const loader = await this.loading.create({ message: 'Cargando...' });
    await loader.present();
    this.reporteSvc.resumen().subscribe({
      next: (res) => { this.resumen = res.datos; loader.dismiss(); },
      error: () => { loader.dismiss(); this.mostrarToast('Error al cargar.', 'danger'); }
    });
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
    const doc = new jsPDF();
    this.encabezadoPDF(doc, 'Reporte de Resumen General');

    autoTable(doc, {
      startY: 44,
      head: [['Indicador', 'Valor']],
      body: [
        ['Ventas hoy', `${this.resumen.ventas_hoy || 0}`],
        ['Ingresos hoy', `$${this.resumen.ingresos_hoy || 0}`],
        ['Ingresos del mes', `$${this.resumen.ingresos_mes || 0}`],
        ['Productos con stock bajo', `${this.resumen.stock_bajo || 0}`],
        ['Clientes registrados', `${this.resumen.total_clientes || 0}`],
      ],
      headStyles: { fillColor: [212, 175, 55], textColor: [10, 10, 10] },
      styles: { fontSize: 10 },
    });

    doc.save(`resumen-tienda-gm-${this.fechaArchivo()}.pdf`);
    this.mostrarToast('PDF descargado correctamente.', 'success');
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

  private fechaArchivo(): string {
    const d = new Date();
    return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}`;
  }

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}