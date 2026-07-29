import { LogOut } from "lucide-react";

export default function SignoutButton(){
    return(
        <button className="signout-btn w-14 h-14 rounded-full flex items-center justify-center">
            <LogOut color="white" />
        </button>
    );
};