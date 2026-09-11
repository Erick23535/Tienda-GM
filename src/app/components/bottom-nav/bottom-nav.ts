import { Component, EventEmitter, Input, Output } from '@angular/core';

interface TabNav {
  valor: string;
  icono: string;
  etiqueta: string;
}

@Component({
  selector: 'app-bottom-nav',
  templateUrl: './bottom-nav.html',
  styleUrls: ['./bottom-nav.scss'],
  standalone: false,
})
export class BottomNavComponent {
  @Input() seccion = 'inicio';
  @Input() cantidadCarrito = 0;
  @Input() favoritosCount = 0;
  @Output() cambiar = new EventEmitter<string>();

  tabs: TabNav[] = [
    { valor: 'inicio',    icono: 'home-outline',  etiqueta: 'Inicio' },
    { valor: 'catalogo',  icono: 'shirt-outline', etiqueta: 'Catálogo' },
    { valor: 'favoritos', icono: 'heart-outline', etiqueta: 'Favoritos' },
    { valor: 'carrito',   icono: 'cart-outline',  etiqueta: 'Carrito' },
    { valor: 'perfil',    icono: 'person-outline', etiqueta: 'Perfil' },
  ];

  badgeDe(tab: string): number {
    if (tab === 'carrito') return this.cantidadCarrito;
    if (tab === 'favoritos') return this.favoritosCount;
    return 0;
  }
}
