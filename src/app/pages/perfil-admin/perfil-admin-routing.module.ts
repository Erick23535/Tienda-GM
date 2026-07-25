import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { PerfilAdminPage } from './perfil-admin.page';

const routes: Routes = [
  {
    path: '',
    component: PerfilAdminPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PerfilAdminPageRoutingModule {}
