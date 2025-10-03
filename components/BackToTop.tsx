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
      className="fixed bottom-6 right-6 bg-[#0e5b4a] rounded-full shadow-lg p-3 hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#a38d6d]"
    >
      <span className="text-[#ffaa06] font-bold text-xl">↑</span>
    </button>
  );
}
