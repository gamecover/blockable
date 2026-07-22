import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

export function MainMenuButton({ children, imageSrc, onClick, disabled = false, delay = 0, description }) {
  const reduceMotion = useReducedMotion()
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <motion.button
      type="button"
      className="main-menu-button"
      aria-label={children}
      onClick={onClick}
      disabled={disabled}
      initial={reduceMotion ? false : { opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.28, delay: reduceMotion ? 0 : delay, ease: 'easeOut' }}
      whileHover={disabled || reduceMotion ? undefined : { scale: 1.015 }}
      whileTap={disabled || reduceMotion ? undefined : { scale: 0.985, y: 1 }}
    >
      {imageSrc && !imageFailed && <img src={imageSrc} alt="" aria-hidden="true" onError={() => setImageFailed(true)} />}
      <span className={`main-menu-button__label${imageSrc && !imageFailed ? ' visually-hidden' : ''}`}>{children}</span>
      {description && <small className="main-menu-button__description">{description}</small>}
    </motion.button>
  )
}
