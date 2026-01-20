import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common"
import type { JwtService } from "@nestjs/jwt"
import * as bcrypt from "bcrypt"
import type { UsersService } from "../users/users.service"
import type { LoginDto } from "./dto/login.dto"
import type { SignUpDto } from "./dto/signup.dto"

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async signup(signUpDto: SignUpDto) {
    const existingUser = await this.usersService.findByEmail(signUpDto.email)
    if (existingUser) {
      throw new BadRequestException("User already exists")
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10)
    const user = await this.usersService.create({
      email: signUpDto.email,
      passwordHash: hashedPassword,
      firstName: signUpDto.firstName,
      lastName: signUpDto.lastName,
      organizationId: signUpDto.organizationId,
    })

    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwtService.sign(payload)

    return { accessToken, user }
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email)
    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwtService.sign(payload)

    return { accessToken, user }
  }
}
