import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController } from '@ionic/angular';
import { AuthService } from '../../services/auth';
import { NotificacionService } from '../../services/notificacion';

interface ModuloNav {
  ruta: string;
  icono: string;
  etiqueta: string;
}

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.html',
  standalone: false,
})
export class AdminLayoutComponent implements OnInit {

  nombre = '';

  // Orden real de uso: primero se configura el catálogo (categorías,
  // proveedores, productos), luego se opera (compras, ventas, clientes),
  // y al final se analiza lo ya operado (reportes).
  modulos: ModuloNav[] = [
    { ruta: '/dashboard',      icono: 'home-outline',        etiqueta: 'Dashboard' },
    { ruta: '/categorias',     icono: 'pricetag-outline',    etiqueta: 'Categorías' },
    { ruta: '/proveedores',    icono: 'business-outline',    etiqueta: 'Proveedores' },
    { ruta: '/productos',      icono: 'shirt-outline',       etiqueta: 'Productos' },
    { ruta: '/compras',        icono: 'cube-outline',        etiqueta: 'Compras' },
    { ruta: '/ventas',         icono: 'cart-outline',        etiqueta: 'Ventas' },
    { ruta: '/clientes-admin', icono: 'people-outline',      etiqueta: 'Clientes' },
    { ruta: '/reportes',       icono: 'bar-chart-outline',   etiqueta: 'Reportes' },
  ];

  notificaciones: any[] = [];
  totalNoLeidas = 0;
  modoNotificaciones = false;

  // Colapsa el sidebar en pantallas anchas: apaga el split-pane (que si no,
  // lo mantiene siempre visible) y controla el menú a mano con MenuController.
  sidebarColapsado = false;

  constructor(
    private auth:   AuthService,
    private router: Router,
    private notiSvc: NotificacionService,
    private menuCtrl: MenuController
  ) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('nombre') || '';
    this.cargarContadorNotificaciones();
  }

  alternarSidebar() {
    this.sidebarColapsado = !this.sidebarColapsado;

    if (this.sidebarColapsado) {
      this.menuCtrl.close('admin-sidebar');
    } else {
      // El split-pane necesita un tick para reactivarse antes de que
      // el menú pueda abrirse de nuevo.
      setTimeout(() => this.menuCtrl.open('admin-sidebar'));
    }
  }

  cargarContadorNotificaciones() {
    this.notiSvc.contarNoLeidasAdmin().subscribe({
      next: (res) => this.totalNoLeidas = res.datos.total
    });
  }

  abrirNotificaciones() {
    this.notiSvc.listarAdmin().subscribe({
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
    this.notiSvc.marcarTodasLeidasAdmin().subscribe({
      next: () => {
        this.notificaciones.forEach(n => n.leida = 1);
        this.totalNoLeidas = 0;
      }
    });
  }

  abrirNotificacion(n: any) {
    if (!n.leida) {
      this.notiSvc.marcarLeidaAdmin(n.id_notificacion).subscribe({
        next: () => {
          n.leida = 1;
          this.totalNoLeidas = Math.max(0, this.totalNoLeidas - 1);
        }
      });
    }
    this.modoNotificaciones = false;

    if (n.tipo === 'stock_bajo') {
      this.router.navigate(['/reportes']);
    } else {
      this.router.navigate(['/ventas'], { queryParams: { seccion: 'historial' } });
    }
  }

  iconoNotificacion(tipo: string): string {
    const iconos: any = {
      pedido:       'bag-check-outline',
      confirmacion: 'checkmark-done-outline',
      stock_bajo:   'warning-outline'
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

  irAPerfil() {
    this.router.navigate(['/perfil-admin']);
  }

  cerrarSesion() {
    this.auth.logout().subscribe({
      next:  () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login'])
    });
  }
}
