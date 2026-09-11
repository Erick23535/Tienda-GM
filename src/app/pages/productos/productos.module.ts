import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProductosPageRoutingModule } from './productos-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { ProductosPage } from './productos.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    ProductosPageRoutingModule
  ],
  declarations: [ProductosPage]
})
export class ProductosPageModule {}
