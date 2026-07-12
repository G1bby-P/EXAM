import { Injectable, Logger } from "@nestjs/common";
import { Prisma } from "../../../generated/prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { PrismaService } from "../database/prisma.service";

export interface CreateAuditLogInput {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string | string[];
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          ipAddress: input.ipAddress,
          userAgent: Array.isArray(input.userAgent) ? input.userAgent.join(" ") : input.userAgent,
          metadata: input.metadata,
        },
      });
    } catch (error) {
      this.logger.error("Failed to persist audit log.", error instanceof Error ? error.stack : String(error));
    }
  }

  async list(query: PaginationQueryDto & { action?: string; entityType?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.AuditLogWhereInput = {
      action: query.action ? { contains: query.action, mode: "insensitive" } : undefined,
      entityType: query.entityType ? { equals: query.entityType } : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page, limit };
  }
}
