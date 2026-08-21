'use client'

import PostDetailCard from "@/components/ui/PostDetailCard";
import type { Post } from "@/types/posts";

const post: Post = {
  id: "test-post",
  caption:
    "This is a test caption that spans multiple lines to verify the caption card height on mobile viewports. It should remain fully visible without collapsing.",
  tags: ["test", "mobile"],
  media: [{ id: "m1", url: "/authpage-image.jpg", type: "image", order: 0 }],
  author: { id: "u1", name: "Test User", image: null, tag: "testuser" },
  likeCount: 3,
  commentCount: 0,
  savedCount: 1,
  likedByMe: false,
  savedByMe: false,
  mine: true,
  createdAt: new Date().toISOString(),
};

export default function TestPostCardPage() {
  return (
    <div className="h-dvh w-full bg-background">
      <PostDetailCard
        post={post}
        onClose={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
        onLiked={() => {}}
        onSaved={() => {}}
        onCommented={() => {}}
      />
    </div>
  );
}
