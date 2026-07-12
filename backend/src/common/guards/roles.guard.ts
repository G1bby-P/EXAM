import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RoleCode } from "../../../generated/prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedRequest } from "../types/authenticated-request";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleCode[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const roles = request.user?.roles ?? [];
    const allowed = requiredRoles.some((role) => roles.includes(role));
    if (!allowed) {
      throw new ForbiddenException("Insufficient role permissions.");
    }
    return true;
  }
}
