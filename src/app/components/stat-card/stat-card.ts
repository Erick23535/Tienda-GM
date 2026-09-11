import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { animate } from 'motion';

@Component({
  selector: 'app-stat-card',
  templateUrl: './stat-card.html',
  standalone: false,
})
export class StatCardComponent implements OnChanges {
  @Input() icono = 'stats-chart-outline';
  @Input() valor: string | number = '';
  @Input() etiqueta = '';
  @Input() color: 'gold' | 'success' | 'danger' | 'info' | 'purple' = 'gold';
  @Input() clickable = false;
  @Output() abrir = new EventEmitter<void>();

  // Cuando `valor` es numérico, se anima con motion (conteo ascendente/descendente);
  // si es texto (ej. "$1,234" ya formateado, o un nombre), se muestra tal cual.
  valorAnimado: number | null = null;

  get colorVar(): string {
    return `var(--admin-${this.color === 'gold' ? 'gold' : this.color})`;
  }

  get mostrar(): string | number {
    return this.valorAnimado !== null ? this.valorAnimado : this.valor;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['valor'] || typeof this.valor !== 'number') {
      this.valorAnimado = null;
      return;
    }

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const desde = typeof changes['valor'].previousValue === 'number' ? changes['valor'].previousValue : 0;
    const hasta = this.valor;

    if (reducirMovimiento || desde === hasta) {
      this.valorAnimado = hasta;
      return;
    }

    animate(desde, hasta, {
      duration: 0.7,
      ease: 'easeOut',
      onUpdate: (latest: number) => { this.valorAnimado = Math.round(latest); }
    });
  }
}
