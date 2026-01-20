import { Injectable } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"

interface AuditLogInput {
  organizationId: string
  userId?: string
  disputeId?: string
  action: string
  entity: string
  changes?: any
  ipAddress?: string
  userAgent?: string
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        disputeId: input.disputeId,
        action: input.action,
        entity: input.entity,
        changes: input.changes,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    })
  }

  async getLogs(organizationId: string, filters?: { userId?: string; disputeId?: string }) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        userId: filters?.userId,
        disputeId: filters?.disputeId,
      },
      orderBy: { createdAt: "desc" },
      include: { user: true, dispute: true },
    })
  }

  async getLogById(id: string, organizationId: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: { user: true, dispute: true },
    })
  }
}
