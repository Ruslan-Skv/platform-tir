import { ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';

import { AdminScreenshotsService } from './screenshots.service';

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: { unlink: jest.fn().mockResolvedValue(undefined) },
  existsSync: jest.fn().mockReturnValue(true),
  createReadStream: jest.fn().mockReturnValue('stream-stub'),
}));

const prismaStub = (rows: Array<Record<string, unknown>>) =>
  ({
    adminScreenshot: {
      findMany: jest.fn().mockResolvedValue(rows),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  }) as never;

const author = { id: 'user-1', role: 'ADMIN' };
const superAdmin = { id: 'user-sa', role: 'SUPER_ADMIN' };
const stranger = { id: 'user-2', role: 'ADMIN' };

const shot = {
  id: 'shot-1',
  fileName: 'screenshot-1.png',
  mimeType: 'image/png',
  authorId: 'user-1',
};

describe('AdminScreenshotsService', () => {
  let service: AdminScreenshotsService;
  let prisma: {
    adminScreenshot: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(() => {
    jest.useFakeTimers();
    prisma = prismaStub([]) as never;
    service = new AdminScreenshotsService(prisma as never);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('list', () => {
    it('обычный админ видит только свои скриншоты', async () => {
      await service.list(author);
      expect(prisma.adminScreenshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: 'user-1' }),
        }),
      );
    });

    it('суперадмин видит все скриншоты и может фильтровать по автору', async () => {
      await service.list(superAdmin, { authorId: 'user-2' });
      expect(prisma.adminScreenshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ authorId: 'user-2' }),
        }),
      );

      await service.list(superAdmin);
      expect(prisma.adminScreenshot.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ authorId: expect.anything() }),
        }),
      );
    });

    it('не показывает просроченные скриншоты', async () => {
      await service.list(superAdmin);
      expect(prisma.adminScreenshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ expiresAt: { gt: expect.any(Date) } }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('автор может удалить свой скриншот (запись + файл)', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(shot);
      await service.remove(author, 'shot-1');
      expect(prisma.adminScreenshot.delete).toHaveBeenCalledWith({ where: { id: 'shot-1' } });
      expect(fs.promises.unlink).toHaveBeenCalledWith(expect.stringContaining(shot.fileName));
    });

    it('суперадмин может удалить чужой скриншот', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(shot);
      await service.remove(superAdmin, 'shot-1');
      expect(prisma.adminScreenshot.delete).toHaveBeenCalled();
    });

    it('чужой скриншот удалить нельзя', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(shot);
      await expect(service.remove(stranger, 'shot-1')).rejects.toThrow(ForbiddenException);
      expect(prisma.adminScreenshot.delete).not.toHaveBeenCalled();
    });

    it('несуществующий скриншот — 404', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(null);
      await expect(service.remove(author, 'nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('openFile', () => {
    it('открывает файл автору', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(shot);
      const result = await service.openFile(author, 'shot-1');
      expect(result.fileName).toBe(shot.fileName);
      expect(result.mimeType).toBe('image/png');
    });

    it('не отдаёт файл постороннему', async () => {
      prisma.adminScreenshot.findUnique.mockResolvedValue(shot);
      await expect(service.openFile(stranger, 'shot-1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cleanupExpired', () => {
    it('удаляет просроченные записи вместе с файлами', async () => {
      prisma.adminScreenshot.findMany.mockResolvedValue([
        shot,
        { ...shot, id: 'shot-2', fileName: 'screenshot-2.png' },
      ]);
      const deleted = await service.cleanupExpired();
      expect(deleted).toBe(2);
      expect(prisma.adminScreenshot.deleteMany).toHaveBeenCalled();
      expect(fs.promises.unlink).toHaveBeenCalledTimes(2);
    });

    it('ничего не делает, когда просроченных нет', async () => {
      prisma.adminScreenshot.findMany.mockResolvedValue([]);
      const deleted = await service.cleanupExpired();
      expect(deleted).toBe(0);
      expect(prisma.adminScreenshot.deleteMany).not.toHaveBeenCalled();
    });
  });
});
