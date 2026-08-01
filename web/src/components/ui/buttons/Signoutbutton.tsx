import { LogOut } from "lucide-react";

interface SignoutButtonProps{
    onClick: () => void;
}

export default function SignoutButton({onClick}: SignoutButtonProps){
    return(
        <button className="signout-btn w-14 h-14 rounded-full flex items-center justify-center cursor-pointer" onClick={onClick}>
            <LogOut className="text-foreground" size={20} />
        </button>
    );
};