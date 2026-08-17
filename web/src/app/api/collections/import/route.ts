import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { collectionId?: string; toolId?: string; destinationCollectionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!body.collectionId) {
    return NextResponse.json({ error: "Collection is required" }, { status: 400 });
  }

  const source = await prisma.collection.findFirst({
    where: { id: body.collectionId, showcased: true },
    include: { tools: true },
  });
  if (!source) {
    return NextResponse.json({ error: "Showcased collection not found" }, { status: 404 });
  }

  if (body.toolId) {
    if (!body.destinationCollectionId) {
      return NextResponse.json({ error: "Destination collection is required" }, { status: 400 });
    }
    const destination = await prisma.collection.findFirst({
      where: { id: body.destinationCollectionId, userId },
      select: { id: true },
    });
    const tool = source.tools.find((item) => item.id === body.toolId);
    if (!destination || !tool) {
      return NextResponse.json({ error: "Tool or destination not found" }, { status: 404 });
    }
    const imported = await prisma.tool.create({
      data: {
        collectionId: destination.id,
        name: tool.name,
        link: tool.link,
        icon: tool.icon,
        logoUrl: tool.logoUrl,
        description: tool.description,
        reason: tool.reason,
      },
    });
    return NextResponse.json({ tool: imported }, { status: 201 });
  }

  const existingImport = await prisma.collection.findFirst({
    where: { userId, importedFromId: source.id },
    include: { tools: true },
  });
  if (existingImport) {
    return NextResponse.json(
      { error: "You have already imported this collection", collection: existingImport },
      { status: 409 },
    );
  }

  const imported = await prisma.collection.create({
    data: {
      userId,
      title: source.title,
      description: source.description,
      importedFromId: source.id,
      tools: {
        create: source.tools.map(({ name, link, icon, logoUrl, description, reason }) => ({
          name,
          link,
          icon,
          logoUrl,
          description,
          reason,
        })),
      },
    },
    include: { tools: true },
  });
  return NextResponse.json({ collection: imported }, { status: 201 });
}
