"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/** Cycles through `messages` every `intervalMs` while `active` is true — a small honest "here's
 * roughly what's happening" indicator for a multi-step process, not a literal progress bar. */
export function LoopingStatusMessage({
  messages,
  active,
  intervalMs = 1800,
  className,
}: {
  messages: string[];
  active: boolean;
  intervalMs?: number;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const [prevActive, setPrevActive] = useState(active);

  // Reset to the first message once the cycle stops, so the next time it starts it reads
  // coherently from the top rather than resuming wherever it last left off.
  if (prevActive !== active) {
    setPrevActive(active);
    if (!active) setIndex(0);
  }

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), intervalMs);
    return () => clearInterval(id);
  }, [active, messages.length, intervalMs]);

  if (!active) return null;

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.25 }}
        >
          {messages[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
