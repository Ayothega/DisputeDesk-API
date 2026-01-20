import { Controller, Get, Post, Param, UseGuards } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { OrganizationsService } from "./organizations.service"
import type { CreateOrganizationDto } from "./dto/create-organization.dto"

@Controller("organizations")
@UseGuards(AuthGuard("jwt"))
export class OrganizationsController {
  constructor(private organizationsService: OrganizationsService) {}

  @Post()
  create(createOrgDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrgDto)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.organizationsService.findById(id);
  }

  @Get()
  findAll() {
    return this.organizationsService.findAll()
  }
}
