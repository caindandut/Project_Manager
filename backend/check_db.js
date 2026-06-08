const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.workspaceMember.findMany();
  console.log('MEMBERS:', m);
  const w = await prisma.workspace.findMany();
  console.log('WORKSPACES:', w);
}
main().finally(() => prisma.$disconnect());
