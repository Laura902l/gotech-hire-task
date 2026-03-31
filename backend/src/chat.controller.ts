import { Controller, Get, Post, Body, Param, Headers, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AuthService } from './auth.service';

@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService, private authService: AuthService) {}

  // No @UseGuards(JwtAuthGuard) - all routes unprotected
  @Get('rooms')
  async getRooms() {
    return this.chatService.getRooms();
  }

  @Post('rooms')
  async createRoom(@Body() body: any, @Headers('authorization') auth: string) {
    let userId: number | null = null;
    if (auth) {
      const token = auth.replace('Bearer ', '');
      const decoded: any = this.authService.verifyToken(token);
      if (decoded) userId = decoded.userId;
    }
    return this.chatService.createRoom(body.name, body.description);
  }

  @Get('rooms/:roomId/messages')
  async getMessages(@Param('roomId') roomId: string, @Query('page') page = '1', @Query('limit') limit = '100') {
    const pageNum = parseInt(page as string) || 1;
    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    return this.chatService.getMessages(parseInt(roomId), pageNum, limitNum);
  }
}
