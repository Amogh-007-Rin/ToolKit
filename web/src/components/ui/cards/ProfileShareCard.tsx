"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, QrCode, X } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";

interface ProfileShareCardProps {
  isOpen: boolean;
  tag: string | null;
  onClose: () => void;
}

export default function ProfileShareCard({ isOpen, tag, onClose }: ProfileShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const generatedRef = useRef(false);

  const profileUrl =
    tag && typeof window !== "undefined"
      ? `${window.location.origin}/profile/${tag}`
      : null;

  useEffect(() => {
    if (!isOpen || !profileUrl || generatedRef.current) return;
    generatedRef.current = true;
    setQrDataUrl(null);
    setQrError(false);

    QRCode.toDataURL(profileUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#292d32", light: "#ffffff" },
    })
      .then((url: string) => setQrDataUrl(url))
      .catch(() => setQrError(true));

    return () => {
      generatedRef.current = false;
    };
  }, [isOpen, profileUrl]);

  const handleCopyTag = async () => {
    if (!tag) return;
    await navigator.clipboard.writeText(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    if (!profileUrl) return;
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6, y: 12 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="pointer-events-auto w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
            >
              <div className="w-full h-16 flex items-center justify-between px-6 border-b border-border">
                <p className="text-xl text-foreground font-semibold">Share Profile</p>
                <motion.button
                  onClick={onClose}
                  whileHover={{ rotate: 90 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="flex flex-col items-center gap-6 p-8">
                {!tag ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <QrCode size={48} className="text-muted-foreground" />
                    <p className="text-foreground font-medium text-sm">No toolkit tag set</p>
                    <p className="text-muted-foreground text-xs text-center max-w-xs">
                      Set a unique tag in your Edit Profile settings to generate a shareable QR code and link.
                    </p>
                  </div>
                ) : (
                  <>
                <div className="w-60 h-60 rounded-2xl bg-white border border-border flex items-center justify-center overflow-hidden">
                  {qrDataUrl ? (
                    <Image src={qrDataUrl} alt="Profile QR Code" width={240} height={240} className="w-full h-full p-2" unoptimized />
                  ) : qrError ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <QrCode size={32} />
                      <p className="text-xs">Could not generate QR code</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <QrCode size={32} className="animate-pulse" />
                      <p className="text-xs">Generating...</p>
                    </div>
                  )}
                </div>

                <div className="w-full flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Your Toolkit Tag</p>
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-input border border-border rounded-xl px-4 flex items-center text-foreground text-sm">
                        {tag}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyTag}
                        className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shrink-0"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </motion.button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-muted-foreground font-medium">Profile Link</p>
                    <div className="flex gap-2">
                      <div className="flex-1 h-10 bg-input border border-border rounded-xl px-4 flex items-center text-foreground text-sm truncate">
                        {profileUrl}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleCopyLink}
                        className="w-10 h-10 bg-primary text-primary-foreground rounded-xl flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shrink-0"
                      >
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </motion.button>
                    </div>
                  </div>
                </div>
                </>
                )}
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
