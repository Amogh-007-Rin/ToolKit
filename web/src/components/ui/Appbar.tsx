"use client";
import { signIn, signOut } from "next-auth/react"

export default function Appbar() {
    return (
        <div className="appbar flex min-h-16 w-full flex-wrap items-center justify-evenly gap-2 bg-background px-3 py-2">
            <div className="part-1 min-h-12 min-w-0 flex-1 bg-red-300">
            </div>
            <div className="part-2 min-h-12 min-w-0 flex-1 bg-green-300">
            </div>
            <div className="part-3 min-h-12 min-w-0 flex-1 bg-yellow-300">
                <button onClick={() => signIn()}>Signin</button>
                <button onClick={() => signOut()}>Sign out</button>
            </div>
        </div>
    )
}

