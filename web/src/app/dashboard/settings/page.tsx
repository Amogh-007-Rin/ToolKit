"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Lenis from "lenis";
import ThemeToggleButton from "@/components/ui/buttons/ThemeToggleButton";
import {
  Accessibility,
  Bell,
  Contrast,
  Download,
  Eye,
  EyeOff,
  Heart,
  LockKeyhole,
  LogOut,
  MessageCircle,
  FolderOpen,
  Pencil,
  ShieldCheck,
  ScanSearch,
  Sparkles,
  UserPlus,
} from "lucide-react";

type TabId = "account" | "notifications" | "privacy" | "accessibility" | "security";

interface Profile {
  name: string | null;
  email: string;
  image: string | null;
  tag: string | null;
  role: string | null;
  location: string | null;
}

interface NotificationPreferences {
  notifyFollows: boolean;
  notifyLikes: boolean;
  notifyComments: boolean;
}

interface PrivacyPreferences {
  discoverable: boolean;
  showPosts: boolean;
  showCollections: boolean;
}

const TABS: { id: TabId; label: string }[] = [
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "accessibility", label: "Accessibility" },
  { id: "security", label: "Security & data" },
];

const NOTIFICATION_OPTIONS = [
  { key: "notifyFollows" as const, title: "New followers", detail: "When someone starts following you", icon: UserPlus },
  { key: "notifyLikes" as const, title: "Post likes", detail: "When someone likes one of your posts", icon: Heart },
  { key: "notifyComments" as const, title: "Post comments", detail: "When someone comments on one of your posts", icon: MessageCircle },
];

const PRIVACY_OPTIONS = [
  { key: "discoverable" as const, title: "Appear in Explore", detail: "Let other users discover your creator profile through search and recommendations", icon: ScanSearch },
  { key: "showPosts" as const, title: "Show public posts", detail: "Display your posts to visitors on your public profile", icon: Eye },
  { key: "showCollections" as const, title: "Showcase collections", detail: "Display your selected tool collections on your public profile", icon: FolderOpen },
];

