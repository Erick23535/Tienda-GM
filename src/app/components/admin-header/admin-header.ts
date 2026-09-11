import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-admin-header',
  templateUrl: './admin-header.html',
  standalone: false,
})
export class AdminHeaderComponent {
  @Input() titulo = '';
  @Input() subtitulo = '';
  @Input() accionTexto = '';
  @Input() accionIcono = 'add-outline';
  @Output() accion = new EventEmitter<void>();
}
