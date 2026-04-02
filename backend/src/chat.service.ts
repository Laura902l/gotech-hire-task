import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Room } from './entities/room.entity';
import { Message } from './entities/message.entity';
import { User } from './entities/user.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  private readonly activeUsers: Map<number, Set<number>> = new Map();
  private readonly logger = new Logger(ChatService.name);

  async getRooms(): Promise<any[]> {
    return this.roomRepository.find();
  }

  async createRoom(name: string, description?: string): Promise<any> {
    const existing = await this.roomRepository.findOne({ where: { name } });
    if (existing) {
      return existing;
    }
    const room = this.roomRepository.create({ name, description });
    return this.roomRepository.save(room);
  }

  async getMessages(roomId: number, page = 1, limit = 100): Promise<any[]> {
    const offset = (page - 1) * limit;

    const rows = await this.messageRepository
      .createQueryBuilder('m')
      .leftJoinAndMapOne('m.user', User, 'u', 'u.id = m.user_id')
      .where('m.room_id = :roomId', { roomId })
      .orderBy('m."createdAt"', 'ASC')
      .offset(offset)
      .limit(limit)
      .getMany();

    return rows.map(r => ({
      id: r.id,
      room_id: r.room_id,
      user_id: r.user_id,
      content: (r as any).content,
      senderName: (r as any).senderName,
      createdAt: r.createdAt,
      username: (r as any)['user'] ? (r as any)['user'].username : undefined,
    }));
  }

  async saveMessage(room_id: number, user_id: number, content: string, senderName: string): Promise<any> {
    const message = this.messageRepository.create({
      room_id,
      user_id,
      content,
      senderName,
    });
    return this.messageRepository.save(message);
  }

  async getUserById(id: number): Promise<any> {
    return this.userRepository.findOne({ where: { id } });
  }

  async getUsersSafe(): Promise<any[]> {
    return this.userRepository.find({ select: ['id', 'username', 'role', 'createdAt'] });
  }

  async getActiveUsers(roomId: number): Promise<any[]> {
    const set = this.activeUsers.get(roomId);
    if (!set || set.size === 0) return [];
    const ids = Array.from(set.values());
    const users = await this.userRepository.find({ where: { id: In(ids) }, select: ['id', 'username'] });
    return users;
  }

  userJoined(roomId: number, userId: number) {
    let set = this.activeUsers.get(roomId);
    if (!set) {
      set = new Set<number>();
      this.activeUsers.set(roomId, set);
    }
    set.add(userId);
    this.logger.debug(`User ${userId} joined room ${roomId}`);
  }

  userLeft(roomId: number, userId: number) {
    const set = this.activeUsers.get(roomId);
    if (!set) return;
    set.delete(userId);
    if (set.size === 0) this.activeUsers.delete(roomId);
    this.logger.debug(`User ${userId} left room ${roomId}`);
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const msg = await this.messageRepository.findOne({ where: { id: messageId } });
    if (!msg) return false;
    if (msg.user_id !== userId) return false;
    await this.messageRepository.delete(messageId);
    return true;
  }
}
