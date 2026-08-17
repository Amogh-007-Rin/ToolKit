'use client'

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
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
import ProfileSkeleton from "@/components/ui/loaders/ProfileSkeleton";

export default function ProfilePage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      syncTouch: true,
      autoRaf: true,
    });
    const resizeObserver = new ResizeObserver(() => lenis.resize());
    resizeObserver.observe(wrapper);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
      lenis.destroy();
    };
  }, [loading]);

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

  if (loading) return <ProfileSkeleton />;

  return (
    <div ref={scrollRef} data-lenis-wrapper className="h-dvh w-full overflow-y-auto bg-background">
      <div ref={contentRef} className="relative min-h-full w-full">
      <button
        onClick={() => router.back()}
        className="fixed left-3 top-3 z-30 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-border bg-card shadow-2xs transition-colors hover:bg-muted sm:left-6 sm:top-6"
      >
        <ArrowLeft size={20} className="text-foreground" />
      </button>
      <div className="profile-container w-full min-h-screen flex flex-col">
        <div className="banner-container w-full h-[25vh] bg-linear-to-br from-primary/20 via-shade-background to-card">
          <BannerUploader
            value={profile.banner}
            onUploaded={(key) => handleMediaUploaded("banner", key)}
          />
        </div>
        <div className="profile-info relative w-full px-4 pb-5 pt-18 sm:px-8 sm:pt-24 lg:h-[35vh] lg:min-h-80 lg:px-0 lg:pb-0 lg:pt-0">
          <ProfileImageUploader
            value={profile.image}
            onUploaded={(key) => handleMediaUploaded("profile", key)}
          />
          <div className="part-1 mt-1 flex w-full flex-col items-start gap-2 sm:items-end lg:mt-4 lg:h-[20%] lg:justify-center lg:px-10">
            <div className="flex items-center gap-2 px-1.5">
              <p className="text-foreground">Current Role</p>
              <BriefcaseBusiness size={18} className="text-foreground" />
            </div>
            <span className="px-4 py-1 rounded-full bg-shade-background flex items-center justify-center">
              <p className="text-foreground font-bold">{loading ? "..." : (profile.role || "...")}</p>
            </span>
          </div>
          <div className="part-2 mt-5 flex items-center lg:mt-0 lg:h-[20%]">
            <div className="profile-name relative flex w-full flex-col lg:h-full lg:justify-center">
              <p className="text-2xl font-bold text-foreground lg:absolute lg:left-27 lg:top-4">
                {loading ? "..." : (profile.name || "Your Name")}
              </p>
              <p className="text-sm font-light text-foreground lg:absolute lg:left-27 lg:top-12">
                {loading ? "..." : (profile.tag ? `@${profile.tag}` : "@toolkit-tag")}
              </p>
            </div>
          </div>
          <div className="part-3 mt-4 flex items-center lg:mt-0 lg:min-h-[10%] lg:py-2">
            <div className="profile-occupation flex w-full flex-col gap-3 lg:min-h-full lg:flex-row lg:items-center">
              <p className="w-full max-w-xl whitespace-normal wrap-break-word text-foreground leading-5 lg:ml-27 lg:w-[40%]">
                {loading ? "..." : (profile.bio || "Your bio")}
              </p>
              <p className="text-base text-muted-foreground lg:ml-auto lg:mr-10">
                {loading ? "..." : `${profile.followers} followers · ${profile.following} following`}
              </p>
            </div>
          </div>
          <div className="part-4 mt-4 flex flex-col gap-3 lg:mt-0 lg:h-[12%] lg:flex-row lg:items-center">
            <div className="profile-location relative flex items-start lg:h-full lg:w-[50%]">
              <p className="text-foreground lg:absolute lg:left-27">
                {loading ? "..." : (profile.location || "Your location")}
              </p>
            </div>
            <div className="flex items-center gap-2 lg:h-full lg:w-[50%] lg:justify-end lg:px-10">
              <p className="text-foreground">Skills</p>
              <Star size={16} className="text-foreground" />
            </div>
          </div>
          <div className="part-5 mt-3 flex w-full flex-col gap-3 lg:mt-0 lg:h-[25%] lg:flex-row lg:items-center">
            <div className="left-part relative flex items-center lg:h-full lg:w-[30%]">
              <div className="flex h-11 w-full items-start gap-2 sm:w-75 lg:absolute lg:left-27 lg:h-full">
                <Multibutton
                  tag="edit-profile"
                  label="Edit Profile"
                  onClick={() => setIsEditing(true)}
                  className="h-11! w-[50%] rounded-4xl lg:h-[50%]!"
                />
                <Multibutton
                  tag="share-profile"
                  label="Share Profile"
                  onClick={() => setIsSharing(true)}
                  className="h-11! w-[50%] rounded-4xl bg-foreground text-card lg:h-[50%]!"
                />
              </div>
            </div>
            <div className="right-part flex flex-wrap items-start gap-2 lg:h-full lg:w-[70%] lg:justify-end lg:px-10 lg:py-2">
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
    </div>
  );
}
