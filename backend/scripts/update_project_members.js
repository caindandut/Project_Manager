const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.projectMember.updateMany({
    data: {
      status: 'ACCEPTED',
    },
  });
  console.log(`Updated ${count.count} project members to ACCEPTED`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
