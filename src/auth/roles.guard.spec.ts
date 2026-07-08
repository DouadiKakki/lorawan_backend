import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function makeContext(userRole: string, requiredRoles: string[] | undefined): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: userRole } }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('allows Super Admin on a route that requires admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext('Super Admin', ['admin']))).toBe(true);
  });

  it('allows Super Admin on a route that requires operator', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['operator']);
    expect(guard.canActivate(makeContext('Super Admin', ['operator']))).toBe(true);
  });

  it('rejects operator on a route that requires admin', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(guard.canActivate(makeContext('operator', ['admin']))).toBe(false);
  });

  it('allows any role when no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('viewer', undefined))).toBe(true);
  });
});
