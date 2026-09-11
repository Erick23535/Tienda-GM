import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ReportesPageRoutingModule } from './reportes-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';

import { ReportesPage } from './reportes.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    SharedUiModule,
    ReportesPageRoutingModule
  ],
  declarations: [ReportesPage]
})
export class ReportesPageModule {}
