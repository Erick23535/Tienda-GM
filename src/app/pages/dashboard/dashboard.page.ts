import { Component, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReporteService } from '../../services/reporte';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false,
})
export class DashboardPage implements OnInit {
  nombre = '';
  rol    = '';
  saludo = '';
  fecha  = '';

  kpis: any = {
    ventas_hoy:     0,
    ingresos_hoy:   0,
    ingresos_mes:   0,
    stock_bajo:     0,
    total_clientes: 0
  };

  // Filtro de fechas para "Ingresos": por defecto el mes en curso; el
  // admin puede elegir un rango propio desde el panel.
  mostrarFiltroFechas = false;
  filtroDesde = '';
  filtroHasta = '';
  filtroActivo = false;

  constructor(private reporteSvc: ReporteService) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('nombre') || '';
    this.rol    = localStorage.getItem('rol')    || '';
    this.calcularSaludo();
    this.calcularFecha();
  }

  ionViewWillEnter() {
    this.cargarKpis();
  }

  calcularSaludo() {
    const hora = new Date().getHours();
    if (hora < 12)      this.saludo = 'Buenos días';
    else if (hora < 19)  this.saludo = 'Buenas tardes';
    else                 this.saludo = 'Buenas noches';
  }

  calcularFecha() {
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long', day: 'numeric', month: 'long'
    };
    this.fecha = new Date().toLocaleDateString('es-ES', opciones);
    this.fecha = this.fecha.charAt(0).toUpperCase() + this.fecha.slice(1);
  }

  cargarKpis() {
    this.reporteSvc.resumen(
      this.filtroActivo ? this.filtroDesde : undefined,
      this.filtroActivo ? this.filtroHasta : undefined
    ).subscribe({
      next: (res) => this.kpis = res.datos,
      error: () => {}
    });
  }

  alternarFiltroFechas() {
    this.mostrarFiltroFechas = !this.mostrarFiltroFechas;
  }

  aplicarFiltroFechas() {
    if (!this.filtroDesde || !this.filtroHasta) return;
    this.filtroActivo = true;
    this.mostrarFiltroFechas = false;
    this.cargarKpis();
  }

  limpiarFiltroFechas() {
    this.filtroDesde  = '';
    this.filtroHasta  = '';
    this.filtroActivo = false;
    this.mostrarFiltroFechas = false;
    this.cargarKpis();
  }

  imprimirIngresos() {
    this.reporteSvc.productosVendidos(
      this.filtroActivo ? this.filtroDesde : undefined,
      this.filtroActivo ? this.filtroHasta : undefined
    ).subscribe({
      next: (res) => this.generarReporteIngresosPDF(res.datos || []),
      error: () => this.generarReporteIngresosPDF([])
    });
  }

  private generarReporteIngresosPDF(productosVendidos: any[]) {
    const doc = new jsPDF();

    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('TIENDA GM', 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Reporte de ingresos', 14, 24);

    const periodoTexto = this.filtroActivo
      ? `${this.formatearFecha(this.filtroDesde)} — ${this.formatearFecha(this.filtroHasta)}`
      : `Mes en curso (${new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})`;

    doc.setFontSize(9);
    doc.text(`Periodo: ${periodoTexto}`, 14, 30);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 140, 30);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen del periodo', 14, 46);

    autoTable(doc, {
      startY: 52,
      head: [['Métrica', 'Valor']],
      body: [
        ['Ventas completadas', `${this.kpis.ventas_periodo ?? 0}`],
        ['Ingresos totales', `$${Number(this.kpis.ingresos_mes || 0).toFixed(2)}`],
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
      finalY += 14;
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

      finalY = (doc as any).lastAutoTable.finalY + 14;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Estado general (hoy)', 14, finalY);

    autoTable(doc, {
      startY: finalY + 6,
      head: [['Métrica', 'Valor']],
      body: [
        ['Ventas de hoy', `${this.kpis.ventas_hoy ?? 0}`],
        ['Ingresos de hoy', `$${Number(this.kpis.ingresos_hoy || 0).toFixed(2)}`],
        ['Productos con stock bajo', `${this.kpis.stock_bajo ?? 0}`],
        ['Clientes activos', `${this.kpis.total_clientes ?? 0}`],
      ],
      headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
      styles: { fontSize: 9 },
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Tienda GM - reporte generado desde el panel de administración', 14, 285);

    const sufijo = this.filtroActivo ? `${this.filtroDesde}_a_${this.filtroHasta}` : 'mes-actual';
    doc.save(`reporte-ingresos-${sufijo}-tienda-gm.pdf`);
  }

  private formatearFecha(iso: string): string {
    if (!iso) return '';
    const [anio, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${anio}`;
  }
}
