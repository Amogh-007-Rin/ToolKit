import Image from "next/image";

interface ProfilebuttonProps{
    onClick: () => void;
}

export default function Profilebutton({onClick}: ProfilebuttonProps) {

    const iconSrc = "/github.svg"

    return (
        <button className="profile-btn w-12 h-12 rounded-full bg-black flex items-center justify-center overflow-hidden
        cursor-pointer" onClick={onClick}>
            <Image src={iconSrc} alt="" className="" width={24} height={24} preload={true} />
        </button>
    );

};