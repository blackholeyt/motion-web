import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import { ribbonFaces } from './sculpture'
import { ease, openingDuration, openingOpacity, openingProgress, reducedOpeningDuration } from './timeline'
import styles from './opening.module.css'

const letters = Array.from('MOTION')

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

function draw(canvas: HTMLCanvasElement, progress: number) {
  const ratio = window.devicePixelRatio || 1
  const { clientWidth: width, clientHeight: height } = canvas
  if (canvas.width !== Math.round(width * ratio)) canvas.width = Math.round(width * ratio)
  if (canvas.height !== Math.round(height * ratio)) canvas.height = Math.round(height * ratio)
  const context = canvas.getContext('2d')
  if (!context) return
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const style = getComputedStyle(canvas)
  const isLight = style.colorScheme.includes('light') && !style.colorScheme.includes('dark')
  const action = style.getPropertyValue('--action').trim() || '#a5ddcb'
  for (const face of ribbonFaces(progress, width, height)) {
    const light = isLight ? 0.3 + face.light * 0.52 : face.light
    const [p0, p1, p2, p3] = face.points as [[number, number], [number, number], [number, number], [number, number]]
    const gradient = context.createLinearGradient(p0[0], p0[1], p1[0], p1[1])
    const grey = (value: number) => `rgb(${Math.round(value * 255)},${Math.round(value * 255)},${Math.round(value * 255)})`
    gradient.addColorStop(0, grey(light * (isLight ? 0.7 : 0.48)))
    gradient.addColorStop(0.28, grey(light))
    gradient.addColorStop(0.8, grey(light * 0.76))
    gradient.addColorStop(1, grey(Math.min(1, light + 0.14)))
    context.beginPath()
    context.moveTo(...p0)
    context.lineTo(...p1)
    context.lineTo(...p2)
    context.lineTo(...p3)
    context.closePath()
    context.fillStyle = gradient
    context.fill()
    context.beginPath()
    context.moveTo(...p1)
    context.lineTo(...p2)
    context.globalAlpha = 0.1 + face.light * 0.3
    context.strokeStyle = action
    context.lineWidth = 0.45
    context.stroke()
    context.globalAlpha = 1
  }
}

/** Ported from OpeningAnimationView.swift: 2.2 s, or a static 0.35 s frame with Reduce Motion. */
export function OpeningAnimation({ onFinish }: { onFinish: () => void }) {
  const { t } = useT()
  const canvas = useRef<HTMLCanvasElement>(null)
  const [reduced] = useState(prefersReducedMotion)
  const [progress, setProgress] = useState(0)
  const [wide, setWide] = useState(() => window.innerWidth > window.innerHeight * 1.2)

  useEffect(() => {
    const started = performance.now()
    let frame = 0
    const tick = (now: number) => {
      const value = openingProgress((now - started) / 1000, reduced)
      setProgress(value)
      if (!reduced && canvas.current) draw(canvas.current, value)
      if (value < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    const done = window.setTimeout(onFinish, (reduced ? reducedOpeningDuration : openingDuration) * 1000)
    // Backgrounding cancels the presentation, as on iOS.
    const hide = () => document.visibilityState === 'hidden' && onFinish()
    const resize = () => setWide(window.innerWidth > window.innerHeight * 1.2)
    document.addEventListener('visibilitychange', hide)
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(done)
      document.removeEventListener('visibilitychange', hide)
      window.removeEventListener('resize', resize)
    }
  }, [onFinish, reduced])

  const shown = reduced ? 0.82 : progress
  const layout = reduced ? styles.reduced : wide ? styles.wide : styles.tall

  return (
    <div
      className={`${styles.opening} ${layout}`}
      style={{ opacity: openingOpacity(progress, reduced) }}
      role="img"
      aria-label={t('Motion. Make every rep count.')}
      data-testid="opening"
    >
      <div className={styles.glow} aria-hidden="true" />
      {!reduced && (
        <>
          <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
          <div className={styles.horizon} style={{ opacity: ease(shown, 0.45, 0.75) }} aria-hidden="true" />
        </>
      )}
      <div className={styles.top} aria-hidden="true">
        <span>STRENGTH IN MOTION</span>
        <span className={styles.marks}>
          <i />
          <i />
        </span>
      </div>
      <div className={styles.wordmark} aria-hidden="true">
        <div className={styles.letters}>
          {letters.map((letter, index) => {
            const reveal = reduced ? 1 : ease(shown, 0.42 + index * 0.018, 0.65 + index * 0.018)
            return (
              <span key={index} style={{ opacity: reveal, transform: `translateY(${(1 - reveal) * 100}%)` }}>
                {letter}
              </span>
            )
          })}
        </div>
        <span className={styles.tagline} style={{ opacity: reduced ? 1 : ease(shown, 0.67, 0.82) }}>
          MAKE EVERY REP COUNT.
        </span>
      </div>
    </div>
  )
}
