import { Component, OnInit } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
import { ReporteService } from '../../services/reporte';

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

  async mostrarToast(mensaje: string, color: string) {
    const t = await this.toast.create({ message: mensaje, duration: 3000, color });
    t.present();
  }
}