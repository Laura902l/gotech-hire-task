import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.REFRESH_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
if (!REFRESH_SECRET) {
  throw new Error('REFRESH_SECRET environment variable is required');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}
  private readonly logger = new Logger(AuthService.name);

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async register(username: string, password: string): Promise<any> {
    this.logger.log(`Registering user: ${username}`);
    const hashed = await this.hashPassword(password);
    const user = this.userRepository.create({ username, password: hashed });
    const saved = await this.userRepository.save(user);
    const token = jwt.sign({ userId: saved.id, username }, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: saved.id }, REFRESH_SECRET, { expiresIn: '7d' });
    return { token, refreshToken, userId: saved.id, username: saved.username };
  }

  async login(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      return null;
    }
    const ok = await this.comparePassword(password, user.password);
    if (!ok) return null;
    this.logger.log(`User logged in: ${username}`);
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
    return { token, refreshToken, userId: user.id, username: user.username };
  }

  async refreshToken(token: string): Promise<any> {
    try {
      const decoded: any = jwt.verify(token, REFRESH_SECRET);
      if (!decoded || !decoded.userId) return null;
      const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
      if (!user) return null;
      const accessToken = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
      const newRefresh = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: '7d' });
      return { token: accessToken, refreshToken: newRefresh, userId: user.id, username: user.username };
    } catch (err) {
      return null;
    }
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}
