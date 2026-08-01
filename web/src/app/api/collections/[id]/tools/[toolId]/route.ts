import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { toolCreateSchema } from "@/types/validation";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; toolId: string }> }
) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, toolId } = await params;

    const body = await req.json();
    const parsed = toolCreateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 }
        );
    }

    const { name, link, icon, logoUrl } = parsed.data;

    const collection = await prisma.collection.findFirst({
        where: { id, userId },
        select: { id: true },
    });

    if (!collection) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const result = await prisma.tool.updateMany({
        where: { id: toolId, collectionId: id },
        data: {
            name,
            link: link?.trim() ? link.trim() : null,
            icon,
            logoUrl: logoUrl ?? null,
        },
    });

    if (result.count === 0) {
        return NextResponse.json({ error: "Tool not found" }, { status: 404 });
    }

    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    return NextResponse.json({ tool });
}

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
