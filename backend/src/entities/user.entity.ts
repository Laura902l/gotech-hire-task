import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  username: string; // index added for query performance

  @Column()
  password: string; // should have @Exclude() to prevent accidental exposure

  @Column({ default: 'user' })
  role: string; // should be an enum

  @CreateDateColumn()
  createdAt: Date;
}
