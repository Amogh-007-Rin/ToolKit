"use client";

import Image from "next/image";
import { Search, UsersRound } from "lucide-react";
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
  const directRooms = rooms.filter((room) => room.kind === "direct");
  const groupRooms = rooms.filter((room) => room.kind !== "direct");

  const renderRoom = (room: RoomListItem) => {
    const memberId = otherMember(room, meId);
    const contact = memberId ? contacts.get(memberId) : undefined;
    const active = room.id === activeRoomId;
    const label = room.kind === "direct"
      ? contact?.name ?? contact?.tag ?? "Unknown user"
      : room.name ?? "Group conversation";

    return (
      <button
        key={room.id}
        onClick={() => onSelect(room.id)}
        className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all ${
          active
            ? "border-primary bg-primary shadow-sm"
            : "border-transparent hover:border-border/70 hover:bg-card/70"
        }`}
      >
        <div className="relative">
          {room.kind === "direct" ? (
            <Avatar contact={contact} size={42} />
          ) : (
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <UsersRound size={19} />
            </div>
          )}
          {room.unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`truncate text-sm font-semibold ${active ? "text-primary-foreground" : "text-foreground"}`}>{label}</p>
            {room.lastMessage ? (
              <span className={`shrink-0 text-[10px] ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>
                {timeAgo(room.lastMessage.createdAt)}
              </span>
            ) : null}
          </div>
          <p className={`mt-0.5 truncate text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
            {room.lastMessage
              ? room.unreadCount > 1
                ? `${room.unreadCount} new messages`
                : `${room.lastMessage.senderId === meId ? "You: " : ""}${room.lastMessage.content}`
              : "No messages yet"}
          </p>
        </div>
      </button>
    );
  };

  return (
    <aside className={`${activeRoomId ? "hidden md:flex" : "flex"} message-room-list h-full w-full shrink-0 flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-sidebar/75 p-3 shadow-sm backdrop-blur-xl md:w-[17.5rem]`}>
      <div className="space-y-4 px-1 pb-3">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Inbox</p>
            <div className="mt-1 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">Messages</h2>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                {rooms.length}
              </span>
            </div>
          </div>
        </div>
        <label className="flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-input/75 px-3 text-muted-foreground">
          <Search size={15} />
          <input
            aria-label="Search conversations"
            placeholder="Search"
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
      </div>
      <div data-lenis-prevent className="thin-scrollbar flex-1 space-y-5 overflow-y-auto px-1 pb-2">
        {rooms.length === 0 ? (
          <p className="rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
            No conversations yet. Open someone&apos;s profile and press Message.
          </p>
        ) : (
          <>
            {groupRooms.length > 0 ? (
              <section>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Groups</p>
                <div className="space-y-1">{groupRooms.map(renderRoom)}</div>
              </section>
            ) : null}
            {directRooms.length > 0 ? (
              <section>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">People</p>
                <div className="space-y-1">{directRooms.map(renderRoom)}</div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
