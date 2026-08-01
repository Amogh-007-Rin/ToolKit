import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string; toolId: string }> }
) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, toolId } = await params;

    const collection = await prisma.collection.findFirst({
        where: { id, userId },
        select: { id: true },
    });

    if (!collection) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const result = await prisma.tool.deleteMany({
        where: { id: toolId, collectionId: id },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
}
