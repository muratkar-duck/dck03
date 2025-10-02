"use client";

import { useEffect, useState } from "react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <button
      type="button"
      aria-label="Yukarı dön"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 rounded-full bg-white/90 shadow-lg shadow-black/10 ring-1 ring-black/5 transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a38d6d]"
    >
      <span className="block px-4 py-3 text-sm font-medium text-[#5b4632]">↑</span>
    </button>
  );
}
