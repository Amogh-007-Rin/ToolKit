import { NextResponse } from "next/server";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { toolCreateSchema } from "@/types/validation";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const userId = await getSessionUserId();
    if (!userId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const parsed = toolCreateSchema.safeParse(await req.json());
    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message ?? "Invalid input" },
            { status: 400 }
        );
    }

    const collection = await prisma.collection.findFirst({
        where: { id, userId },
        select: { id: true },
    });

    if (!collection) {
        return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const { name, icon, logoUrl } = parsed.data;
    const link = parsed.data.link?.trim() || null;

    const tool = await prisma.tool.create({
        data: {
            name,
            link,
            icon,
            logoUrl: logoUrl ?? null,
            collectionId: id,
        },
    });

    return NextResponse.json({ tool }, { status: 201 });
}
