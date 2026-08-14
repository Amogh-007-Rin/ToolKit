"use client";

import Image from "next/image";
import { timeAgo } from "@/lib/timeAgo";
import { type Contact, type RoomListItem } from "@/services/messaging";

function Avatar({ contact, size = 40 }: { contact?: Contact | null; size?: number }) {
  if (contact?.image) {
    return (
      <div
        className="rounded-full overflow-hidden shrink-0 relative"
        style={{ width: size, height: size }}
      >
        <Image
          src={contact.image}
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
      </div>
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
    <aside className={`${activeRoomId ? "hidden md:flex" : "flex"} h-full w-full shrink-0 flex-col overflow-hidden rounded-3xl bg-card md:w-75`}>
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-xl font-bold text-foreground">Messages</h2>
      </div>
      <div data-lenis-prevent className="flex-1 overflow-y-auto">
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
                      ? room.unreadCount === 0
                        ? `${room.lastMessage.senderId === meId ? "You: " : ""}${room.lastMessage.content}`
                        : room.unreadCount === 1
                          ? `${room.lastMessage.senderId === meId ? "You: " : ""}${room.lastMessage.content}`
                          : room.unreadCount >= 4
                            ? "4+ new messages"
                            : `${room.unreadCount} new messages`
                      : "No messages yet"}
                  </p>
                </div>
                {room.unreadCount > 0 ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-black dark:bg-white shrink-0" />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
