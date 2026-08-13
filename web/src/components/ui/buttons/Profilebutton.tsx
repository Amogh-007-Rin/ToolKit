import Image from "next/image";

interface ProfilebuttonProps {
    onClick: () => void;
    imageUrl?: string | null;
    name?: string | null;
}

export default function Profilebutton({ onClick, imageUrl, name }: ProfilebuttonProps) {

    return (
        <button className="profile-btn w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden
        cursor-pointer" onClick={onClick}>
            {imageUrl ? (
                <Image src={imageUrl} alt={name ?? "Profile"} width={48} height={48} className="w-full h-full object-cover" unoptimized />
            ) : (
                <span className="text-base font-semibold text-foreground">
                    {(name || "U").charAt(0).toUpperCase()}
                </span>
            )}
        </button>
    );

};