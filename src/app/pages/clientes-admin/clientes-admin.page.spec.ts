import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClientesAdminPage } from './clientes-admin.page';

describe('ClientesAdminPage', () => {
  let component: ClientesAdminPage;
  let fixture: ComponentFixture<ClientesAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClientesAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
