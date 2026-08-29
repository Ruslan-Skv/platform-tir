import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateInstallerDto } from './dto/create-installer.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';

const INSTALLER_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  },
} as const satisfies Prisma.InstallerMasterInclude;

@Injectable()
export class InstallersService {
  constructor(private readonly prisma: PrismaService) {}

  private emptyToNull(value?: string | null): string | null {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed || null;
  }

  /** Порядок как в `phones`, затем одиночный `phone` без дублей; `phone` в БД = первый номер. */
  private normalizePhones(params: { phone?: string | null; phones?: string[] | null }): {
    phone: string | null;
    phones: string[];
  } {
    if (params.phone === null && params.phones === undefined) {
      return { phone: null, phones: [] };
    }
    const out: string[] = [];
    const add = (s: string | null | undefined) => {
      const t = (s ?? '').trim();
      if (t && !out.includes(t)) out.push(t);
    };
    if (params.phones != null) {
      for (const p of params.phones) add(p);
    }
    if (params.phone !== undefined && params.phone !== null) {
      add(params.phone);
    }
    return { phone: out[0] ?? null, phones: out };
  }

  private async resolveUserId(
    userId: string | null | undefined,
  ): Promise<string | null | undefined> {
    if (userId === undefined) return undefined;
    const id = this.emptyToNull(userId);
    if (!id) return null;
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true },
    });
    if (!user) {
      throw new BadRequestException('Пользователь для привязки не найден');
    }
    if (!user.isActive) {
      throw new BadRequestException('Нельзя привязать неактивный аккаунт');
    }
    return user.id;
  }

  async create(dto: CreateInstallerDto) {
    const userId = await this.resolveUserId(dto.userId);
    const { phone, phones } = this.normalizePhones({ phone: dto.phone, phones: dto.phones });
    return this.prisma.installerMaster.create({
      data: {
        direction: dto.direction,
        fullName: dto.fullName.trim(),
        grade: dto.grade.trim(),
        phone,
        phones,
        ...(userId !== undefined ? { userId } : {}),
      },
      include: INSTALLER_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.installerMaster.findMany({
      include: INSTALLER_INCLUDE,
      orderBy: [{ direction: 'asc' }, { fullName: 'asc' }],
    });
  }

  async findOne(id: string) {
    const installer = await this.prisma.installerMaster.findUnique({
      where: { id },
      include: INSTALLER_INCLUDE,
    });
    if (!installer) {
      throw new NotFoundException(`Installer with ID ${id} not found`);
    }
    return installer;
  }

  async update(id: string, dto: UpdateInstallerDto) {
    await this.findOne(id);
    const userId = dto.userId !== undefined ? await this.resolveUserId(dto.userId) : undefined;
    const phonesPatch =
      dto.phone !== undefined || dto.phones !== undefined
        ? this.normalizePhones({ phone: dto.phone, phones: dto.phones })
        : null;
    return this.prisma.installerMaster.update({
      where: { id },
      data: {
        ...(dto.direction !== undefined ? { direction: dto.direction } : {}),
        ...(dto.fullName !== undefined ? { fullName: dto.fullName.trim() } : {}),
        ...(dto.grade !== undefined ? { grade: dto.grade.trim() } : {}),
        ...(phonesPatch ? { phone: phonesPatch.phone, phones: phonesPatch.phones } : {}),
        ...(userId !== undefined ? { userId } : {}),
      },
      include: INSTALLER_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.installerMaster.delete({ where: { id } });
  }
}
