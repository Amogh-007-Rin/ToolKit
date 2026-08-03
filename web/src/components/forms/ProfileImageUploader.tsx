"use client";

import { useState, ChangeEvent } from "react";
import Image from "next/image";
import { Camera } from "lucide-react";

export default function ProfileImageUploader() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
    };

    return (
        <div className="w-40 h-40 flex flex-col rounded-full items-center justify-center absolute -top-20 left-25 z-10">
            {/* Circular Profile Wrapper */}
            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-background group">
                
                {/* Profile Image Render Container */}
                <div className="w-full h-full relative">
                    {imagePreview ? (
                        <Image
                            src={imagePreview}
                            alt="Profile picture"
                            fill 
                            className="object-cover" // Cover ensures it fills the circle perfectly without stretching
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
                </div>

                {/* Hover / Always-on Camera Overlay Button */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    {/* Invisible file input covering the entire hover layer */}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    />
                    {/* Centered Camera Icon */}
                    <Camera className="text-white w-6 h-6 z-10" />
                </div>
            </div>
        </div>
    );
};
