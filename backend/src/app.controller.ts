import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ChatService } from './chat.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller()
export class AppController {
  constructor(
    private authService: AuthService,
    private chatService: ChatService,
  ) {}

  @Post('auth/register')
  async register(@Body() dto: CreateUserDto) {
    const { username, password } = dto;
    return this.authService.register(username, password);
  }

  @Post('auth/login')
  async login(@Body() dto: CreateUserDto) {
    const { username, password } = dto;
    const result = await this.authService.login(username, password);
    if (!result) {
      return { error: 'Invalid credentials' };
    }
    return result;
  }

  @Post('auth/refresh')
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body || !body.refreshToken) return { error: 'refreshToken required' };
    const result = await this.authService.refreshToken(body.refreshToken);
    if (!result) return { error: 'Invalid refresh token' };
    return result;
  }

  @Post('auth/logout')
  async logout(@Body() body: { refreshToken?: string }) {
    return { ok: true };
  }

  @Get('users')
  async getUsers(@Headers('authorization') auth: string) {
    if (!auth) throw new UnauthorizedException();
    const token = auth.replace('Bearer ', '');
    const decoded = this.authService.verifyToken(token);
    if (!decoded) throw new UnauthorizedException();
    return this.chatService.getUsersSafe();
  }
}
