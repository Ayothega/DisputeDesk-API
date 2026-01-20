import { Injectable } from "@nestjs/common"
import type { PrismaService } from "../prisma/prisma.service"
import type { CreateOrganizationDto } from "./dto/create-organization.dto"

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(createOrgDto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: createOrgDto,
    })
  }

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: { users: true, disputes: true },
    })
  }

  async findAll() {
    return this.prisma.organization.findMany({
      include: { users: true },
    })
  }

  async update(id: string, data: any) {
    return this.prisma.organization.update({
      where: { id },
      data,
    })
  }

  async delete(id: string) {
    return this.prisma.organization.delete({
      where: { id },
    })
  }
}
