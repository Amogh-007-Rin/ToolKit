'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X } from "lucide-react";
import type { EditableProfile } from "@/types/profile";

interface EditProfileCardProps {
  isOpen: boolean;
  initialData: EditableProfile;
  onClose: () => void;
  onSubmit: (data: EditableProfile) => void;
}

const BIO_WORD_LIMIT = 40;
const NAME_CHARACTER_LIMIT = 30;
const ROLE_CHARACTER_LIMIT = 30;
const LOCATION_CHARACTER_LIMIT = 40;
const SKILL_LIMIT = 5;

const limitWords = (value: string) => {
  const words = value.match(/\S+/g) ?? [];
  return words.length > BIO_WORD_LIMIT ? words.slice(0, BIO_WORD_LIMIT).join(" ") : value;
};

export default function EditProfileCard({ isOpen, initialData, onClose, onSubmit }: EditProfileCardProps) {
  const [name, setName] = useState(initialData.name.slice(0, NAME_CHARACTER_LIMIT));
  const [bio, setBio] = useState(initialData.bio);
  const [role, setRole] = useState(initialData.role.slice(0, ROLE_CHARACTER_LIMIT));
  const [location, setLocation] = useState(initialData.location.slice(0, LOCATION_CHARACTER_LIMIT));
  const [skills, setSkills] = useState<string[]>(initialData.skills.slice(0, SKILL_LIMIT));
  const [tag, setTag] = useState(initialData.tag ?? "");
  const [skillInput, setSkillInput] = useState("");

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    onSubmit({
      name: trimmedName,
      bio: bio.trim(),
      role: role.trim(),
      location: location.trim(),
      skills: skills.filter((s) => s.trim().length > 0),
      tag: tag.trim() || null,
    });
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills.includes(trimmed) || skills.length >= SKILL_LIMIT) return;
    setSkills([...skills, trimmed]);
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 pointer-events-none sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-auto flex max-h-[92dvh] h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:h-[82dvh]"
            >
              <div className="w-full h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
                <p className="text-xl text-foreground font-semibold">Edit Profile</p>
                <motion.button
                  onClick={onClose}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={20} />
                  </motion.button>
              </div>
              <div data-lenis-prevent className="flex w-full flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Toolkit Tag</label>
                  <div className="flex items-center h-12 bg-input border border-border rounded-xl px-4 focus-within:border-primary transition-colors">
                    <span className="text-foreground text-sm font-mono">@</span>
                    <input
                      type="text"
                      placeholder="your-unique-tag (letters, numbers, hyphens)"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.replace(/^@/, "").replace(/[^a-zA-Z0-9_-]/g, ""))}
                      className="flex-1 bg-transparent text-foreground text-sm placeholder:text-muted-foreground focus:outline-none font-mono ml-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your tag will be used to create a shareable profile link: toolkit.app/profile/@{tag || "..."}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={NAME_CHARACTER_LIMIT}
                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {name.length}/{NAME_CHARACTER_LIMIT} characters
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Bio</label>
                  <textarea
                    placeholder="A short bio about yourself"
                    value={bio}
                    onChange={(e) => setBio(limitWords(e.target.value))}
                    rows={4}
                    className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {(bio.match(/\S+/g) ?? []).length}/{BIO_WORD_LIMIT} words
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Current Role</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    maxLength={ROLE_CHARACTER_LIMIT}
                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {role.length}/{ROLE_CHARACTER_LIMIT} characters
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Birmingham, United Kingdom"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    maxLength={LOCATION_CHARACTER_LIMIT}
                    className="w-full h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-right text-xs text-muted-foreground">
                    {location.length}/{LOCATION_CHARACTER_LIMIT} characters
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm text-muted-foreground font-medium"> Top 5 Skills</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a skill and press Enter"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      disabled={skills.length >= SKILL_LIMIT}
                      className="flex-1 h-12 bg-input border border-border rounded-xl px-4 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={addSkill}
                      disabled={skills.length >= SKILL_LIMIT}
                      className="w-12 h-12 bg-primary text-primary-foreground rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus size={20} />
                    </motion.button>
                  </div>
                  <p className="text-right text-xs text-muted-foreground">
                    {skills.length}/{SKILL_LIMIT} skills
                  </p>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <span
                          key={skill}
                          className="flex items-center gap-1 px-3 py-1 rounded-full bg-shade-background text-foreground text-sm"
                        >
                          {skill}
                          <button
                            onClick={() => removeSkill(skill)}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="w-full p-6 pt-0 shrink-0">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  disabled={!name.trim()}
                  className="w-full h-12 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Save changes
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
