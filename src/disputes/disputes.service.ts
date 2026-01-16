import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { DisputeStateMachine } from "./dispute-state.machine"
import type { CreateDisputeDto } from "./dto/create-dispute.dto"
import type { TransitionDisputeDto } from "./dto/transition-dispute.dto"
import { DisputeStatus, ActorType, type UserRole } from "./enums/dispute-status.enum"
import type { Dispute, DisputeTransition, AuditLog } from "@prisma/client"

@Injectable()
export class DisputesService {
  constructor(
    private prisma: PrismaService,
    private stateMachine: DisputeStateMachine,
  ) {}

  async createDispute(organizationId: string, createDisputeDto: CreateDisputeDto, userId: string): Promise<Dispute> {
    const [customer, organization] = await Promise.all([
      this.prisma.customer.findUnique({ where: { id: createDisputeDto.customerId } }),
      this.prisma.organization.findUnique({ where: { id: organizationId } }),
    ])

    if (!customer || !organization) {
      throw new NotFoundException("Customer or Organization not found")
    }

    const slaDeadline = new Date()
    slaDeadline.setDate(slaDeadline.getDate() + 30) // 30-day SLA

    const dispute = await this.prisma.dispute.create({
      data: {
        organizationId,
        customerId: createDisputeDto.customerId,
        category: createDisputeDto.category,
        description: createDisputeDto.description,
        monetaryImpact: createDisputeDto.monetaryImpact,
        status: DisputeStatus.NEW,
        slaDeadline,
      },
    })

    await Promise.all([
      this.prisma.auditLog.create({
        data: {
          actorType: ActorType.SYSTEM,
          actorId: userId,
          action: "CREATE",
          entity: "Dispute",
          entityId: dispute.id,
          metadata: { category: dispute.category, monetaryImpact: dispute.monetaryImpact },
        },
      }),
      this.prisma.disputeTransition.create({
        data: {
          disputeId: dispute.id,
          fromState: DisputeStatus.NEW,
          toState: DisputeStatus.NEW,
          actorType: ActorType.SYSTEM,
          actorId: userId,
          reason: "Initial state",
        },
      }),
    ])

    return dispute
  }

  async listDisputes(
    organizationId: string,
    filters?: { status?: DisputeStatus; slaOverdue?: boolean },
  ): Promise<Dispute[]> {
    const where: any = { organizationId }

    if (filters?.status) {
      where.status = filters.status
    }

    if (filters?.slaOverdue) {
      where.slaDeadline = { lt: new Date() }
    }

    return this.prisma.dispute.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })
  }

  async getDisputeById(id: string, organizationId: string): Promise<Dispute> {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id },
      include: {
        transitions: { orderBy: { createdAt: "desc" } },
        messages: { orderBy: { createdAt: "desc" } },
        evidence: { orderBy: { createdAt: "desc" } },
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
    userRole: UserRole,
  ): Promise<{ dispute: Dispute; transition: DisputeTransition; auditLog: AuditLog }> {
    const [dispute, user] = await Promise.all([
      this.prisma.dispute.findUnique({ where: { id } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ])

    if (!dispute || dispute.organizationId !== organizationId) {
      throw new NotFoundException("Dispute not found")
    }

    if (!user || user.role !== userRole) {
      throw new ForbiddenException("User role mismatch")
    }

    this.stateMachine.validateTransition(dispute.status, transitionDto.toState, userRole, ActorType.AGENT)

    const [updatedDispute, transition, auditLog] = await this.prisma.$transaction([
      this.prisma.dispute.update({
        where: { id },
        data: { status: transitionDto.toState },
      }),
      this.prisma.disputeTransition.create({
        data: {
          disputeId: id,
          fromState: dispute.status,
          toState: transitionDto.toState,
          actorType: ActorType.AGENT,
          actorId: userId,
          reason: transitionDto.reason || "",
        },
      }),
      this.prisma.auditLog.create({
        data: {
          actorType: ActorType.AGENT,
          actorId: userId,
          action: "TRANSITION",
          entity: "Dispute",
          entityId: id,
          metadata: {
            fromState: dispute.status,
            toState: transitionDto.toState,
            reason: transitionDto.reason,
          },
        },
      }),
    ])

    return {
      dispute: updatedDispute,
      transition,
      auditLog,
    }
  }
}
