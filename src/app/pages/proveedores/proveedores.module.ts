import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ProveedoresPageRoutingModule } from './proveedores-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { ProveedoresPage } from './proveedores.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    ProveedoresPageRoutingModule
  ],
  declarations: [ProveedoresPage]
})
export class ProveedoresPageModule {}
