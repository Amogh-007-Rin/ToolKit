'use client'

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const DROPLETS = [
  { angle: -15, dist: 60, delay: 0.08 },
  { angle: 10, dist: 80, delay: 0.15 },
  { angle: -5, dist: 100, delay: 0.22 },
  { angle: 20, dist: 55, delay: 0.1 },
  { angle: -25, dist: 70, delay: 0.18 },
];

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const router = useRouter();
  const [isExpanding, setIsExpanding] = useState(false);

  const handleViewAll = () => {
    setIsExpanding(true);
    setTimeout(() => {
      onClose();
      setIsExpanding(false);
      router.push("/dashboard/notifications");
    }, 400);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40"
            initial={{ backgroundColor: "rgba(0,0,0,0)" }}
            animate={{ backgroundColor: isExpanding ? "rgba(0,0,0,1)" : "rgba(0,0,0,0.4)" }}
            exit={{ backgroundColor: "rgba(0,0,0,0)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            onClick={isExpanding ? undefined : onClose}
          />
          <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <svg className="absolute w-0 h-0">
              <defs>
                <filter id="slime-goo">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="14" result="blur" />
                  <feColorMatrix
                    in="blur"
                    mode="matrix"
                    values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -11"
                    result="goo"
                  />
                  <feComposite in="SourceGraphic" in2="goo" operator="atop" />
                </filter>
              </defs>
            </svg>
            <motion.div
              className="pointer-events-auto"
              initial={{ y: "-120%", width: "100%", maxWidth: "48rem" }}
              animate={{
                y: 0,
                width: "100%",
                maxWidth: isExpanding ? "100%" : "48rem",
              }}
              exit={{ y: "-120%" }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 18,
                mass: 0.7,
              }}
            >
              <motion.div
                className="relative bg-card shadow-2xl overflow-hidden"
                style={{ filter: "url(#slime-goo)" }}
                animate={{
                  borderRadius: isExpanding ? "0px" : "0 0 24px 24px",
                  clipPath: isExpanding
                    ? "inset(0 0 0 0 round 0px)"
                    : "inset(0 0 0 0 round 0 0 24px 24px)",
                }}
                initial={{
                  borderRadius: "0 0 24px 24px",
                  clipPath: "inset(0 47% 100% 47% round 50%)",
                }}
                exit={{
                  borderRadius: "0 0 24px 24px",
                  clipPath: "inset(0 47% 100% 47% round 50%)",
                }}
                transition={{
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <motion.div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 40%)",
                  }}
                />
                {!isExpanding && DROPLETS.map((d, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-6 h-6 rounded-full bg-card"
                    style={{
                      top: -12,
                      left: "50%",
                      marginLeft: -12,
                    }}
                    initial={{ x: 0, y: 0, scale: 0.3 }}
                    animate={{ x: d.dist * Math.sin((d.angle * Math.PI) / 180), y: 140, scale: [0.3, 1.2, 0] }}
                    exit={{ x: 0, y: 0, scale: 0 }}
                    transition={{
                      duration: 1.2,
                      delay: d.delay,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                ))}
                <div className="relative p-6 z-10">
                  <div className="flex items-center justify-between mb-6">
                    <motion.h2
                      animate={{ scale: isExpanding ? 1.15 : 1, x: isExpanding ? 8 : 0 }}
                      transition={{ duration: 0.3 }}
                      className="text-xl text-foreground font-semibold"
                    >
                      Notifications
                    </motion.h2>
                    <div className="flex items-center gap-3">
                      <motion.button
                        animate={{ opacity: isExpanding ? 0 : 1, x: isExpanding ? 20 : 0 }}
                        transition={{ duration: 0.2 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleViewAll}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors pointer-events-auto"
                      >
                        View all
                      </motion.button>
                      <motion.button
                        animate={{ opacity: isExpanding ? 0 : 1, scale: isExpanding ? 0 : 1 }}
                        transition={{ duration: 0.15 }}
                        whileHover={{ rotate: 90 }}
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors pointer-events-auto"
                      >
                        <X size={20} />
                      </motion.button>
                    </div>
                  </div>
                  <motion.div
                    animate={{ opacity: isExpanding ? 0 : 1 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3 max-h-70 overflow-hidden"
                  >
                    <p className="text-muted-foreground text-center py-8">No new notifications</p>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
