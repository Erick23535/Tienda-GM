import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { animate } from 'animejs';

@Component({
  selector: 'app-product-card',
  templateUrl: './product-card.html',
  styleUrls: ['./product-card.scss'],
  standalone: false,
})
export class ProductCardComponent {
  @Input() producto: any;
  @Input() esFavorito = false;
  // 'grid' = corazón interactivo (toggle); 'favoritos' = siempre lleno (quitar de favoritos)
  @Input() modo: 'grid' | 'favoritos' = 'grid';

  @Output() abrir = new EventEmitter<void>();
  @Output() agregar = new EventEmitter<void>();
  @Output() favorito = new EventEmitter<void>();

  @ViewChild('addBtn') addBtnRef?: ElementRef<HTMLElement>;
  @ViewChild('favBtn') favBtnRef?: ElementRef<HTMLElement>;

  agregadoFeedback = false;
  readonly estrellas = [1, 2, 3, 4, 5];

  get tieneResenas(): boolean {
    return !!this.producto?.total_resenas;
  }

  get calificacionRedondeada(): number {
    return Math.round(this.producto?.calificacion_promedio || 0);
  }

  get esNuevo(): boolean {
    if (!this.producto?.fecha_creacion) return false;
    const fecha = new Date(this.producto.fecha_creacion);
    const dias  = (Date.now() - fecha.getTime()) / (1000 * 60 * 60 * 24);
    return dias <= 7;
  }

  get tieneDescuento(): boolean {
    return !!(this.producto?.precio_original && this.producto.precio_original > this.producto.precio_venta);
  }

  get porcentajeDescuento(): number {
    if (!this.tieneDescuento) return 0;
    return Math.round(100 - (this.producto.precio_venta / this.producto.precio_original * 100));
  }

  onAgregar(event: Event) {
    event.stopPropagation();
    this.agregar.emit();
    this.agregadoFeedback = true;

    if (this.addBtnRef) {
      animate(this.addBtnRef.nativeElement, {
        scale: [1, 1.35, 1],
        rotate: ['0deg', '-8deg', '0deg'],
        duration: 480,
        ease: 'outElastic(1, .6)',
      });
    }

    setTimeout(() => this.agregadoFeedback = false, 1100);
  }

  onFavorito(event: Event) {
    event.stopPropagation();
    this.favorito.emit();

    if (this.favBtnRef) {
      animate(this.favBtnRef.nativeElement, {
        scale: [1, 1.4, 0.9, 1.1, 1],
        duration: 550,
        ease: 'outElastic(1, .5)',
      });
    }
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
