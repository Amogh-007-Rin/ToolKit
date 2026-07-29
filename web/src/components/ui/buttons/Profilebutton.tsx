import Image from "next/image";

export default function Profilebutton() {

    const iconSrc = "/github.svg"

    return (
        <button className="profile-btn w-14 h-14 rounded-full bg-black flex items-center justify-center">
            <Image src={iconSrc} alt="" className="" width={36} height={36} preload={true} />
        </button>
    );

};