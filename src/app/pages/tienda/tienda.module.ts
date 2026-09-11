import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { TiendaPageRoutingModule } from './tienda-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';
import { TiendaPage } from './tienda.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    SharedUiModule,
    TiendaPageRoutingModule
  ],
  declarations: [TiendaPage]
})
export class TiendaPageModule {}