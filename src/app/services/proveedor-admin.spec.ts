import { TestBed } from '@angular/core/testing';

import { ProveedorAdmin } from './proveedor-admin';

describe('ProveedorAdmin', () => {
  let service: ProveedorAdmin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProveedorAdmin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
