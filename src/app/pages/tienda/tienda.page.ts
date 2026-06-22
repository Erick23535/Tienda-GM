import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tienda',
  templateUrl: './tienda.page.html',
  styleUrls: ['./tienda.page.scss'],
  standalone: false
})
export class TiendaPage implements OnInit {

  nombre = '';

  constructor(private router: Router) {}

  ngOnInit() {
    this.nombre = localStorage.getItem('cliente_nombre') || 'Cliente';
  }

  cerrarSesion() {
    localStorage.removeItem('cliente_token');
    localStorage.removeItem('cliente_nombre');
    this.router.navigate(['/login-cliente']);
  }
}