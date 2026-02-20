import { Injectable, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

type UserWithoutPassword = Omit<User, 'password'>;
type UserPayload = {
  id: string;
  email: string;
  role: string;
  firstName?: string | null;
  lastName?: string | null;
};

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<UserWithoutPassword | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    if ((user as { isGuest?: boolean }).isGuest) return null; // Гость не может войти
    if (!(await bcrypt.compare(password, user.password))) return null;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = user;
    return result;
  }

  async login(user: UserPayload) {
    const payload = { email: user.email, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: (user as UserWithoutPassword).avatar ?? null,
      },
    };
  }

  async register(email: string, password: string, firstName?: string, lastName?: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const completed = await this.usersService.completeGuestRegistration(
      normalizedEmail,
      password,
      firstName,
      lastName,
    );
    if (completed) {
      return this.login(completed);
    }
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing && !(existing as { isGuest?: boolean }).isGuest) {
      throw new ConflictException('Пользователь с таким email уже зарегистрирован');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create({
      email: normalizedEmail,
      password: hashedPassword,
      firstName,
      lastName,
    });
    return this.login(user);
  }
}
