'use client'

import { motion } from 'framer-motion'
import type { CSSProperties, ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
  style?: CSSProperties
}

export default function PageTransition({ children, className, style }: PageTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{
        enter: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
        exit:  { duration: 0.15, ease: [0.4, 0, 1, 1] },
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
