import { motion, useReducedMotion } from 'framer-motion';
import type { PropsWithChildren } from 'react';

interface RevealProps extends PropsWithChildren {
  readonly className?: string;
  readonly delay?: number;
}

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { y: 24 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ amount: 0.18, once: true }}
      whileInView={reduceMotion ? {} : { y: 0 }}
    >
      {children}
    </motion.div>
  );
}
