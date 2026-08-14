"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  createDirectRoom,
  getMessages,
  listRooms,
  markRead,
  messagingSocket,
  type ConnStatus,
  type Contact,
  type Message,
  type RoomListItem,
} from "@/services/messaging";
import RoomList from "./_components/RoomList";
import Conversation, { type OutgoingMedia } from "./_components/Conversation";

interface TempMessage {
  tempId: string;
  content: string;
  attachments: {
    key: string | null;
    kind: "image" | "video";
    name?: string | null;
    previewUrl: string;
  }[];
  createdAt: string;
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesApp />
    </Suspense>
  );
}

function MessagesApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get("room");
  const userParam = searchParams.get("user");
  const { data: session } = useSession();
  const meId = session?.user?.id ?? "";

  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [contacts, setContacts] = useState<Map<string, Contact>>(new Map());
  const [activeRoomId, setActiveRoomId] = useState<string | null>(roomParam);
  const [messagesByRoom, setMessagesByRoom] = useState<Record<string, Message[]>>({});
  const [tempMessages, setTempMessages] = useState<TempMessage[]>([]);
  const [typingByRoom, setTypingByRoom] = useState<Record<string, Record<string, boolean>>>({});
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<ConnStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  const activeRoomRef = useRef<string | null>(activeRoomId);
  const lastHandledUserRef = useRef<string | null>(null);
  const typingTimersRef = useRef<Record<string, Record<string, number>>>({});

  const TYPING_EXPIRE_MS = 7000;

  const seedPresenceFromRooms = (roomList: RoomListItem[]) => {
    const online = new Set<string>();
    const lastSeen: Record<string, string> = {};
    for (const room of roomList) {
      for (const memberId of room.members) {
        const status = room.memberLastSeen[memberId];
        if (status === null) {
          online.add(memberId);
        } else if (status !== undefined) {
          lastSeen[memberId] = status;
        }
      }
    }
    setOnlineUsers(online);
    setLastSeenMap(lastSeen);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { rooms: next } = await listRooms();
        if (!cancelled) {
          setRooms(next);
          seedPresenceFromRooms(next);
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load conversations");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (rooms.length === 0) {
      return;
    }
    const ids = [...new Set(rooms.flatMap((room) => room.members))];
    if (ids.length === 0) {
      return;
    }
    let cancelled = false;
    fetch(`/api/messages/contacts?ids=${encodeURIComponent(ids.join(","))}`)
      .then((res) => res.json())
      .then(({ users }: { users: Contact[] }) => {
        if (!cancelled) {
          setContacts(new Map(users.map((user) => [user.id, user])));
        }
      })
      .catch(() => {
        // contacts are a display nicety; ignore failures
      });
    return () => {
      cancelled = true;
    };
  }, [rooms]);

  useEffect(() => {
    activeRoomRef.current = activeRoomId;
    if (!activeRoomId) {
      return;
    }
    const roomId = activeRoomId;
    let cancelled = false;
    async function load() {
      try {
        const { messages: next } = await getMessages(roomId, null, 50);
        if (!cancelled) {
          setMessagesByRoom((prev) => ({ ...prev, [roomId]: next }));
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load messages");
        }
      }
    }
    load();
    messagingSocket.send({ type: "joinRoom", roomId });
    markRead(roomId)
      .then(() =>
        setRooms((prev) =>
          prev.map((room) => (room.id === roomId ? { ...room, unreadCount: 0 } : room)),
        ),
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeRoomId]);

  useEffect(() => {
    if (!meId) {
      return;
    }
    const unsubStatus = messagingSocket.onStatus(setStatus);
    const unsubEvent = messagingSocket.onEvent((event) => {
      if (event.type === "message") {
        const messageRoomId = event.message.roomId;
        setRooms((prev) =>
          prev.map((room) =>
            room.id === messageRoomId
              ? {
                  ...room,
                  lastMessage: {
                    id: event.message.id,
                    senderId: event.message.senderId,
                    content: event.message.content || "[media]",
                    createdAt: event.message.createdAt,
                  },
                  unreadCount:
                    activeRoomRef.current === messageRoomId ? 0 : room.unreadCount + 1,
                }
              : room,
          ),
        );
        if (activeRoomRef.current === messageRoomId) {
          setMessagesByRoom((prev) => {
            const current = prev[messageRoomId] ?? [];
            if (current.some((message) => message.id === event.message.id)) {
              return prev;
            }
            return { ...prev, [messageRoomId]: [...current, event.message] };
          });
          markRead(messageRoomId).catch(() => {});
        }
      } else if (event.type === "messageAck") {
        setTempMessages((prev) =>
          prev.filter((temp) => temp.tempId !== event.tempId),
        );
        if (!event.delivered) {
          setError(event.error ?? "Message failed to send");
        }
      } else if (event.type === "typingStart") {
        setTypingByRoom((prev) => ({
          ...prev,
          [event.roomId]: { ...(prev[event.roomId] ?? {}), [event.userId]: true },
        }));
        const roomTimers = typingTimersRef.current[event.roomId];
        if (roomTimers?.[event.userId] !== undefined) {
          window.clearTimeout(roomTimers[event.userId]);
        }
        const timer = window.setTimeout(() => {
          setTypingByRoom((prev) => {
            const users = { ...(prev[event.roomId] ?? {}) };
            delete users[event.userId];
            return { ...prev, [event.roomId]: users };
          });
        }, TYPING_EXPIRE_MS);
        typingTimersRef.current[event.roomId] = {
          ...(typingTimersRef.current[event.roomId] ?? {}),
          [event.userId]: timer,
        };
      } else if (event.type === "typingStop") {
        setTypingByRoom((prev) => {
          const users = { ...(prev[event.roomId] ?? {}) };
          delete users[event.userId];
          return { ...prev, [event.roomId]: users };
        });
        const roomTimers = typingTimersRef.current[event.roomId];
        if (roomTimers?.[event.userId] !== undefined) {
          window.clearTimeout(roomTimers[event.userId]);
          const next = { ...roomTimers };
          delete next[event.userId];
          typingTimersRef.current[event.roomId] = next;
        }
      } else if (event.type === "error") {
        setError(event.message);
      } else if (event.type === "userOnline") {
        setOnlineUsers((prev) => new Set(prev).add(event.userId));
      } else if (event.type === "userOffline") {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(event.userId);
          return next;
        });
        setLastSeenMap((prev) => ({ ...prev, [event.userId]: event.lastSeenAt }));
      } else if (event.type === "connect") {
        async function reload() {
          try {
            const { rooms: next } = await listRooms();
            setRooms(next);
            seedPresenceFromRooms(next);
            const roomId = activeRoomRef.current;
            if (roomId) {
              messagingSocket.send({ type: "joinRoom", roomId });
              const { messages } = await getMessages(roomId, null, 50);
              setMessagesByRoom((prev) => ({ ...prev, [roomId]: messages }));
            }
          } catch {
            // leave state as-is; next reconnect will retry
          }
        }
        reload();
      }
    });
    messagingSocket.connect();
    return () => {
      Object.values(typingTimersRef.current).forEach((roomTimers) =>
        Object.values(roomTimers).forEach((timer) => window.clearTimeout(timer)),
      );
      typingTimersRef.current = {};
      unsubStatus();
      unsubEvent();
      messagingSocket.disconnect();
    };
  }, [meId]);

  useEffect(() => {
    if (!userParam || lastHandledUserRef.current === userParam) {
      return;
    }
    lastHandledUserRef.current = userParam;
    const targetUserId = userParam;
    async function open() {
      try {
        const { room } = await createDirectRoom(targetUserId);
        const { rooms: next } = await listRooms();
        setRooms(next);
        setActiveRoomId(room.id);
        router.replace(`/dashboard/messages?room=${room.id}`);
      } catch {
        setError("Could not start this conversation");
      }
    }
    open();
  }, [userParam, router]);

  const sendMessage = useCallback(
    (content: string, attachments: OutgoingMedia[]) => {
      const roomId = activeRoomRef.current;
      if (!roomId) {
        return;
      }
      const tempId = crypto.randomUUID();
      const now = new Date().toISOString();
      setTempMessages((prev) => [
        ...prev,
        {
          tempId,
          content,
          attachments: attachments.map(({ key, kind, name, previewUrl }) => ({
            key,
            kind,
            name,
            previewUrl,
          })),
          createdAt: now,
        },
      ]);
      setRooms((prev) =>
        prev.map((room) =>
          room.id === roomId
            ? {
                ...room,
                lastMessage: {
                  id: tempId,
                  senderId: meId,
                  content: content || "[media]",
                  createdAt: now,
                },
                unreadCount: 0,
              }
            : room,
        ),
      );
      messagingSocket.send({
        type: "sendMessage",
        roomId,
        tempId,
        content,
        attachments: attachments.map(({ key, kind, name }) => ({ key, kind, name })),
      });
    },
    [meId],
  );

  const sendTyping = useCallback((typing: boolean, roomId: string) => {
    messagingSocket.send({ type: typing ? "typingStart" : "typingStop", roomId });
  }, []);

  const openRoom = useCallback(
    (roomId: string) => {
      setActiveRoomId(roomId);
      router.replace(`/dashboard/messages?room=${roomId}`);
    },
    [router],
  );

  const activeRoom =
    rooms.find((room) => room.id === activeRoomId) ??
    (activeRoomId
      ? {
          id: activeRoomId,
          kind: "direct",
          name: null,
          createdBy: meId,
          createdAt: new Date().toISOString(),
          members: [],
          lastMessage: null,
          unreadCount: 0,
          memberLastSeen: {},
        }
      : null);
  const activeMemberId = activeRoom?.members.find((memberId) => memberId !== meId);
  const activeContact = activeMemberId ? contacts.get(activeMemberId) : undefined;
  const activeTypingUserIds = activeRoomId
    ? Object.keys(typingByRoom[activeRoomId] ?? {}).filter((userId) => userId !== meId)
    : [];

  return (
    <div className="flex h-full min-h-0 w-full gap-2 md:flex-row md:gap-4">
      <RoomList
        rooms={rooms}
        contacts={contacts}
        meId={meId}
        activeRoomId={activeRoomId}
        onSelect={openRoom}
      />
      <div className={`${activeRoomId ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-1`}>
        <Conversation
          room={activeRoom}
          contact={activeContact}
          meId={meId}
          messages={activeRoomId ? (messagesByRoom[activeRoomId] ?? []) : []}
          tempMessages={tempMessages}
          typingUsers={activeTypingUserIds}
          status={status}
          error={error}
          onlineUsers={onlineUsers}
          lastSeenMap={lastSeenMap}
          onSend={sendMessage}
          onTypingChange={sendTyping}
        />
      </div>
    </div>
  );
}
