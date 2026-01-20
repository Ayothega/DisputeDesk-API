import { Injectable, type NestInterceptor, type ExecutionContext, type CallHandler } from "@nestjs/common"
import type { Observable } from "rxjs"
import { tap } from "rxjs/operators"
import type { Reflector } from "@nestjs/core"
import type { AuditService } from "../../audit/audit.service"
import { AUDIT_METADATA_KEY, type AuditMetadata } from "../decorators/audit.decorator"

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const auditMetadata = this.reflector.get<AuditMetadata>(AUDIT_METADATA_KEY, context.getHandler())

    if (!auditMetadata) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    const { user } = request
    const startTime = Date.now()

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime
        const organizationId = user?.organizationId

        if (organizationId) {
          // Log sensitive actions even if they succeed
          await this.auditService.log({
            organizationId,
            userId: user?.id,
            action: auditMetadata.action,
            entity: auditMetadata.entity,
            changes: {
              method: request.method,
              path: request.path,
              duration: `${duration}ms`,
              response: auditMetadata.sensitive ? "[REDACTED]" : response,
            },
            ipAddress: request.ip,
            userAgent: request.get("user-agent"),
          })
        }
      }),
    )
  }
}
