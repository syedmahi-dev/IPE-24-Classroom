'use client'

import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(useGSAP)

/**
 * StaggerList — wraps a list of items and fades them in with stagger.
 * Each direct child gets the animation. Works in server component pages
 * by wrapping just the list portion as a client component.
 */
export function StaggerList({
  children,
  className = '',
  stagger = 0.06,
  distance = 20,
}: {
  children: React.ReactNode
  className?: string
  stagger?: number
  distance?: number
}) {
  const ref = useRef<HTMLDivElement>(null)

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

        gsap.from('.gsap-stagger-item', {
          autoAlpha: 0,
          y: distance,
          duration: 0.45,
          stagger,
          ease: 'power2.out',
        })
      }
    )
  }, { scope: ref })

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
