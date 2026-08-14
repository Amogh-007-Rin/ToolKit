"use client";

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";
import { uploadFile } from "@/services/media";

export default function ProfileImageUploader({
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
      const { key } = await uploadFile(file, "profile", setProgress);
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
    <div className="absolute -top-14 left-4 z-10 flex h-28 w-28 flex-col items-center justify-center rounded-full sm:-top-20 sm:left-24 sm:h-40 sm:w-40">
      {/* Circular Profile Wrapper */}
      <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-background group">
        {/* Profile Image Render Container */}
        <div className="w-full h-full relative">
          {value ? (
            <Image
              src={value}
              alt="Profile picture"
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            // Default fallback placeholder when no image is uploaded
            <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <p className="text-white text-sm">{Math.round(progress * 100)}%</p>
            </div>
          ) : error ? (
            <div className="absolute inset-0 bg-destructive/60 flex items-center justify-center">
              <p className="text-white text-xs px-2 text-center">Upload failed</p>
            </div>
          ) : null}
        </div>

        {/* Hover / Always-on Camera Overlay Button */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
          {/* Invisible file input covering the entire hover layer */}
          <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={uploading}
            className="absolute inset-0 opacity-0 cursor-pointer z-20"
          />
          {/* Centered Camera Icon */}
          <Camera className="text-white w-6 h-6 z-10" />
        </div>
      </div>
    </div>
  );
}
