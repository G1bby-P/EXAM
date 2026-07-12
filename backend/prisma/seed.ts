import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";
import { PrismaClient, RoleCode, UserStatus } from "../generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0 || value.startsWith("replace-with-")) {
    throw new Error(`${name} is required to run the seed.`);
  }
  return value;
}

async function main(): Promise<void> {
  const password = requiredEnv("SEED_ADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS ?? 12));

  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: RoleCode.ADMIN },
      create: { code: RoleCode.ADMIN, name: "Administrator", description: "Full system access." },
      update: { name: "Administrator", description: "Full system access." },
    }),
    prisma.role.upsert({
      where: { code: RoleCode.REVIEWER },
      create: { code: RoleCode.REVIEWER, name: "Reviewer", description: "Can review answers and results." },
      update: { name: "Reviewer", description: "Can review answers and results." },
    }),
    prisma.role.upsert({
      where: { code: RoleCode.STUDENT },
      create: { code: RoleCode.STUDENT, name: "Student", description: "Can take assigned exams." },
      update: { name: "Student", description: "Can take assigned exams." },
    }),
  ]);

  const adminRole = roles.find((role) => role.code === RoleCode.ADMIN);
  if (!adminRole) throw new Error("Admin role was not created.");
  const studentRole = roles.find((role) => role.code === RoleCode.STUDENT);
  if (!studentRole) throw new Error("Student role was not created.");

  async function upsertUserWithRole(input: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
    roleId: string;
    assignedById?: string;
  }) {
    const user = await prisma.user.upsert({
      where: { emailNormalized: normalizeEmail(input.email) },
      create: {
        email: input.email,
        emailNormalized: normalizeEmail(input.email),
        passwordHash: input.passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        status: UserStatus.ACTIVE,
      },
      update: {
        passwordHash: input.passwordHash,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
    });

    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: input.roleId } },
      create: { userId: user.id, roleId: input.roleId, assignedById: input.assignedById ?? user.id },
      update: { assignedById: input.assignedById ?? user.id },
    });

    return user;
  }

  const admin = await upsertUserWithRole({
    email: "admin@exam.local",
    firstName: "System",
    lastName: "Admin",
    passwordHash,
    roleId: adminRole.id,
  });

  const testAdminPassword = requiredEnv("SEED_TEST_ADMIN_PASSWORD");
  const testStudentPassword = requiredEnv("SEED_TEST_STUDENT_PASSWORD");
  const testAdminPasswordHash = await bcrypt.hash(testAdminPassword, Number(process.env.BCRYPT_ROUNDS ?? 12));
  const testStudentPasswordHash = await bcrypt.hash(testStudentPassword, Number(process.env.BCRYPT_ROUNDS ?? 12));

  const testAdmin = await upsertUserWithRole({
    email: "admin@test.com",
    firstName: "Admin",
    lastName: "Test",
    passwordHash: testAdminPasswordHash,
    roleId: adminRole.id,
    assignedById: admin.id,
  });

  const testStudent = await upsertUserWithRole({
    email: "alumno@test.com",
    firstName: "Alumno",
    lastName: "Test",
    passwordHash: testStudentPasswordHash,
    roleId: studentRole.id,
    assignedById: admin.id,
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: admin.id,
      action: "BACKEND_SEED",
      entityType: "user",
      entityId: admin.id,
      metadata: { email: admin.email },
    },
  });

  console.log("Backend seed completed.");
  console.log("Admin user: admin@exam.local");
  console.log("Test admin user:", testAdmin.email);
  console.log("Test student user:", testStudent.email);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
