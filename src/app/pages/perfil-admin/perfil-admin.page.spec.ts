import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PerfilAdminPage } from './perfil-admin.page';

describe('PerfilAdminPage', () => {
  let component: PerfilAdminPage;
  let fixture: ComponentFixture<PerfilAdminPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PerfilAdminPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
