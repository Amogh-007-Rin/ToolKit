"use client";

import Image from "next/image";
import { timeAgo } from "@/lib/timeAgo";
import { type Contact, type RoomListItem } from "@/services/messaging";

function Avatar({ contact, size = 40 }: { contact?: Contact | null; size?: number }) {
  if (contact?.image) {
    return (
      <Image
        src={contact.image}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="rounded-full object-cover shrink-0"
      />
    );
  }
  const initials = (contact?.name ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-medium shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}

export function otherMember(room: RoomListItem, meId: string): string | undefined {
  return room.members.find((memberId) => memberId !== meId);
}

export default function RoomList({
  rooms,
  contacts,
  meId,
  activeRoomId,
  onSelect,
}: {
  rooms: RoomListItem[];
  contacts: Map<string, Contact>;
  meId: string;
  activeRoomId: string | null;
  onSelect: (roomId: string) => void;
}) {
  return (
    <aside className="w-full md:w-[300px] shrink-0 h-full bg-card rounded-3xl flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Messages</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <p className="text-muted-foreground text-sm p-5">
            No conversations yet. Open someone&apos;s profile and press Message.
          </p>
        ) : (
          rooms.map((room) => {
            const memberId = otherMember(room, meId);
            const contact = memberId ? contacts.get(memberId) : undefined;
            const active = room.id === activeRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelect(room.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors ${
                  active ? "bg-accent" : "hover:bg-muted/50"
                }`}
              >
                <Avatar contact={contact} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-foreground font-medium truncate">
                      {contact?.name ?? contact?.tag ?? "Unknown user"}
                    </p>
                    {room.lastMessage ? (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timeAgo(room.lastMessage.createdAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {room.lastMessage
                      ? `${room.lastMessage.senderId === meId ? "You: " : ""}${room.lastMessage.content}`
                      : "No messages yet"}
                  </p>
                </div>
                {room.unreadCount > 0 ? (
                  <span className="shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {room.unreadCount > 99 ? "99+" : room.unreadCount}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
