import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RegistroClientePageRoutingModule } from './registro-cliente-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { RegistroClientePage } from './registro-cliente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    RegistroClientePageRoutingModule
  ],
  declarations: [RegistroClientePage]
})
export class RegistroClientePageModule {}
