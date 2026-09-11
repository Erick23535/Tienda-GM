import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AdminHeaderComponent } from './admin-header/admin-header';
import { StatCardComponent } from './stat-card/stat-card';
import { ConfirmModalComponent } from './confirm-modal/confirm-modal';
import { SuccessToastComponent } from './success-toast/success-toast';
import { ProductCardComponent } from './product-card/product-card';
import { BottomNavComponent } from './bottom-nav/bottom-nav';
import { AppToastComponent } from './app-toast/app-toast';
import { ThemeToggleComponent } from './theme-toggle/theme-toggle';

// Componentes de UI reutilizados por cada módulo de página (cada página
// es su propio NgModule lazy-loaded, así que necesitan importar este
// módulo para poder usar <app-admin-header>, <app-product-card>, etc.)
@NgModule({
  declarations: [
    AdminHeaderComponent,
    StatCardComponent,
    ConfirmModalComponent,
    SuccessToastComponent,
    ProductCardComponent,
    BottomNavComponent,
    AppToastComponent,
    ThemeToggleComponent
  ],
  imports: [CommonModule, IonicModule],
  exports: [
    AdminHeaderComponent,
    StatCardComponent,
    ConfirmModalComponent,
    SuccessToastComponent,
    ProductCardComponent,
    BottomNavComponent,
    AppToastComponent,
    ThemeToggleComponent
  ]
})
export class SharedUiModule {}
