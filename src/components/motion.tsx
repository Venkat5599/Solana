"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";

/** Fade + rise when scrolled into view. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Big headline that clips up line-by-line on mount. */
export function ClipLine({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  // paddingBottom leaves room for descenders (g, p, y) that the clip would
  // otherwise crop; the matching negative margin keeps line spacing unchanged.
  return (
    <span
      className="block clip-reveal"
      style={{ paddingBottom: "0.16em", marginBottom: "-0.16em" }}
    >
      <motion.span
        className={`block ${className ?? ""}`}
        initial={{ y: "110%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Button/link that subtly pulls toward the cursor. */
export function Magnetic({
  children,
  className,
  strength = 0.35,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 250, damping: 18 });
  const y = useSpring(my, { stiffness: 250, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    mx.set((e.clientX - (r.left + r.width / 2)) * strength);
    my.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x, y }}
      className={`inline-block ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

/** Infinite marquee of words. */
export function Marquee({ items }: { items: string[] }) {
  const row = (
    <span className="marquee-track">
      {[...items, ...items].map((t, i) => (
        <span key={i} className="inline-flex items-center">
          <span
            className="text-[#bbb] text-sm uppercase tracking-[0.18em] px-6"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {t}
          </span>
          <span className="w-1 h-1 rounded-full bg-[#22c55e]" />
        </span>
      ))}
    </span>
  );
  return <div className="marquee-mask overflow-hidden w-full">{row}</div>;
}

export { motion, useTransform };
