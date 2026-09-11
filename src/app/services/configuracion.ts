import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {

  private API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obtener() {
    return this.http.get<any>(`${this.API}/configuracion`);
  }

  actualizar(datos: any) {
    return this.http.put<any>(`${this.API}/configuracion`, datos);
  }
}
