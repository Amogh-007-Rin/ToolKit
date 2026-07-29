'use client'

import { motion, useAnimate } from "framer-motion";
import { Spool } from "lucide-react";
import { useCallback, useRef, useState } from "react";

const PARTICLE_COUNT = 80;

export default function AnimatedLogo() {
  const [scope, animate] = useAnimate();
  const [isAnimating, setIsAnimating] = useState(false);

  const particles = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => {
      const angle = (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.4;
      const distance = 80 + Math.random() * 160;
      return {
        id: i,
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        size: 1.5 + Math.random() * 4,
      };
    })
  );

  const handleHover = useCallback(async () => {
    if (isAnimating) return;
    setIsAnimating(true);

    await animate("#logo-icon", {
      x: [0, 4, -4, 4, -4, 3, -3, 3, -3, 2, 2, -2, 2, -2, 0],
      y: [0, -3, 3, -4, 4, -3, 3, -2, 2, -2, 2, -2, 2, -2, 0],
    }, { duration: 0.5, ease: "easeInOut" });

    await animate("#logo-icon", {
      scale: [1, 1.5, 0],
      opacity: [1, 1, 0],
    }, { duration: 0.4, ease: "easeIn" });

    const particlePromises = particles.current.map((p) =>
      animate(`#particle-${p.id}`, {
        x: p.x,
        y: p.y,
        opacity: [1, 1, 0],
        scale: [0.3, 1, 0.2],
      }, { duration: 0.7, ease: "easeOut", delay: Math.random() * 0.08 })
    );

    await Promise.all(particlePromises);

    particles.current.forEach((p) => {
      animate(`#particle-${p.id}`, { x: 0, y: 0, opacity: 0, scale: 0 }, { duration: 0.01 });
    });

    await animate("#logo-icon", {
      x: 0,
      y: 0,
      scale: [0, 1.3, 1],
      opacity: [0, 1],
    }, { duration: 0.6, ease: "easeOut" });

    setIsAnimating(false);
  }, [isAnimating, animate]);

  return (
    <div
      ref={scope}
      className="relative w-[42px] h-[42px] flex items-center justify-center cursor-pointer"
      onMouseEnter={handleHover}
    >
      <motion.div id="logo-icon" className="absolute">
        <Spool strokeWidth={1} color="#FFFFFF" size={42} />
      </motion.div>
      {particles.current.map((p) => (
        <motion.div
          key={p.id}
          id={`particle-${p.id}`}
          className="absolute rounded-full bg-white"
          style={{ width: p.size, height: p.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
        />
      ))}
    </div>
  );
}
