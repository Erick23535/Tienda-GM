import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ResenaService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  porProducto(id_producto: number) {
    return this.http.get<any>(`${this.API}/resenas/producto/${id_producto}`);
  }

  guardar(id_producto: number, calificacion: number, comentario: string) {
    return this.http.post<any>(`${this.API}/resenas`, { id_producto, calificacion, comentario });
  }

  eliminar(id_resena: number) {
    return this.http.delete<any>(`${this.API}/resenas/${id_resena}`);
  }
}
