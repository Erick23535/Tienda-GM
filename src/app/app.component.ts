import { Component } from '@angular/core';
import { ThemeService } from './services/theme';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(private themeSvc: ThemeService) {
    this.themeSvc.inicializar();
  }
}
