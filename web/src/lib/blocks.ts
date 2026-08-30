import prisma from "@/db";

export async function blockedUserIds(userId: string): Promise<string[]> {
  const rows = await prisma.block.findMany({
    where: { OR: [{ blockerId: userId }, { blockedId: userId }] },
    select: { blockerId: true, blockedId: true },
  });
  return [...new Set(rows.map((row) => row.blockerId === userId ? row.blockedId : row.blockerId))];
}

export async function usersBlockEachOther(a: string, b: string): Promise<boolean> {
  return Boolean(await prisma.block.findFirst({ where: { OR: [{ blockerId: a, blockedId: b }, { blockerId: b, blockedId: a }] }, select: { id: true } }));
}
