import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, TopicStatus } from "../../../generated/prisma/client";
import { PaginationQueryDto } from "../../common/dto/pagination-query.dto";
import { toSlug } from "../../common/utils/slug";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { CreateTopicDto } from "./dto/create-topic.dto";
import { UpdateTopicDto } from "./dto/update-topic.dto";

@Injectable()
export class TopicsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(query: PaginationQueryDto & { courseId?: string }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.TopicWhereInput = {
      courseId: query.courseId,
      archivedAt: null,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { slug: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.topic.findMany({
        where,
        include: { course: true },
        orderBy: [{ courseId: "asc" }, { sortOrder: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.topic.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findById(id: string) {
    const topic = await this.prisma.topic.findUnique({
      where: { id },
      include: { course: true },
    });
    if (!topic) throw new NotFoundException("Topic not found.");
    return topic;
  }

  async create(dto: CreateTopicDto, actorUserId?: string) {
    const slug = dto.slug ? toSlug(dto.slug) : toSlug(dto.title);
    const existing = await this.prisma.topic.findUnique({
      where: { courseId_slug: { courseId: dto.courseId, slug } },
    });
    if (existing) throw new ConflictException("Topic slug already exists in this course.");
    const topic = await this.prisma.topic.create({
      data: {
        courseId: dto.courseId,
        title: dto.title,
        slug,
        description: dto.description,
        sortOrder: dto.sortOrder,
        status: dto.status ?? TopicStatus.ACTIVE,
        archivedAt: dto.status === TopicStatus.ARCHIVED ? new Date() : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "TOPIC_CREATED",
      entityType: "topic",
      entityId: topic.id,
      metadata: { courseId: dto.courseId },
    });
    return topic;
  }

  async update(id: string, dto: UpdateTopicDto, actorUserId?: string) {
    await this.findById(id);
    const topic = await this.prisma.topic.update({
      where: { id },
      data: {
        courseId: dto.courseId,
        title: dto.title,
        slug: dto.slug ? toSlug(dto.slug) : undefined,
        description: dto.description,
        sortOrder: dto.sortOrder,
        status: dto.status,
        archivedAt: dto.status === TopicStatus.ARCHIVED ? new Date() : dto.status ? null : undefined,
      },
    });
    await this.audit.log({
      actorUserId,
      action: "TOPIC_UPDATED",
      entityType: "topic",
      entityId: id,
    });
    return topic;
  }

  async archive(id: string, actorUserId?: string): Promise<void> {
    await this.findById(id);
    await this.prisma.topic.update({
      where: { id },
      data: { status: TopicStatus.ARCHIVED, archivedAt: new Date() },
    });
    await this.audit.log({
      actorUserId,
      action: "TOPIC_ARCHIVED",
      entityType: "topic",
      entityId: id,
    });
  }
}
