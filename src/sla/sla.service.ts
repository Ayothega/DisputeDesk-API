import { Injectable, NotFoundException } from "@nestjs/common"
import { InjectQueue } from "@nestjs/bull"
import type { Queue } from "bull"
import type { PrismaService } from "../prisma/prisma.service"
import type { CreateSLADto } from "./dto/create-sla.dto"

@Injectable()
export class SLAService {
  private slaQueue: Queue

  constructor(private prisma: PrismaService) {
    this.slaQueue = InjectQueue("sla-escalation")
  }

  async create(organizationId: string, createSLADto: CreateSLADto) {
    return this.prisma.sLA.create({
      data: {
        organizationId,
        name: createSLADto.name,
        resolutionHours: createSLADto.resolutionHours,
        escalationHours: createSLADto.escalationHours,
      },
    })
  }

  async findById(id: string, organizationId: string) {
    const sla = await this.prisma.sLA.findUnique({
      where: { id },
      include: { disputes: true },
    })

    if (!sla || sla.organizationId !== organizationId) {
      throw new NotFoundException("SLA not found")
    }

    return sla
  }

  async findAll(organizationId: string) {
    return this.prisma.sLA.findMany({
      where: { organizationId },
      include: { disputes: true },
    })
  }

  async update(id: string, organizationId: string, data: any) {
    const sla = await this.prisma.sLA.findUnique({ where: { id } })

    if (!sla || sla.organizationId !== organizationId) {
      throw new NotFoundException("SLA not found")
    }

    return this.prisma.sLA.update({
      where: { id },
      data,
    })
  }

  async delete(id: string, organizationId: string) {
    const sla = await this.prisma.sLA.findUnique({ where: { id } })

    if (!sla || sla.organizationId !== organizationId) {
      throw new NotFoundException("SLA not found")
    }

    return this.prisma.sLA.delete({
      where: { id },
    })
  }

  async scheduleEscalationCheck(organizationId: string, delayMs = 60000) {
    return this.slaQueue.add(
      "check-escalations",
      { organizationId },
      {
        delay: delayMs,
        repeat: { every: 300000 }, // Every 5 minutes
      },
    )
  }

  async scheduleBreachCheck(organizationId: string, delayMs = 120000) {
    return this.slaQueue.add(
      "check-breaches",
      { organizationId },
      {
        delay: delayMs,
        repeat: { every: 600000 }, // Every 10 minutes
      },
    )
  }
}
