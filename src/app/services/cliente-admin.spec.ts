import { TestBed } from '@angular/core/testing';

import { ClienteAdmin } from './cliente-admin';

describe('ClienteAdmin', () => {
  let service: ClienteAdmin;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ClienteAdmin);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
