"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  BriefcaseBusiness,
  Star,
  UserPlus,
  Check,
  MessageCircle,
  Loader2,
  UserRound,
  Play,
} from "lucide-react";
import Multibutton from "@/app/dashboard/_components/buttons/Multibutton";
import SkillTag from "@/components/ui/tags/SkillTag";
import PostDetailCard from "@/components/ui/PostDetailCard";
import type { Post } from "@/types/posts";

interface PublicUser {
  id: string;
  name: string | null;
  image: string | null;
  banner: string | null;
  tag: string | null;
  bio: string | null;
  role: string | null;
  location: string | null;
  skills: string[];
  followers: number;
  following: number;
  followedByMe: boolean;
  isMe: boolean;
}

export default function VisiterProfile() {
  const params = useParams<{ tag: string }>();
  const router = useRouter();
  const tag = params.tag;

  const [user, setUser] = useState<PublicUser | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/users/${encodeURIComponent(tag)}`);
        if (res.status === 404) {
          if (!cancelled) setNotFound(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setUser(data.user);
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tag]);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/posts?authorId=${uid}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setPosts(data.posts ?? []);
        }
      } catch {
        // silently fail
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    const previous = user.followedByMe;
    setUser((u) =>
      u ? { ...u, followedByMe: !u.followedByMe, followers: u.followers + (u.followedByMe ? -1 : 1) } : u
    );
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(tag)}/follow`, { method: "POST" });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setUser((u) => (u ? { ...u, followedByMe: data.followed, followers: data.followers } : u));
    } catch {
      setUser((u) =>
        u ? { ...u, followedByMe: previous, followers: u.followers + (previous ? 1 : -1) } : u
      );
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !user) {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center gap-6">
        <button
          onClick={() => router.back()}
          className="fixed top-6 left-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer z-10 shadow-2xs"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
          <UserRound size={24} className="text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">User not found</p>
        <button
          onClick={() => router.push("/dashboard/explore")}
          className="h-10 px-6 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background relative">
      <button
        onClick={() => router.back()}
        className="fixed top-6 left-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer z-10 shadow-2xs"
      >
        <ArrowLeft size={20} className="text-foreground" />
      </button>

      <div className="profile-container w-full min-h-screen flex flex-col">
        <div className="banner-container w-full h-[25vh] bg-linear-to-br from-primary/20 via-shade-background to-card relative">
          {user.banner ? (
            <Image
              src={user.banner}
              alt="Banner"
              fill
              className="object-cover"
              unoptimized
              loading="eager"
            />
          ) : null}
        </div>

        <div className="profile-info w-full h-[35vh] relative">
          <div className="w-40 h-40 flex flex-col rounded-full items-center justify-center absolute -top-20 left-25 z-10">
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-background bg-shade-background">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={user.name ?? "User"}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-5xl font-bold text-foreground">
                    {(user.name || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="part-1 w-full h-[30%] flex flex-col justify-center items-end gap-2 px-10">
            <div className="flex items-center gap-2 px-1.5">
              <p className="text-foreground">Current Role</p>
              <BriefcaseBusiness size={18} className="text-foreground" />
            </div>
            <span className="px-4 py-1 rounded-full bg-shade-background flex items-center justify-center">
              <p className="text-foreground font-bold">{user.role || "..."}</p>
            </span>
          </div>

          <div className="part-2 h-[27%] flex items-center">
            <div className="profile-name w-full h-full relative flex items-center">
              <p className="absolute left-27 top-4 text-2xl font-bold text-foreground">
                {user.name || "Unnamed User"}
              </p>
              <p className="absolute left-27 top-12 text-sm font-light text-foreground">
                {user.tag ? `@${user.tag}` : "@toolkit-tag"}
              </p>
            </div>
          </div>

          <div className="part-3 h-[10%] flex items-center">
            <div className="profile-occupation w-full h-full relative flex items-center">
              <p className="absolute left-27 text-foreground">
                {user.bio || "No bio yet"}
              </p>
              <p className="absolute right-10 text-sm text-muted-foreground">
                {user.followers} followers · {user.following} following
              </p>
            </div>
          </div>

          <div className="part-4 h-[10%] flex items-center">
            <div className="profile-location w-[50%] h-full relative flex items-center">
              <p className="absolute left-27 text-foreground">
                {user.location || "No location"}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-10 w-[50%] h-full">
              <p className="text-foreground">Skills</p>
              <Star size={16} className="text-foreground" />
            </div>
          </div>

          <div className="part-5 w-full h-[28%] flex items-center">
            <div className="left-part w-[30%] h-full flex items-center relative">
              {user.isMe ? (
                <button
                  onClick={() => router.push("/profile")}
                  className="absolute left-27 h-[30%] rounded-4xl bg-card flex items-center justify-center px-5 cursor-pointer"
                >
                  <p className="text-foreground">This is you</p>
                </button>
              ) : (
                <div className="absolute left-27 h-full flex items-center gap-2">
                  <Multibutton
                    tag="follow-profile"
                    label={user.followedByMe ? "Following" : "Follow"}
                    icon={user.followedByMe ? Check : UserPlus}
                    onClick={toggleFollow}
                    className={`h-[30%] rounded-4xl ${
                      user.followedByMe ? "bg-foreground text-card" : ""
                    }`}
                    iconClassName={user.followedByMe ? "text-card" : "text-foreground"}
                    textClassName={user.followedByMe ? "text-card" : "text-foreground"}
                  />
                  <Multibutton
                    tag="message-profile"
                    label="Message"
                    icon={MessageCircle}
                    onClick={() => router.push(`/dashboard/messages?user=${user.id}`)}
                    className="h-[30%] rounded-4xl bg-foreground text-card"
                    iconClassName="text-card"
                    textClassName="text-card"
                  />
                </div>
              )}
            </div>
            <div className="right-part w-[70%] h-full flex items-start justify-end px-10 py-2 gap-2">
              {user.skills.length > 0
                ? user.skills.map((skill) => <SkillTag key={skill} skill={skill} />)
                : <p className="text-muted-foreground text-sm">No skills added yet</p>}
            </div>
          </div>
        </div>

        <div className="part-3-post-navigator w-full py-4">
          {posts.length > 0 ? (
            <div className="w-full grid grid-cols-5 gap-1 p-1">
              {posts.map((post, index) => {
                const first = post.media[0];
                return (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="relative aspect-4/5 rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center cursor-pointer group"
                  >
                    {first?.type === "video" ? (
                      <>
                        <video src={first.url} className="w-full h-full object-cover" muted />
                        <Play size={20} className="absolute inset-0 m-auto text-white/90" fill="currentColor" />
                      </>
                    ) : first?.url ? (
                      <Image
                        src={first.url}
                        alt={post.caption || "Post"}
                        fill
                        sizes="40vw"
                        quality={100}
                        unoptimized
                        loading={index < 5 ? "eager" : "lazy"}
                        className="object-cover group-hover:opacity-90 transition-opacity"
                      />
                    ) : null}
                    {post.media.length > 1 && (
                      <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md bg-black/60 text-white text-xs flex items-center justify-center">
                        {post.media.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center justify-center gap-4 py-16">
              <div className="w-16 h-16 rounded-full border-2 border-dashed border-muted-foreground/40 flex items-center justify-center">
                <UserRound size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No posts yet</p>
            </div>
          )}
        </div>
      </div>

      {selectedPost && (
        <PostDetailCard
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          onEdit={() => setSelectedPost(null)}
          onDelete={() => setSelectedPost(null)}
          onLiked={(postId, liked) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, likedByMe: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
                  : p
              )
            )
          }
          onSaved={(postId, saved) =>
            setPosts((prev) =>
              prev.map((p) =>
                p.id === postId
                  ? { ...p, savedByMe: saved, savedCount: p.savedCount + (saved ? 1 : -1) }
                  : p
              )
            )
          }
          onCommented={(postId, count) =>
            setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, commentCount: count } : p)))
          }
        />
      )}
    </div>
  );
}
