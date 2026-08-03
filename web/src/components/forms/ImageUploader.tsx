"use client";

import { useState, ChangeEvent } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";

export default function ImageUploader() {
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setImagePreview(objectUrl);
        }
    };

    return (
        <div className="w-full h-full flex flex-col items-center relative">
            {/* File Input Wrapper Button */}
            <div className="bg-card absolute top-6 right-6 w-10 h-10 z-10 rounded-2xl flex items-center justify-center shadow-2xs cursor-pointer group hover:bg-muted transition-colors border border-border">
                {/* Invisible input stretched to fill the entire container */}
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                />
                {/* Centered Icon underneath the invisible input click area */}
                <ImageIcon className="text-foreground z-10" size={20}/>
            </div>

            {/* Target Div for Rendering the Image */}
            <div className="w-full h-full relative">
                {imagePreview && (
                    <Image
                        src={imagePreview}
                        alt="Uploaded preview"
                        fill 
                        className="object-cover" 
                        unoptimized 
                    />
                )}
            </div>
        </div>
    );
}
