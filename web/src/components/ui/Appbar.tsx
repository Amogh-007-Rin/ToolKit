"use client";
import { signIn, signOut } from "next-auth/react"

export default function Appbar() {
    return (
        <div className="w-full h-[10%] bg-black">
            <button onClick={() => signIn()}>Signin</button>
            <button onClick={() => signOut()}>Sign out</button>
        </div>
    )
}


