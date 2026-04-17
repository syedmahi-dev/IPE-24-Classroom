'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/**
 * AnimateIn — wraps children in a container that fades + slides in on mount.
 * Uses GSAP with matchMedia to respect prefers-reduced-motion.
 * All animations use transforms + opacity only (compositor-friendly).
 */
export function AnimateIn({
  children,
  from = 'bottom',
  delay = 0,
  duration = 0.6,
  distance = 30,
  stagger = 0,
  className = '',
}: {
  children: React.ReactNode
  from?: 'bottom' | 'top' | 'left' | 'right' | 'none'
  delay?: number
  duration?: number
  distance?: number
  stagger?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        normal: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { reduced } = ctx.conditions!
        if (reduced) return // Skip animation for reduced-motion users

        const fromVars: gsap.TweenVars = {
          opacity: 0,
          duration,
          delay,
          ease: 'power2.out',
          stagger: stagger || undefined,
        }

        if (from === 'bottom') fromVars.y = distance
        else if (from === 'top') fromVars.y = -distance
        else if (from === 'left') fromVars.x = -distance
        else if (from === 'right') fromVars.x = distance

        // If stagger > 0, animate direct children; otherwise animate the container
        if (stagger > 0) {
          gsap.from('.gsap-stagger-child', fromVars)
        } else {
          gsap.from('.gsap-animate-target', fromVars)
        }
      }
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={className} style={{ visibility: 'visible' }}>
      {stagger > 0 ? (
        children
      ) : (
        <div className="gsap-animate-target">{children}</div>
      )}
    </div>
  )
}

/**
 * StaggerChildren — fades in each direct child with a stagger delay.
 */
export function StaggerChildren({
  children,
  from = 'bottom',
  delay = 0,
  duration = 0.5,
  distance = 24,
  stagger = 0.08,
  className = '',
}: {
  children: React.ReactNode
  from?: 'bottom' | 'top' | 'left' | 'right'
  delay?: number
  duration?: number
  distance?: number
  stagger?: number
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        normal: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { reduced } = ctx.conditions!
        if (reduced) return

        const fromVars: gsap.TweenVars = {
          opacity: 0,
          duration,
          delay,
          ease: 'power2.out',
          stagger,
        }

        if (from === 'bottom') fromVars.y = distance
        else if (from === 'top') fromVars.y = -distance
        else if (from === 'left') fromVars.x = -distance
        else if (from === 'right') fromVars.x = distance

        gsap.from('.gsap-child', fromVars)
      }
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

/**
 * PageTransition — wraps a page's content with a smooth fade-in-up on mount.
 */
export function PageTransition({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const mm = gsap.matchMedia()
    mm.add(
      {
        normal: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (ctx) => {
        const { reduced } = ctx.conditions!
        if (reduced) return

        gsap.from('.gsap-page', {
          opacity: 0,
          y: 16,
          duration: 0.4,
          ease: 'power2.out',
        })
      }
    )
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={className}>
      <div className="gsap-page">{children}</div>
    </div>
  )
}
