import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { LoginClientePageRoutingModule } from './login-cliente-routing.module';
import { LoginClientePage } from './login-cliente.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    LoginClientePageRoutingModule
  ],
  declarations: [LoginClientePage]
})
export class LoginClientePageModule {}