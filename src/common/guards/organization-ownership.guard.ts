import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common"

@Injectable()
export class OrganizationOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const { user } = request
    const { organizationId } = request.params

    if (!user || !organizationId) {
      throw new ForbiddenException("Missing user or organization context")
    }

    if (user.organizationId !== organizationId) {
      throw new ForbiddenException("Access denied: organization mismatch")
    }

    return true
  }
}
