import { TestBed } from '@angular/core/testing';

import { CategoriaAdmin } from './categoria-admin';

describe('CategoriaAdmin', () => {
  let service: CategoriaAdmin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CategoriaAdmin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
