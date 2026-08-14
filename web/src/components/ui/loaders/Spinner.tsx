import type { CSSProperties } from "react";

interface SpinnerProps {
    size?: "xs" | "sm" | "md" | "lg";
    className?: string;
    label?: string;
}

const dimensions = {
    xs: { box: 4, gap: 2, jump: 5 },
    sm: { box: 6, gap: 3, jump: 7 },
    md: { box: 10, gap: 5, jump: 12 },
    lg: { box: 14, gap: 7, jump: 17 },
};

export default function Spinner({ size = "md", className = "", label = "Loading" }: SpinnerProps){
    const dimension = dimensions[size];
    const style = {
        "--spinner-box-size": `${dimension.box}px`,
        "--spinner-gap": `${dimension.gap}px`,
        "--spinner-jump": `${dimension.jump}px`,
        "--spinner-depth": `${dimension.box / 2}px`,
    } as CSSProperties;

    return(
        <div className={`boxes ${className}`} style={style} role="status" aria-label={label}>
            {[1, 2, 3, 4].map((n) => (
                <div key={n} className={`box box-${n}`}>
                    <div className="face face-front"/>
                    <div className="face face-right"/>
                    <div className="face face-top"/>
                    <div className="face face-back"/>
                </div>
            ))}
            <style>{`
                .boxes {
                    display: flex;
                    align-items: center;
                    gap: var(--spinner-gap);
                    padding: var(--spinner-jump) 0;
                    perspective: 600px;
                }
                .box {
                    position: relative;
                    width: var(--spinner-box-size);
                    height: var(--spinner-box-size);
                    transform-style: preserve-3d;
                    transform: rotateX(-25deg) rotateY(45deg);
                    animation: boxes-bounce 1.2s ease-in-out infinite;
                }
                .box-2 { animation-delay: 0.15s; }
                .box-3 { animation-delay: 0.3s; }
                .box-4 { animation-delay: 0.45s; }
                .face {
                    position: absolute;
                    inset: 0;
                    border-radius: 2px;
                    animation: boxes-color 2.4s ease-in-out infinite;
                }
                .box-2 .face { animation-delay: 0.6s; }
                .box-3 .face { animation-delay: 1.2s; }
                .box-4 .face { animation-delay: 1.8s; }
                .face-front {
                    transform: translateZ(var(--spinner-depth));
                    filter: brightness(1);
                }
                .face-right {
                    transform: rotateY(90deg) translateZ(var(--spinner-depth));
                    filter: brightness(0.72);
                }
                .face-top {
                    transform: rotateX(90deg) translateZ(var(--spinner-depth));
                    filter: brightness(1.2);
                }
                .face-back {
                    transform: rotateY(180deg) translateZ(var(--spinner-depth));
                    filter: brightness(0.5);
                }
                @keyframes boxes-bounce {
                    0%, 100% {
                        transform: rotateX(-25deg) rotateY(45deg) translateY(0);
                    }
                    50% {
                        transform: rotateX(-25deg) rotateY(45deg) translateY(calc(var(--spinner-jump) * -1));
                    }
                }
                @keyframes boxes-color {
                    0%, 100% { background-color: var(--primary); }
                    25% { background-color: var(--destructive); }
                    50% { background-color: var(--muted-foreground); }
                    75% { background-color: var(--foreground); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .box,
                    .face {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
};
