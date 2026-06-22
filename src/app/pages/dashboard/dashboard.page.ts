import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
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

  kpis: any = {
    ventas_hoy:     0,
    ingresos_hoy:   0,
    ingresos_mes:   0,
    stock_bajo:     0,
    total_clientes: 0
  };

  constructor(
    private auth:       AuthService,
    private router:     Router,
    private reporteSvc: ReporteService
  ) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('nombre') || '';
    this.rol    = localStorage.getItem('rol')    || '';
    this.cargarKpis();
  }

  cargarKpis() {
    this.reporteSvc.resumen().subscribe({
      next: (res) => this.kpis = res.datos,
      error: () => {}
    });
  }

  irA(ruta: string) {
    this.router.navigate([ruta]);
  }

  cerrarSesion() {
    this.auth.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}