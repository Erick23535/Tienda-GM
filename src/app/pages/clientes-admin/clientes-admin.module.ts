import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ClientesAdminPageRoutingModule } from './clientes-admin-routing.module';
import { ClientesAdminPage } from './clientes-admin.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    ClientesAdminPageRoutingModule
  ],
  declarations: [ClientesAdminPage]
})
export class ClientesAdminPageModule {}
