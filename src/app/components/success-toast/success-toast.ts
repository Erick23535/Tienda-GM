import { Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { animate } from 'motion';

@Component({
  selector: 'app-success-toast',
  templateUrl: './success-toast.html',
  standalone: false,
})
export class SuccessToastComponent implements OnChanges {
  @Input() abierto = false;
  @Input() mensaje = '';
  @Input() icono = '';
  @Input() tipo: 'success' | 'danger' | 'warning' = 'success';

  @ViewChild('backdrop') backdropRef?: ElementRef<HTMLElement>;
  @ViewChild('card') cardRef?: ElementRef<HTMLElement>;

  // `abierto` es la intención del padre; `visible` controla el DOM y se
  // mantiene un poco más al cerrar para que la animación de salida corra.
  visible = false;

  get iconoResuelto(): string {
    if (this.icono) return this.icono;
    if (this.tipo === 'danger') return 'close-circle-outline';
    if (this.tipo === 'warning') return 'alert-circle-outline';
    return 'checkmark-circle-outline';
  }

  get colorVar(): string {
    if (this.tipo === 'danger') return 'var(--admin-danger)';
    if (this.tipo === 'warning') return 'var(--admin-gold)';
    return 'var(--admin-success)';
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
    const backdrop = this.backdropRef?.nativeElement;
    const card = this.cardRef?.nativeElement;
    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!backdrop || !card || reducirMovimiento) {
      this.visible = false;
      return;
    }

    Promise.all([
      animate(card, { opacity: 0, transform: 'scale(0.9)' }, { duration: 0.18, ease: 'easeIn' }).finished,
      animate(backdrop, { background: 'rgba(0,0,0,0)' }, { duration: 0.18, ease: 'easeIn' }).finished
    ]).then(() => { this.visible = false; });
  }
}
