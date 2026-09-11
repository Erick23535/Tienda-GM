import { Component } from '@angular/core';
import { ThemeService } from '../../services/theme';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.html',
  standalone: false,
})
export class ThemeToggleComponent {
  constructor(public themeSvc: ThemeService) {}
}
