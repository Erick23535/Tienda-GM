import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { SharedUiModule } from '../../components/shared-ui.module';
import { DashboardPage } from './dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    RouterModule,
    SharedUiModule,
    DashboardPageRoutingModule
  ],
  declarations: [DashboardPage]
})
export class DashboardPageModule {}