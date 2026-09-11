import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth-guard';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout';

const routes: Routes = [
  {
    // El catálogo es la puerta de entrada pública de la app; el login de
    // administración se accede directo por /login, no es el default.
    path: '',
    redirectTo: 'tienda',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'login-cliente',
    loadChildren: () => import('./pages/login-cliente/login-cliente.module').then(m => m.LoginClientePageModule)
  },
  {
    path: 'registro-cliente',
    loadChildren: () => import('./pages/registro-cliente/registro-cliente.module').then(m => m.RegistroClientePageModule)
  },
  {
    path: 'recuperar-contrasena',
    loadChildren: () => import('./pages/recuperar-contrasena/recuperar-contrasena.module').then(m => m.RecuperarContrasenaPageModule)
  },
  {
    path: 'nueva-contrasena',
    loadChildren: () => import('./pages/nueva-contrasena/nueva-contrasena.module').then(m => m.NuevaContrasenaPageModule)
  },
  {
    // Sin guard: el catálogo es público. Se pide iniciar sesión solo al
    // intentar comprar o marcar favoritos (ver TiendaPage).
    path: 'tienda',
    loadChildren: () => import('./pages/tienda/tienda.module').then( m => m.TiendaPageModule)
  },

  // Shell de administración: un único AuthGuard en el padre, sidebar
  // persistente en AdminLayoutComponent, y cada módulo admin como hijo
  // renderizado dentro del <ion-router-outlet> del shell.
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'categorias',
        loadChildren: () => import('./pages/categorias/categorias.module').then(m => m.CategoriasPageModule)
      },
      {
        path: 'proveedores',
        loadChildren: () => import('./pages/proveedores/proveedores.module').then(m => m.ProveedoresPageModule)
      },
      {
        path: 'productos',
        loadChildren: () => import('./pages/productos/productos.module').then(m => m.ProductosPageModule)
      },
      {
        path: 'compras',
        loadChildren: () => import('./pages/compras/compras.module').then(m => m.ComprasPageModule)
      },
      {
        path: 'ventas',
        loadChildren: () => import('./pages/ventas/ventas.module').then(m => m.VentasPageModule)
      },
      {
        path: 'clientes-admin',
        loadChildren: () => import('./pages/clientes-admin/clientes-admin.module').then(m => m.ClientesAdminPageModule)
      },
      {
        path: 'reportes',
        loadChildren: () => import('./pages/reportes/reportes.module').then(m => m.ReportesPageModule)
      },
      {
        path: 'perfil-admin',
        loadChildren: () => import('./pages/perfil-admin/perfil-admin.module').then(m => m.PerfilAdminPageModule)
      }
    ]
  }

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
