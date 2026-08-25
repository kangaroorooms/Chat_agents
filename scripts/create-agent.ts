import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = 'Agent@123';
  const hashedPassword = await bcrypt.hash(password, 10);

  const agent = await prisma.user.create({
    data: {
      username: 'agent1',
      email: 'agent1@test.com',
      password: hashedPassword,
      role: UserRole.AGENT,
    },
  });

  console.log('Agent created:', agent);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });