import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';
import { SharedUiModule } from '../../components/shared-ui.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    LoginPageRoutingModule,
    SharedUiModule
  ],
  declarations: [LoginPage]
})
export class LoginPageModule {}