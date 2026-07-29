'use client'

import { Cuboid, List, Plus, Workflow } from "lucide-react";
import Multibutton from "./buttons/Multibutton";
import Searchbar from "./Searchbar";

export default function MainPage() {
    return (
        <div className="main-bar w-[93%] h-full">
            <div className="part-1 w-full h-[10%] flex items-center">
                <div className="left-part w-[50%] h-full flex items-center p-5">
                    <p className="text-2xl text-[#FFFFFF] tracking-wide">ALL TOOLS</p>
                </div>
                <div className="right-part w-[50%] h-full flex items-center justify-end px-3 gap-2">
                    <Multibutton tag="Add-tool-btn" label="List" onClick={checkLog} icon={List} iconColor="#FFFFFF" textClassName="text-white" />
                    <Multibutton tag="Add-tool-btn" label="Board" onClick={checkLog} icon={Cuboid}
                        className="bg-[#FFFFFF]" />
                    <Multibutton tag="Add-tool-btn" label="Workflows" onClick={checkLog} icon={Workflow} iconColor="#FFFFFF" textClassName="text-white"
                    />
                    <Multibutton tag="Add-tool-btn" label="Add tools" onClick={checkLog} icon={Plus} iconColor="#FFFFFF"
                        className="bg-[#9D6FFF]" textClassName="text-white" />
                </div>
            </div>
            <div className="part-2 w-full h-[10%] flex items-center justify-center">
                <Searchbar />
            </div>
            <div className="part-3 w-full h-[80%]">

            </div>
        </div>
    );
};


function checkLog() {
    alert("button clicked")
};