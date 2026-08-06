export interface PostMedia {
  id: string;
  url: string;
  type: string;
  order: number;
}

export interface PostUser {
  id: string;
  name: string | null;
  image: string | null;
  tag: string | null;
}

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  mine: boolean;
  user: PostUser;
}

export interface Post {
  id: string;
  caption: string;
  tags: string[];
  media: PostMedia[];
  author: { name: string | null; tag: string | null };
  likeCount: number;
  commentCount: number;
  savedCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  mine: boolean;
  createdAt: string;
}
