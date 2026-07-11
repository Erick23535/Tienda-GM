import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ClientesAdminPage } from './clientes-admin.page';

const routes: Routes = [
  {
    path: '',
    component: ClientesAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientesAdminPageRoutingModule {}
