import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { Prisma, RoleCode, UserStatus } from "../../../generated/prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { normalizeEmail } from "../../common/utils/slug";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { AssignRolesDto } from "./dto/assign-roles.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      OR: query.search
        ? [
            { email: { contains: query.search, mode: "insensitive" } },
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { roles: { include: { role: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items: items.map((user) => this.sanitize(user)), total, page, limit };
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.deletedAt) throw new NotFoundException("User not found.");
    return this.sanitize(user);
  }

  async create(dto: CreateUserDto, actorUserId?: string) {
    const emailNormalized = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { emailNormalized } });
    if (existing) throw new ConflictException("Email is already registered.");

    const rounds = this.config.get<number>("BCRYPT_ROUNDS", 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);
    const roleCodes = Array.from(new Set(dto.roles?.length ? dto.roles : [RoleCode.STUDENT]));
    const roles = await this.prisma.role.findMany({ where: { code: { in: roleCodes } } });
    if (roles.length !== roleCodes.length) {
      throw new BadRequestException("One or more roles do not exist in the role catalog.");
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        emailNormalized,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status ?? UserStatus.ACTIVE,
        deletedAt: dto.status === UserStatus.DELETED ? new Date() : undefined,
        createdById: actorUserId,
        roles: {
          create: roles.map((role) => ({ roleId: role.id, assignedById: actorUserId })),
        },
      },
      include: { roles: { include: { role: true } } },
    });

    await this.audit.log({
      actorUserId,
      action: "USER_CREATED",
      entityType: "user",
      entityId: user.id,
      metadata: { roles: roleCodes },
    });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, actorUserId?: string) {
    await this.findById(id);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, this.config.get<number>("BCRYPT_ROUNDS", 12))
      : undefined;
    const emailNormalized = dto.email ? normalizeEmail(dto.email) : undefined;

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        email: dto.email,
        emailNormalized,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        status: dto.status,
        deletedAt: dto.status === UserStatus.DELETED ? new Date() : dto.status ? null : undefined,
      },
      include: { roles: { include: { role: true } } },
    });

    await this.audit.log({
      actorUserId,
      action: "USER_UPDATED",
      entityType: "user",
      entityId: id,
    });
    return this.sanitize(user);
  }

  async assignRoles(id: string, dto: AssignRolesDto, actorUserId?: string) {
    await this.findById(id);
    const roleCodes = Array.from(new Set(dto.roles));
    const roles = await this.prisma.role.findMany({ where: { code: { in: roleCodes } } });
    if (roles.length !== roleCodes.length) {
      throw new BadRequestException("One or more roles do not exist in the role catalog.");
    }
    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      ...roles.map((role) =>
        this.prisma.userRole.create({
          data: { userId: id, roleId: role.id, assignedById: actorUserId },
        }),
      ),
    ]);
    await this.audit.log({
      actorUserId,
      action: "USER_ROLES_ASSIGNED",
      entityType: "user",
      entityId: id,
      metadata: { roles: roleCodes },
    });
    return this.findById(id);
  }

  async remove(id: string, actorUserId?: string): Promise<void> {
    await this.findById(id);
    await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.DELETED, deletedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: "USER_DELETED",
      entityType: "user",
      entityId: id,
    });
  }

  private sanitize<T extends { passwordHash?: string | null; roles?: Array<{ role: { code: RoleCode } }> }>(user: T) {
    const { passwordHash: _passwordHash, roles, ...safeUser } = user;
    return {
      ...safeUser,
      roles: roles?.map((item) => item.role.code) ?? [],
    };
  }
}
