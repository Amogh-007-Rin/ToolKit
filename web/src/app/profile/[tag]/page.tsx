import prisma from "@/db";
import { notFound } from "next/navigation";
import Image from "next/image";

interface Props {
  params: Promise<{ tag: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { tag } = await params;

  const user = await prisma.user.findUnique({
    where: { tag },
    select: {
      name: true,
      image: true,
      bio: true,
      role: true,
      location: true,
      skills: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="w-screen h-screen bg-background flex flex-col items-center justify-center gap-6">
      <div className="flex flex-col items-center gap-4 px-8 py-12 rounded-3xl bg-card border border-border">
        <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center overflow-hidden">
          {user.image ? (
            <Image src={user.image} alt={user.name ?? ""} width={96} height={96} className="w-full h-full object-cover" unoptimized />
          ) : (
            <span className="text-4xl font-bold text-muted-foreground">
              {user.name?.charAt(0)?.toUpperCase() ?? "?"}
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground">{user.name || "Unnamed User"}</p>
        {user.role && (
          <span className="px-4 py-1 rounded-full bg-shade-background text-foreground font-medium text-sm">
            {user.role}
          </span>
        )}
        {user.bio && <p className="text-muted-foreground text-sm text-center max-w-sm">{user.bio}</p>}
        {user.location && (
          <p className="text-muted-foreground text-xs">{user.location}</p>
        )}
        {user.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {user.skills.map((skill) => (
              <span
                key={skill}
                className="px-3 py-1 rounded-full bg-shade-background text-foreground text-xs"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="text-muted-foreground text-xs">ToolKit</p>
    </div>
  );
}
