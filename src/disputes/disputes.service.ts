import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import { type DisputeStateMachine, UserRole } from "./dispute-state.machine"
import type { CreateDisputeDto } from "./dto/create-dispute.dto"
import type { TransitionDisputeDto } from "./dto/transition-dispute.dto"
import type { Dispute, DisputeStatus } from "@prisma/client"
import type { AuditService } from "../audit/audit.service"

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: DisputeStateMachine,
    private auditService: AuditService,
  ) {}

  async createDispute(organizationId: string, createDisputeDto: CreateDisputeDto, userId: string): Promise<Dispute> {
    const [user, organization] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
    ])

    if (!user || !organization) {
      throw new NotFoundException("User or Organization not found")
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      const newDispute = await tx.dispute.create({
        data: {
          externalId: createDisputeDto.externalId,
          organizationId,
          createdById: userId,
          reason: createDisputeDto.reason,
          amount: createDisputeDto.amount,
          currency: createDisputeDto.currency || "USD",
        },
      })

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          disputeId: newDispute.id,
          action: "DISPUTE_CREATED",
          entity: "Dispute",
          changes: { reason: newDispute.reason, amount: newDispute.amount, status: newDispute.status },
        },
      })

      return newDispute
    })

    return dispute
  }

  async listDisputes(organizationId: string, filters?: { status?: DisputeStatus; slaId?: string }): Promise<Dispute[]> {
    const where: any = { organizationId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.slaId) {
      where.slaId = filters.slaId
    }

    return this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true } },
        transitions: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    })
  }

  async getDisputeById(id: string, organizationId: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        assignedTo: { select: { id: true, email: true, firstName: true, lastName: true, role: true } },
        transitions: { orderBy: { createdAt: "desc" } },
        sla: true,
      },
    })

    if (!dispute || dispute.organizationId !== organizationId) {
      throw new NotFoundException("Dispute not found")
    }

    return dispute
  }

  async transitionDispute(
    id: string,
    organizationId: string,
    transitionDto: TransitionDisputeDto,
    userId: string,
    userRole: string,
  ): Promise<{
    dispute: Dispute
    message: string
  }> {
    const [dispute, user] = await Promise.all([
      this.prisma.dispute.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ])

    if (!dispute || dispute.organizationId !== organizationId) {
      throw new NotFoundException("Dispute not found")
    }

    if (!user) {
      throw new ForbiddenException("User not found")
    }

    // Validate transition before entering transaction
    this.stateMachine.validateTransition(
      dispute.status as DisputeStatus,
      transitionDto.toStatus as DisputeStatus,
      userRole as UserRole,
    )

    const result = await this.prisma.$transaction(
      async (tx) => {
        // Update dispute status
        const updatedDispute = await tx.dispute.update({
          where: { id },
          data: { status: transitionDto.toStatus, updatedAt: new Date() },
        })

        // Record transition
        await tx.disputeTransition.create({
          data: {
            disputeId: id,
            fromStatus: dispute.status as DisputeStatus,
            toStatus: transitionDto.toStatus as DisputeStatus,
            transitionedById: userId,
            reason: transitionDto.reason,
          },
        })

        // Log to audit trail (mandatory, never skipped)
        await tx.auditLog.create({
          data: {
            organizationId,
            userId,
            disputeId: id,
            action: "DISPUTE_TRANSITIONED",
            entity: "Dispute",
            changes: {
              fromStatus: dispute.status,
              toStatus: transitionDto.toStatus,
              reason: transitionDto.reason,
            },
          },
        })

        return updatedDispute
      },
      {
        timeout: 10000,
      },
    )

    return {
      dispute: result,
      message: `Dispute transitioned from ${dispute.status} to ${transitionDto.toStatus}`,
    }
  }

  async assignDispute(id: string, organizationId: string, assigneeId: string, userId: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
    })

    if (!dispute || dispute.organizationId !== organizationId) {
      throw new NotFoundException("Dispute not found")
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    })

    if (!assignee) {
      throw new NotFoundException("Assignee not found")
    }

    const updatedDispute = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id },
        data: { assignedToId: assigneeId, updatedAt: new Date() },
        include: { assignedTo: true, createdBy: true },
      })

      await tx.auditLog.create({
        data: {
          organizationId,
          userId,
          disputeId: id,
          action: "DISPUTE_ASSIGNED",
          entity: "Dispute",
          changes: { assignedToId: assigneeId, assignedToEmail: assignee.email },
        },
      })

      return updated
    })

    return updatedDispute
  }

  async systemTransitionDispute(disputeId: string, toStatus: DisputeStatus, reason: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
    })

    if (!dispute) {
      throw new NotFoundException("Dispute not found")
    }

    // Validate transition with SYSTEM role
    this.stateMachine.validateTransition(dispute.status as DisputeStatus, toStatus, UserRole.SYSTEM)

    const result = await this.prisma.$transaction(async (tx) => {
      const updatedDispute = await tx.dispute.update({
        where: { id: disputeId },
        data: { status: toStatus, updatedAt: new Date() },
      })

      await tx.disputeTransition.create({
        data: {
          disputeId,
          fromStatus: dispute.status as DisputeStatus,
          toStatus,
          transitionedById: "system",
          reason: `[SYSTEM] ${reason}`,
        },
      })

      await tx.auditLog.create({
        data: {
          organizationId: dispute.organizationId,
          userId: null,
          disputeId,
          action: "DISPUTE_SYSTEM_ESCALATION",
          entity: "Dispute",
          changes: { reason: `System triggered: ${reason}` },
        },
      })

      return updatedDispute
    })

    return result
  }
}
