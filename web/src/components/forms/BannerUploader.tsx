"use client";

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { uploadFile } from "@/services/media";

export default function BannerUploader({
  value,
  onUploaded,
}: {
  value: string | null;
  onUploaded: (key: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const busyRef = useRef(false);

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busyRef.current) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError(true);
      return;
    }
    busyRef.current = true;
    setError(false);
    setProgress(0);
    try {
      const { key } = await uploadFile(file, "banner", setProgress);
      onUploaded(key);
      setProgress(null);
    } catch {
      setError(true);
      setProgress(null);
    } finally {
      busyRef.current = false;
    }
  };

  const uploading = progress !== null;

  return (
    <div className="w-full h-full flex flex-col items-center relative">
      {/* File Input Wrapper Button */}
      <div className="bg-card absolute top-6 right-6 w-10 h-10 z-20 rounded-2xl flex items-center justify-center shadow-2xs cursor-pointer group hover:bg-muted transition-colors border border-border">
        {/* Invisible input stretched to fill the entire container */}
        <input
          type="file"
          accept="image/*"
          onChange={handleChange}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer z-20"
        />
        {/* Centered Icon underneath the invisible input click area */}
        <ImageIcon className="text-foreground z-10" size={20} />
      </div>

      {/* Target Div for Rendering the Image */}
      <div className="w-full h-full relative">
        {value ? (
          <Image
            src={value}
            alt="Banner"
            fill
            className="object-cover"
            unoptimized
            loading="eager"
          />
        ) : null}
        {uploading ? (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <p className="text-white text-sm font-medium">{Math.round(progress * 100)}%</p>
          </div>
        ) : error ? (
          <div className="absolute inset-0 bg-destructive/40 flex items-center justify-center z-10">
            <p className="text-white text-xs font-medium">Upload failed</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
