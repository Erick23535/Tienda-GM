import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { PerfilAdminPageRoutingModule } from './perfil-admin-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { PerfilAdminPage } from './perfil-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    PerfilAdminPageRoutingModule
  ],
  declarations: [PerfilAdminPage]
})
export class PerfilAdminPageModule {}
