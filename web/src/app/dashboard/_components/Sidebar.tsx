'use client'

import { House, Kayak, LayoutDashboard, MessagesSquare, Settings, Spool } from "lucide-react";
import Navbutton from "./buttons/Navbutton";
import Profilebutton from "@/components/ui/buttons/Profilebutton";
import Notificationbutton from "@/components/ui/buttons/Notificationbutton";
import SignoutButton from "@/components/ui/buttons/Signoutbutton";

export default function Sidebar() {
    

    return (
        <div className="side-navigation w-[6%] h-full bg-[#1D1D1D] flex flex-col justify-center items-center p-2">
            <div className="part-1 w-[90%] h-[10%] flex items-center justify-center">
                <Spool strokeWidth={3} color="#FFFFFF" size={42} />
            </div>
            <div className="part-2 w-[90%] h-[65%] flex flex-col items-center justify-center
            gap-4">
                <Navbutton tag="home-nav-button" icon={House} onClick={checkLog}/>
                <Navbutton tag="home-nav-button" icon={LayoutDashboard} onClick={checkLog}/>
                <Navbutton tag="home-nav-button" icon={MessagesSquare} onClick={checkLog}/>
                <Navbutton tag="home-nav-button" icon={Kayak} onClick={checkLog}/>
                <Navbutton tag="home-nav-button" icon={Settings} onClick={checkLog}/>
            </div>
            <div className="part-3 w-[90%] h-[25%] flex flex-col justify-center items-center gap-4">
                <Notificationbutton onClick={checkLog}/>
                <SignoutButton/>
                <Profilebutton/>
            </div>
        </div>
    );
};

function checkLog() {
    alert("button clicked")
};