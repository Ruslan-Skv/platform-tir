import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateTaskDto, TaskStatus } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createdById: string, createTaskDto: CreateTaskDto) {
    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
        createdById,
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAll(params?: {
    status?: string;
    priority?: string;
    assigneeId?: string;
    customerId?: string;
    type?: string;
    overdue?: boolean;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      priority,
      assigneeId,
      customerId,
      type,
      overdue,
      page = 1,
      limit = 20,
    } = params || {};

    const skip = (page - 1) * limit;
    const where: Prisma.TaskWhereInput = {};

    if (status) {
      where.status = status as Prisma.EnumTaskStatusFilter;
    }

    if (priority) {
      where.priority = priority as Prisma.EnumTaskPriorityFilter;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (type) {
      where.type = type as Prisma.EnumTaskTypeFilter;
    }

    if (overdue) {
      where.dueDate = { lt: new Date() };
      where.status = { notIn: ['COMPLETED', 'CANCELLED'] };
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      data: tasks,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    await this.findOne(id);

    const data: Prisma.TaskUpdateInput = { ...updateTaskDto };

    if (updateTaskDto.dueDate) {
      data.dueDate = new Date(updateTaskDto.dueDate);
    }

    if (updateTaskDto.status === TaskStatus.COMPLETED) {
      data.completedAt = new Date();
    }

    return this.prisma.task.update({
      where: { id },
      data,
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.task.delete({
      where: { id },
    });
  }

  async complete(id: string) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }

  // Get tasks due today or overdue for a user
  async getMyTasks(userId: string) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        dueDate: { lte: today },
      },
      include: {
        customer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });
  }

  // Get task statistics
  async getStats(assigneeId?: string) {
    const where: Prisma.TaskWhereInput = assigneeId ? { assigneeId } : {};

    const [pending, inProgress, completed, overdue] = await Promise.all([
      this.prisma.task.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.task.count({
        where: { ...where, status: 'IN_PROGRESS' },
      }),
      this.prisma.task.count({
        where: { ...where, status: 'COMPLETED' },
      }),
      this.prisma.task.count({
        where: {
          ...where,
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { pending, inProgress, completed, overdue };
  }
}
