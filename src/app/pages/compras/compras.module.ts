import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { ComprasPageRoutingModule } from './compras-routing.module';
import { ComprasPage } from './compras.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    ComprasPageRoutingModule
  ],
  declarations: [ComprasPage]
})
export class ComprasPageModule {}
