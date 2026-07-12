import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, tap } from "rxjs";
import { AUDIT_ACTION_KEY } from "../decorators/audit.decorator";
import { AuthenticatedRequest } from "../types/authenticated-request";
import { AuditService } from "../../modules/audit/audit.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const method = request.method.toUpperCase();
    const action =
      this.reflector.getAllAndOverride<string>(AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]) ??
      `${method}_${request.route?.path ?? request.path}`;

    return next.handle().pipe(
      tap(() => {
        if (["GET", "HEAD", "OPTIONS"].includes(method)) return;
        void this.auditService.log({
          actorUserId: request.user?.id,
          action,
          entityType: "http_request",
          ipAddress: request.ip,
          userAgent: request.headers["user-agent"],
          metadata: {
            method,
            path: request.originalUrl,
          },
        });
      }),
    );
  }
}
