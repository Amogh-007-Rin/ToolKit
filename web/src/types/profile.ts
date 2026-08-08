export interface EditableProfile {
  name: string;
  bio: string;
  role: string;
  location: string;
  skills: string[];
  tag: string | null;
}

export interface ProfileData extends EditableProfile {
  image: string | null;
  banner: string | null;
  followers: number;
  following: number;
}
