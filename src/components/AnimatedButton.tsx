import { motion } from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import type { PropsWithChildren } from 'react'
import { playUIClick, unlockAudio } from '../utils/audioManager'

type AnimatedButtonProps = PropsWithChildren<
  HTMLMotionProps<'button'> & {
    glow?: boolean
  }
>

export const AnimatedButton = ({
  children,
  className = '',
  glow = false,
  onClick,
  type = 'button',
  ...props
}: AnimatedButtonProps) => {
  const classes = glow ? 'glow-button' : 'glass-button'

  return (
    <motion.button
      {...props}
      type={type}
      data-ui-control="true"
      className={`${classes} ${className}`.trim()}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(event) => {
        unlockAudio()
        playUIClick()
        onClick?.(event)
      }}
    >
      {children}
    </motion.button>
  )
}
