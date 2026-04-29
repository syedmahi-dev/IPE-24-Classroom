'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP, ScrollTrigger)

/** Shared helper: returns true if reduced motion is preferred */
function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

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
        if (reduced) return

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

/**
 * RevealOnScroll — reveals children when they enter the viewport.
 * Uses ScrollTrigger.batch() for efficient multi-element reveals.
 * 
 * IMPORTANT: Items are visible by default (no flash of invisible content).
 * GSAP sets them hidden and then animates them in only after hydration.
 * Items already in the viewport on mount are animated immediately.
 */
export function RevealOnScroll({
  children,
  from = 'bottom',
  distance = 40,
  duration = 0.7,
  stagger = 0.1,
  threshold = 'top 85%',
  className = '',
}: {
  children: React.ReactNode
  from?: 'bottom' | 'top' | 'left' | 'right'
  distance?: number
  duration?: number
  stagger?: number
  threshold?: string
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return

    const items = gsap.utils.toArray<HTMLElement>('.gsap-reveal-item', containerRef.current!)
    if (!items.length) return

    const fromProps: gsap.TweenVars = { opacity: 0 }
    if (from === 'bottom') fromProps.y = distance
    else if (from === 'top') fromProps.y = -distance
    else if (from === 'left') fromProps.x = -distance
    else if (from === 'right') fromProps.x = distance

    // Set initial hidden state
    gsap.set(items, fromProps)

    // Use batch for scroll-triggered reveals
    ScrollTrigger.batch(items, {
      start: threshold,
      onEnter: (elements) => {
        gsap.to(elements, {
          opacity: 1,
          x: 0,
          y: 0,
          duration,
          stagger,
          ease: 'power3.out',
          overwrite: true,
        })
      },
      once: true,
    })

    // Force a refresh so ScrollTrigger detects items already in viewport
    ScrollTrigger.refresh()
  }, { scope: containerRef })

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

/**
 * CountUp — animates a number from 0 to target value when it enters viewport.
 */
export function CountUp({
  end,
  duration = 2,
  suffix = '',
  prefix = '',
  className = '',
}: {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const countRef = useRef({ value: 0 })

  useGSAP(() => {
    if (prefersReducedMotion()) {
      if (ref.current) ref.current.textContent = `${prefix}${end}${suffix}`
      return
    }

    gsap.to(countRef.current, {
      value: end,
      duration,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top 85%',
        once: true,
      },
      onUpdate: () => {
        if (ref.current) {
          const val = Math.round(countRef.current.value)
          ref.current.textContent = `${prefix}${val.toLocaleString()}${suffix}`
        }
      },
    })
  }, { scope: ref })

  return <span ref={ref} className={className}>{prefix}0{suffix}</span>
}

/**
 * ParallaxFloat — subtle parallax movement based on scroll position.
 * Only uses transforms for performance.
 */
export function ParallaxFloat({
  children,
  speed = 0.15,
  className = '',
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return

    gsap.to('.gsap-parallax-inner', {
      y: () => -speed * 100,
      ease: 'none',
      scrollTrigger: {
        trigger: ref.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: 1,
      },
    })
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      <div className="gsap-parallax-inner will-change-transform">{children}</div>
    </div>
  )
}

/**
 * MagneticHover — element follows cursor within its bounds on hover.
 * Uses gsap.quickTo() for 60fps mouse-follower performance.
 */
export function MagneticHover({
  children,
  strength = 0.3,
  className = '',
}: {
  children: React.ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const el = ref.current
    if (!el) return

    const inner = el.querySelector('.gsap-magnetic-inner') as HTMLElement
    if (!inner) return

    const xTo = gsap.quickTo(inner, 'x', { duration: 0.4, ease: 'power3' })
    const yTo = gsap.quickTo(inner, 'y', { duration: 0.4, ease: 'power3' })

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left - rect.width / 2) * strength
      const y = (e.clientY - rect.top - rect.height / 2) * strength
      xTo(x)
      yTo(y)
    }

    const onLeave = () => {
      xTo(0)
      yTo(0)
    }

    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength])

  return (
    <div ref={ref} className={className}>
      <div className="gsap-magnetic-inner will-change-transform">{children}</div>
    </div>
  )
}

/**
 * SmoothReveal — clips content and reveals with a wipe animation.
 */
export function SmoothReveal({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.8,
  className = '',
}: {
  children: React.ReactNode
  direction?: 'up' | 'down' | 'left' | 'right'
  delay?: number
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (prefersReducedMotion()) return

    const clipMap = {
      up: { from: 'inset(100% 0 0 0)', to: 'inset(0% 0 0 0)' },
      down: { from: 'inset(0 0 100% 0)', to: 'inset(0 0 0% 0)' },
      left: { from: 'inset(0 100% 0 0)', to: 'inset(0 0% 0 0)' },
      right: { from: 'inset(0 0 0 100%)', to: 'inset(0 0 0 0%)' },
    }

    const clip = clipMap[direction]

    gsap.fromTo(
      '.gsap-smooth-reveal',
      { clipPath: clip.from, opacity: 0.3 },
      {
        clipPath: clip.to,
        opacity: 1,
        duration,
        delay,
        ease: 'power3.inOut',
        scrollTrigger: {
          trigger: ref.current,
          start: 'top 85%',
          once: true,
        },
      }
    )
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      <div className="gsap-smooth-reveal">{children}</div>
    </div>
  )
}
