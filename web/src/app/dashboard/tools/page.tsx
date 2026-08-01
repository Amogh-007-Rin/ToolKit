'use client'

import { Cuboid, List, Plus, Workflow } from "lucide-react";
import Multibutton from "../_components/buttons/Multibutton";
import Searchbar from "../_components/Searchbar";

export default function ToolsPage() {
    return (
        <div className="w-full h-full">
            <div className="part-1 w-full h-[10%] flex items-center">
                <div className="left-part w-[50%] h-full flex items-center p-5">
                    <p className="text-2xl text-foreground tracking-wide">ALL TOOLS</p>
                </div>
                <div className="right-part w-[50%] h-full flex items-center justify-end px-3 gap-2">
                    <Multibutton tag="Add-tool-btn" label="List" onClick={checkLog} icon={List} />
                    <Multibutton tag="Add-tool-btn" label="Board" onClick={checkLog} icon={Cuboid}
                        className="bg-foreground" iconClassName="text-background" textClassName="text-background" />
                    <Multibutton tag="Add-tool-btn" label="Add on" onClick={checkLog} icon={Workflow}
                    />
                    <Multibutton tag="Add-tool-btn" label="Add tools" onClick={checkLog} icon={Plus}
                        className="bg-primary" iconClassName="text-primary-foreground" textClassName="text-primary-foreground" />
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
