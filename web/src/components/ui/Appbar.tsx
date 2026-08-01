"use client";
import { signIn, signOut } from "next-auth/react"

export default function Appbar() {
    return (
        <div className="appbar w-full h-[10%] bg-background flex justify-evenly items-center">
            <div className="part-1 w-[30%] h-full bg-red-300">
            </div>
            <div className="part-2 w-[30%] h-full bg-green-300">
            </div>
            <div className="part-3 w-[30%] h-full bg-yellow-300">
                <button onClick={() => signIn()}>Signin</button>
                <button onClick={() => signOut()}>Sign out</button>
            </div>
        </div>
    )
}


