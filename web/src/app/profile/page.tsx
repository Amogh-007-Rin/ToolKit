'use client'

import { useEffect, useState } from "react";
import BannerUploader from "@/components/forms/BannerUploader";
import ProfileImageUploader from "@/components/forms/ProfileImageUploader";
import { ArrowLeft, BriefcaseBusiness, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import Multibutton from "../dashboard/_components/buttons/Multibutton";
import SkillTag from "@/components/ui/tags/SkillTag";
import EditProfileCard from "./EditProfileCard";
import ProfileShareCard from "@/components/ui/cards/ProfileShareCard";
import type { EditableProfile, ProfileData } from "@/types/profile";
import PostNavigationBar from "@/components/ui/PostNavigationBar";

export default function ProfilePage() {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    bio: "",
    role: "",
    location: "",
    skills: [],
    tag: null,
    image: null,
    banner: null,
    followers: 0,
    following: 0
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok && !cancelled) {
          const data = await res.json();
          setProfile({
            name: data.user.name ?? "",
            bio: data.user.bio ?? "",
            role: data.user.role ?? "",
            location: data.user.location ?? "",
            skills: data.user.skills ?? [],
            tag: data.user.tag ?? null,
            image: data.user.image ?? null,
            banner: data.user.banner ?? null,
            followers: data.user.followers,
            following: data.user.following
          });
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleEditSubmit = async (data: EditableProfile) => {
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile({
          name: updated.user.name ?? "",
          bio: updated.user.bio ?? "",
          role: updated.user.role ?? "",
          location: updated.user.location ?? "",
          skills: updated.user.skills ?? [],
          tag: updated.user.tag ?? null,
          image: updated.user.image ?? null,
          banner: profile.banner,
          followers: profile.followers,
          following: profile.following,
        });
      }
    } catch {
      // silently fail
    }
    setIsEditing(false);
  };

  const handleMediaUploaded = async (kind: "profile" | "banner", key: string) => {
    try {
      const res = await fetch("/api/profile/media", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kind === "profile" ? { imageKey: key } : { bannerKey: key }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => ({
          ...prev,
          image: kind === "profile" ? data.user.image : prev.image,
          banner: kind === "banner" ? data.user.banner : prev.banner,
        }));
      }
    } catch {
      // silently fail; the object is uploaded but not linked
    }
  };

  return (
    <div className="min-h-screen w-full bg-background relative">
      <button
        onClick={() => router.back()}
        className="fixed top-6 left-6 w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors cursor-pointer z-10 shadow-2xs"
      >
        <ArrowLeft size={20} className="text-foreground" />
      </button>
      <div className="profile-container w-full min-h-screen flex flex-col">
        <div className="banner-container w-full h-[25vh] bg-gradient-to-br from-primary/20 via-shade-background to-card">
          <BannerUploader
            value={profile.banner}
            onUploaded={(key) => handleMediaUploaded("banner", key)}
          />
        </div>
        <div className="profile-info w-full h-[35vh] relative">
          <ProfileImageUploader
            value={profile.image}
            onUploaded={(key) => handleMediaUploaded("profile", key)}
          />
          <div className="part-1 w-full h-[30%] flex flex-col justify-center items-end gap-2 px-10">
            <div className="flex items-center gap-2 px-1.5">
              <p className="text-foreground">Current Role</p>
              <BriefcaseBusiness size={18} className="text-foreground" />
            </div>
            <span className="px-4 py-1 rounded-full bg-shade-background flex items-center justify-center">
              <p className="text-foreground font-bold">{loading ? "..." : (profile.role || "...")}</p>
            </span>
          </div>
          <div className="part-2 h-[27%] flex items-center">
            <div className="profile-name w-full h-full relative flex items-center">
              <p className="absolute left-27 top-4 text-2xl font-bold text-foreground">
                {loading ? "..." : (profile.name || "Your Name")}
              </p>
              <p className="absolute left-27 top-12 text-sm font-light text-foreground">
                {loading ? "..." : (profile.tag ? `@${profile.tag}` : "@toolkit-tag")}
              </p>
            </div>
          </div>
          <div className="part-3 h-[10%] flex items-center">
            <div className="profile-occupation w-full h-full relative flex items-center">
              <p className="absolute left-27 text-foreground">
                {loading ? "..." : (profile.bio || "Your bio")}
              </p>
              <p className="absolute right-10 text-sm text-muted-foreground">
                {loading ? "..." : `${profile.followers} followers · ${profile.following} following`}
              </p>
            </div>
          </div>
          <div className="part-4 h-[10%] flex items-center">
            <div className="profile-location w-[50%] h-full relative flex items-center">
              <p className="absolute left-27 text-foreground">
                {loading ? "..." : (profile.location || "Your location")}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 px-10 w-[50%] h-full">
              <p className="text-foreground">Skills</p>
              <Star size={16} className="text-foreground" />
            </div>
          </div>
          <div className="part-5 w-full h-[28%] flex items-center">
            <div className="left-part w-[30%] h-full flex items-center relative">
              <div className="absolute left-27 h-full flex items-center gap-2 w-75">
                <Multibutton
                  tag="edit-profile"
                  label="Edit Profile"
                  onClick={() => setIsEditing(true)}
                  className="h-[30%] rounded-4xl w-[50%]"
                />
                <Multibutton
                  tag="share-profile"
                  label="Share Profile"
                  onClick={() => setIsSharing(true)}
                  className="h-[30%] rounded-4xl bg-foreground text-card w-[50%]"
                />
              </div>
            </div>
            <div className="right-part w-[70%] h-full flex items-start justify-end px-10 py-2 gap-2">
              {profile.skills.length > 0
                ? profile.skills.map((skill) => <SkillTag key={skill} skill={skill} />)
                : !loading && <p className="text-muted-foreground text-sm">No skills added yet</p>}
            </div>
          </div>
        </div>
        <div className="part-3-post-navigator w-full py-4">
          <PostNavigationBar/>
        </div>
      </div>

      <EditProfileCard
        key={isEditing ? "editing" : "closed"}
        isOpen={isEditing}
        initialData={profile}
        onClose={() => setIsEditing(false)}
        onSubmit={handleEditSubmit}
      />

      <ProfileShareCard
        isOpen={isSharing}
        tag={profile.tag}
        onClose={() => setIsSharing(false)}
      />
    </div>
  );
}