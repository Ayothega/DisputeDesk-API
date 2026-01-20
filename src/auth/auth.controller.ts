import { Controller, Post } from "@nestjs/common"
import type { AuthService } from "./auth.service"
import type { LoginDto } from "./dto/login.dto"
import type { SignUpDto } from "./dto/signup.dto"

@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post("signup")
  signup(signUpDto: SignUpDto) {
    return this.authService.signup(signUpDto)
  }

  @Post("login")
  login(loginDto: LoginDto) {
    return this.authService.login(loginDto)
  }
}
