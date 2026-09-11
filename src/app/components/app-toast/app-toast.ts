import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { animate } from 'motion';

@Component({
  selector: 'app-toast',
  templateUrl: './app-toast.html',
  standalone: false,
})
export class AppToastComponent implements OnChanges {
  @Input() abierto = false;
  @Input() mensaje = '';
  @Input() tipo: 'success' | 'danger' | 'warning' = 'danger';

  @ViewChild('caja') cajaRef?: ElementRef<HTMLElement>;

  // `abierto` es la intención del padre; `visible` controla el DOM y se
  // mantiene un poco más al cerrar para que la animación de salida corra.
  visible = false;

  get icono(): string {
    if (this.tipo === 'success') return 'checkmark-circle';
    if (this.tipo === 'warning') return 'alert-circle';
    return 'close-circle';
  }

  get colorVar(): string {
    if (this.tipo === 'success') return 'var(--admin-success)';
    if (this.tipo === 'warning') return 'var(--admin-gold)';
    return 'var(--admin-danger)';
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['abierto']) return;

    if (this.abierto) {
      this.visible = true;
    } else if (this.visible) {
      this.animarSalida();
    }
  }

  private animarSalida() {
    const caja = this.cajaRef?.nativeElement;
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!caja || reducirMovimiento) {
      this.visible = false;
      return;
    }

    animate(caja, { opacity: 0, transform: 'translateY(20px)' }, { duration: 0.2, ease: 'easeIn' })
      .finished.then(() => { this.visible = false; });
  }
}
