import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

const ROLE_HIERARCHY = { 'Super Admin': 4, admin: 3, operator: 2, viewer: 1 };

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;
    const { user } = context.switchToHttp().getRequest();
    const userLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY] ?? 0;
    return requiredRoles.some(r => userLevel >= (ROLE_HIERARCHY[r as keyof typeof ROLE_HIERARCHY] ?? 0));
  }
}
