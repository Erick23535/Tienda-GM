import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private clave = 'tema';
  tema: 'dark' | 'light' = 'dark';

  inicializar() {
    const guardado = localStorage.getItem(this.clave);
    this.aplicar(guardado === 'light' ? 'light' : 'dark');
  }

  alternar() {
    this.aplicar(this.tema === 'dark' ? 'light' : 'dark');
  }

  aplicar(tema: 'dark' | 'light') {
    this.tema = tema;
    document.documentElement.setAttribute('data-theme', tema);
    document.documentElement.classList.toggle('ion-palette-dark', tema === 'dark');
    localStorage.setItem(this.clave, tema);
  }
}