function Section({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 border-b border-border py-7 last:border-b-0 sm:py-9 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <div>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-1 max-w-xs text-sm leading-6 text-muted-foreground">{detail}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors disabled:cursor-wait disabled:opacity-60 ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <motion.span
        className="absolute left-0 top-1 h-4 w-4 rounded-full bg-white shadow-sm"
        animate={{ x: checked ? 24 : 4 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-pulse px-4 sm:px-8 lg:px-10" aria-label="Loading settings">
      {[0, 1, 2].map((item) => (
        <div key={item} className="grid gap-5 border-b border-border py-9 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
          <div className="space-y-3">
            <div className="h-4 w-28 rounded-full bg-skeleton" />
            <div className="h-3 w-52 max-w-full rounded-full bg-skeleton" />
          </div>
          <div className="space-y-3">
            <div className="h-12 w-full rounded-xl bg-skeleton" />
            <div className="h-12 w-full rounded-xl bg-skeleton" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    notifyFollows: true,
    notifyLikes: true,
    notifyComments: true,
  });
  const [privacy, setPrivacy] = useState<PrivacyPreferences>({ discoverable: true, showPosts: true, showCollections: true });
  const [loading, setLoading] = useState(true);
  const [savingPreference, setSavingPreference] = useState<keyof NotificationPreferences | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState<keyof PrivacyPreferences | null>(null);
  const [reduceAnimations, setReduceAnimations] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const barFillRef = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [profileRes, preferencesRes, privacyRes] = await Promise.all([
          fetch("/api/profile", { cache: "no-store" }),
          fetch("/api/notifications/preferences", { cache: "no-store" }),
          fetch("/api/settings/privacy", { cache: "no-store" }),
        ]);
        if (profileRes.ok) {
          const data = await profileRes.json();
          if (!cancelled) setProfile(data.user);
        }
        if (preferencesRes.ok) {
          const data = await preferencesRes.json();
          if (!cancelled) setPreferences(data.preferences);
        }
        if (privacyRes.ok) {
          const data = await privacyRes.json();
          if (!cancelled) setPrivacy(data.preferences);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const reduce = localStorage.getItem("toolkit-reduce-motion") === "true";
    const contrast = localStorage.getItem("toolkit-high-contrast") === "true";
    document.documentElement.dataset.reduceMotion = String(reduce);
    document.documentElement.dataset.highContrast = String(contrast);
    const timer = window.setTimeout(() => {
      setReduceAnimations(reduce);
      setHighContrast(contrast);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const wrapper = scrollRef.current;
    const content = contentRef.current;
    if (!wrapper || !content) return;

    const lenis = new Lenis({
      wrapper,
      content,
      duration: 1.2,
      easing: (value) => Math.min(1, 1.001 - Math.pow(2, -10 * value)),
      smoothWheel: true,
      syncTouch: true,
      autoRaf: true,
    });

    const updateBar = (scroll: number, limit: number) => {
      const rail = railRef.current;
      const fill = barFillRef.current;
      if (!rail || !fill) return;
      setScrollable(limit > 0);
      const progress = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0;
      const travel = rail.clientHeight * 0.93;
      fill.style.transform = `translateY(${progress * travel}px)`;
    };
    const onScroll = ({ scroll, limit }: { scroll: number; limit: number }) => updateBar(scroll, limit);
    lenis.on("scroll", onScroll);
    updateBar(0, lenis.limit);

    const observer = new ResizeObserver(() => {
      lenis.resize();
      updateBar(lenis.scroll, lenis.limit);
    });
    observer.observe(content);
    observer.observe(wrapper);

    return () => {
      lenis.off("scroll", onScroll);
      observer.disconnect();
      lenis.destroy();
    };
  }, []);

  const togglePreference = async (key: keyof NotificationPreferences) => {
    if (savingPreference) return;
    const previous = preferences;
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSavingPreference(key);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreferences(data.preferences);
    } catch {
      setPreferences(previous);
    } finally {
      setSavingPreference(null);
    }
  };

  const togglePrivacy = async (key: keyof PrivacyPreferences) => {
    if (savingPrivacy) return;
    const previous = privacy;
    const next = { ...privacy, [key]: !privacy[key] };
    setPrivacy(next);
    setSavingPrivacy(key);
    try {
      const res = await fetch("/api/settings/privacy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next[key] }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPrivacy(data.preferences);
    } catch {
      setPrivacy(previous);
    } finally {
      setSavingPrivacy(null);
    }
  };

  const setAccessibilityPreference = (key: "reduce-motion" | "high-contrast", value: boolean) => {
    localStorage.setItem(`toolkit-${key}`, String(value));
    if (key === "reduce-motion") {
      setReduceAnimations(value);
      document.documentElement.dataset.reduceMotion = String(value);
    } else {
      setHighContrast(value);
      document.documentElement.dataset.highContrast = String(value);
    }
  };

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ kind: "error", text: "New passwords do not match." });
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch("/api/settings/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update password");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage({ kind: "success", text: "Your password has been updated." });
    } catch (error) {
      setPasswordMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not update password" });
    } finally {
      setPasswordBusy(false);
    }
  };

  const downloadData = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `toolkit-data-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <main className="relative h-full min-h-0 w-full overflow-hidden text-foreground">
      <div ref={scrollRef} data-lenis-wrapper className="scrollbar-none h-full overflow-y-auto">
      <div ref={contentRef} className="mx-auto w-full max-w-[92rem] px-4 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
        <header className="flex items-start justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage your account settings and preferences</p>
          </div>
          <div className="shrink-0 pt-1">
            <ThemeToggleButton />
          </div>
        </header>

        <nav className="thin-scrollbar mt-6 flex gap-2 overflow-x-auto pb-2" aria-label="Settings sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative shrink-0 cursor-pointer rounded-full px-5 py-2.5 text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-black text-white dark:bg-white dark:text-black" : "bg-card/70 text-muted-foreground hover:bg-card hover:text-foreground"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {loading ? (
          <SettingsSkeleton />
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -5 }}
              transition={{ duration: 0.18 }}
            >
              {activeTab === "account" && (
                <>
                  <Section title="Profile" detail="Your public identity across ToolKit.">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border">
                        {profile?.image ? (
                          <Image src={profile.image} alt={profile.name || "Profile"} fill sizes="96px" className="object-cover" unoptimized />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-2xl font-bold">{(profile?.name || "U").charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-lg font-semibold">{profile?.name || "ToolKit user"}</p>
                        <p className="truncate text-sm text-muted-foreground">{profile?.tag ? `@${profile.tag}` : "No public tag set"}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{profile?.role || "Add your role and skills to help creators discover you."}</p>
                      </div>
                      <button type="button" onClick={() => router.push("/profile")} className="flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-card hover:opacity-90">
                        <Pencil size={15} /> Edit profile
                      </button>
                    </div>
                  </Section>
                  <Section title="Account details" detail="Core information associated with your account.">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">Display name</span><input value={profile?.name || ""} readOnly className="h-11 w-full rounded-xl border border-border bg-card/50 px-3 outline-none" /></label>
                      <label className="space-y-1.5 text-sm"><span className="text-muted-foreground">ToolKit tag</span><input value={profile?.tag ? `@${profile.tag}` : "Not set"} readOnly className="h-11 w-full rounded-xl border border-border bg-card/50 px-3 outline-none" /></label>
                      <label className="space-y-1.5 text-sm sm:col-span-2"><span className="text-muted-foreground">Email address</span><input value={profile?.email || ""} readOnly className="h-11 w-full rounded-xl border border-border bg-card/50 px-3 outline-none" /></label>
                    </div>
                  </Section>
                  <Section title="Public profile" detail="Preview what other ToolKit users can see.">
                    <button type="button" disabled={!profile?.tag} onClick={() => profile?.tag && router.push(`/profile/${profile.tag}`)} className="h-10 cursor-pointer rounded-xl border border-border bg-card/50 px-4 text-sm font-semibold hover:bg-card disabled:cursor-not-allowed disabled:opacity-50">View public profile</button>
                  </Section>
                </>
              )}

              {activeTab === "notifications" && (
                <>
                  <Section title="Activity notifications" detail="Choose which social activity you want to receive.">
                    <div className="overflow-hidden rounded-2xl border border-border">
                      {NOTIFICATION_OPTIONS.map(({ key, title, detail, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-4 border-b border-border p-4 last:border-b-0 sm:p-5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"><Icon size={19} /></span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p></div>
                          <Toggle checked={preferences[key]} disabled={savingPreference !== null} onChange={() => void togglePreference(key)} />
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Notification center" detail="Review or permanently remove existing activity.">
                    <button type="button" onClick={() => router.push("/dashboard/notifications")} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-card hover:opacity-90"><Bell size={16} />Open notifications</button>
                  </Section>
                </>
              )}

              {activeTab === "privacy" && (
                <>
                  <Section title="Profile visibility" detail="Control how your work and profile appear to the ToolKit community.">
                    <div className="overflow-hidden rounded-2xl border border-border">
                      {PRIVACY_OPTIONS.map(({ key, title, detail, icon: Icon }) => (
                        <div key={key} className="flex items-center gap-4 border-b border-border p-4 last:border-b-0 sm:p-5">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"><Icon size={19} /></span>
                          <div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p></div>
                          <Toggle checked={privacy[key]} disabled={savingPrivacy !== null} onChange={() => void togglePrivacy(key)} />
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Privacy preview" detail="Review your profile exactly as another signed-in user sees it.">
                    <div className="flex flex-wrap items-center gap-3">
                      <button type="button" disabled={!profile?.tag} onClick={() => profile?.tag && router.push(`/profile/${profile.tag}`)} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-card hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Eye size={16} />Preview public profile</button>
                      {!privacy.discoverable && <span className="text-xs text-muted-foreground">Your direct profile link still works, but you are hidden from Explore.</span>}
                    </div>
                  </Section>
                </>
              )}

              {activeTab === "accessibility" && (
                <>
                  <Section title="Motion" detail="Adjust interface movement to make ToolKit more comfortable to use.">
                    <div className="flex items-center gap-4 rounded-2xl border border-border p-4 sm:p-5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"><Sparkles size={19} /></span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Reduce animations</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Minimize transitions, animated loaders, and smooth scrolling across the interface</p></div>
                      <Toggle checked={reduceAnimations} onChange={() => setAccessibilityPreference("reduce-motion", !reduceAnimations)} />
                    </div>
                  </Section>
                  <Section title="Visual contrast" detail="Improve separation between text, controls, and surfaces.">
                    <div className="flex items-center gap-4 rounded-2xl border border-border p-4 sm:p-5">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-muted"><Contrast size={19} /></span>
                      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">High contrast</p><p className="mt-0.5 text-xs leading-5 text-muted-foreground">Strengthen muted text and borders in both light and dark themes</p></div>
                      <Toggle checked={highContrast} onChange={() => setAccessibilityPreference("high-contrast", !highContrast)} />
                    </div>
                  </Section>
                  <Section title="Accessibility support" detail="These preferences are saved on this device.">
                    <div className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-4 text-sm leading-6 text-muted-foreground"><Accessibility size={18} className="mt-0.5 shrink-0 text-foreground" /><p>ToolKit also follows your operating system&apos;s reduced-motion preference when the local override is disabled.</p></div>
                  </Section>
                </>
              )}

              {activeTab === "security" && (
                <>
                  <Section title="Change password" detail="Use at least 8 characters and avoid passwords used elsewhere.">
                    <form onSubmit={updatePassword} className="max-w-2xl space-y-4">
                      <div className="relative"><input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" autoComplete="current-password" required className="h-11 w-full rounded-xl border border-border bg-card/50 px-3 pr-11 outline-none focus:border-ring" /><button type="button" onClick={() => setShowPasswords((value) => !value)} aria-label={showPasswords ? "Hide passwords" : "Show passwords"} className="absolute right-1 top-1 grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-muted-foreground hover:bg-muted">{showPasswords ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
                      <div className="grid gap-4 sm:grid-cols-2"><input type={showPasswords ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" autoComplete="new-password" minLength={8} required className="h-11 rounded-xl border border-border bg-card/50 px-3 outline-none focus:border-ring" /><input type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" autoComplete="new-password" minLength={8} required className="h-11 rounded-xl border border-border bg-card/50 px-3 outline-none focus:border-ring" /></div>
                      {passwordMessage && <p className={`text-sm ${passwordMessage.kind === "success" ? "text-green-600 dark:text-green-400" : "text-red-500"}`}>{passwordMessage.text}</p>}
                      <button type="submit" disabled={passwordBusy} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-semibold text-card disabled:opacity-50"><LockKeyhole size={15} />{passwordBusy ? "Updating…" : "Update password"}</button>
                    </form>
                  </Section>
                  <Section title="Your data" detail="Download a portable copy of your ToolKit content and activity.">
                    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void downloadData()} disabled={exporting} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card/50 px-4 text-sm font-semibold hover:bg-card disabled:opacity-50"><Download size={16} />{exporting ? "Preparing…" : "Download my data"}</button><span className="text-xs text-muted-foreground">Includes profile, collections, posts, social activity, and AI chats.</span></div>
                  </Section>
                  <Section title="Session" detail="Securely end your current ToolKit session.">
                    <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => void signOut({ callbackUrl: "/auth/signin" })} className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-red-500/10 px-4 text-sm font-semibold text-red-500 hover:bg-red-500/15"><LogOut size={16} />Sign out</button><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck size={14} />You will need to authenticate again.</span></div>
                  </Section>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      </div>
      <div
        ref={railRef}
        className={`pointer-events-none absolute bottom-3 right-1 top-3 w-1 overflow-hidden rounded-full bg-transparent transition-opacity duration-300 ${scrollable ? "opacity-100" : "opacity-0"}`}
      >
        <div ref={barFillRef} className="h-[7%] w-full rounded-full bg-foreground" />
      </div>
    </main>
  );
}
