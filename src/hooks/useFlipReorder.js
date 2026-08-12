import { useLayoutEffect, useRef } from 'react'

const DURATION_MS = 420
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * FLIP-animates a keyed list so items visibly slide when their order changes.
 *
 * Register each item's element with the returned `registerItem(key)` ref
 * callback. After every render, items that moved are snapped back to their old
 * position and released, so the browser animates the difference.
 *
 * Vertical only — the home list is a single column — and measured with
 * offsetTop so scrolling between renders doesn't fake a move.
 *
 * @returns {(key: string) => (el: HTMLElement|null) => void}
 */
export default function useFlipReorder() {
  const elements = useRef(new Map())
  const positions = useRef(new Map())
  const callbacks = useRef(new Map())

  // Stable per-key callback, so React isn't detaching and re-attaching every
  // ref on every render.
  const registerItem = (key) => {
    if (!callbacks.current.has(key)) {
      callbacks.current.set(key, (el) => {
        if (el) elements.current.set(key, el)
        else elements.current.delete(key)
      })
    }
    return callbacks.current.get(key)
  }

  useLayoutEffect(() => {
    const reduceMotion = prefersReducedMotion()
    const seen = new Set()

    elements.current.forEach((el, key) => {
      seen.add(key)
      const next = el.offsetTop
      const prev = positions.current.get(key)
      positions.current.set(key, next)

      if (prev === undefined || reduceMotion) return
      const delta = prev - next
      if (Math.abs(delta) < 1) return

      // Invert: jump back to where it was, untransitioned...
      el.style.transition = 'none'
      el.style.transform = `translateY(${delta}px)`

      // ...then play: release on the next frame so the browser tweens it.
      requestAnimationFrame(() => {
        el.style.transition = `transform ${DURATION_MS}ms ${EASING}`
        el.style.transform = ''
      })
    })

    // Drop state for items that left the list (e.g. a phase change)
    positions.current.forEach((_, key) => {
      if (!seen.has(key)) {
        positions.current.delete(key)
        callbacks.current.delete(key)
      }
    })
  })

  return registerItem
}
