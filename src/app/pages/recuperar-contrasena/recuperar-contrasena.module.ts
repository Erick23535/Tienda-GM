import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { RecuperarContrasenaPageRoutingModule } from './recuperar-contrasena-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { RecuperarContrasenaPage } from './recuperar-contrasena.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    RecuperarContrasenaPageRoutingModule
  ],
  declarations: [RecuperarContrasenaPage]
})
export class RecuperarContrasenaPageModule {}
