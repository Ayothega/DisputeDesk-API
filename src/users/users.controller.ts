import { Controller, Get, Param, UseGuards } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import type { UsersService } from "./users.service"

@Controller("users")
@UseGuards(AuthGuard("jwt"))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Get()
  findAll() {
    return this.usersService.findAll()
  }
}
