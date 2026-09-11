import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { animate } from 'motion';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './confirm-modal.html',
  standalone: false,
})
export class ConfirmModalComponent implements OnChanges {
  @Input() abierto = false;
  @Input() titulo = '¿Estás seguro?';
  @Input() mensaje = '';
  @Input() tipo: 'danger' | 'warning' = 'danger';
  @Input() textoConfirmar = 'Eliminar';
  @Input() textoCancelar = 'Cancelar';
  @Output() confirmar = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  @ViewChild('backdrop') backdropRef?: ElementRef<HTMLElement>;
  @ViewChild('card') cardRef?: ElementRef<HTMLElement>;

  // Controla el DOM (display); `abierto` es la intención del padre, `visible`
  // se mantiene un poco más al cerrar para que la animación de salida corra.
  visible = false;

  get colorVar(): string {
    return this.tipo === 'danger' ? 'var(--admin-danger)' : 'var(--admin-gold)';
  }

  private get reducirMovimiento(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['abierto']) return;

    if (this.abierto) {
      this.visible = true;
      setTimeout(() => this.animarEntrada());
    } else if (this.visible) {
      this.animarSalida();
    }
  }

  private animarEntrada() {
    const backdrop = this.backdropRef?.nativeElement;
    const card = this.cardRef?.nativeElement;
    if (!backdrop || !card) return;

    if (this.reducirMovimiento) {
      backdrop.style.background = 'rgba(0,0,0,0.6)';
      card.style.opacity = '1';
      card.style.transform = 'scale(1)';
      return;
    }

    animate(backdrop, { background: 'rgba(0,0,0,0.6)' }, { duration: 0.2, ease: 'easeOut' });
    animate(card, { opacity: 1, transform: 'scale(1)' }, { duration: 0.32, ease: [0.34, 1.56, 0.64, 1] });
  }

  private animarSalida() {
    const backdrop = this.backdropRef?.nativeElement;
    const card = this.cardRef?.nativeElement;
    if (!backdrop || !card) { this.visible = false; return; }

    if (this.reducirMovimiento) {
      this.visible = false;
      return;
    }

    Promise.all([
      animate(card, { opacity: 0, transform: 'scale(0.92)' }, { duration: 0.18, ease: 'easeIn' }).finished,
      animate(backdrop, { background: 'rgba(0,0,0,0)' }, { duration: 0.18, ease: 'easeIn' }).finished
    ]).then(() => { this.visible = false; });
  }
}
