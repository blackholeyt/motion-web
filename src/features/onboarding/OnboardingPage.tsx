import { ChevronLeft, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { Masthead } from '../../ui/components'
import styles from './onboarding.module.css'

/** OnboardingPage.swift: one step at a time, navigation outside its content. */
export function OnboardingPage({
  category,
  title,
  detail,
  icon: Icon,
  step,
  total,
  back,
  onClose,
  children,
  footer,
  titleID = 'onboardingPageTitle',
}: {
  category: string
  title: string
  detail: string
  icon: LucideIcon
  step?: number
  total?: number
  back?: () => void
  onClose?: () => void
  children?: ReactNode
  footer: ReactNode
  titleID?: string
}) {
  const { t } = useT()
  const heading = useRef<HTMLHeadingElement>(null)
  // Move focus to the new title on every step, as VoiceOver does in the iOS app.
  useEffect(() => heading.current?.focus(), [title, step])
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        {onClose && (
          <button type="button" className={styles.close} onClick={onClose} data-testid="closeOnboardingPreview">
            {t('Close')}
          </button>
        )}
        <Masthead category={t(category)} accent="var(--action)" />
        <div className={styles.heading}>
          <Icon size={42} strokeWidth={1.25} className={styles.icon} aria-hidden="true" />
          <h1 ref={heading} tabIndex={-1} data-testid={titleID}>
            {title}
          </h1>
          <p>{detail}</p>
        </div>
        {children}
      </div>
      <div className={styles.footer}>
        {footer}
        <div className={styles.stepRow}>
          {back ? (
            <button type="button" className={styles.back} onClick={back} data-testid="onboardingBack">
              <ChevronLeft size={16} aria-hidden="true" /> {t('Back')}
            </button>
          ) : (
            <span />
          )}
          {step !== undefined && total !== undefined && (
            <span aria-label={t('Step {0} of {1}', [step, total])}>
              {step} / {total}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export function Choice({ title, icon: Icon, onClick, testID }: { title: string; icon: LucideIcon; onClick: () => void; testID?: string }) {
  return (
    <button type="button" className={styles.choice} onClick={onClick} data-testid={testID}>
      <Icon size={22} aria-hidden="true" />
      <span>{title}</span>
    </button>
  )
}

export function Continue({ children, onClick, disabled, testID }: { children: ReactNode; onClick: () => void; disabled?: boolean; testID?: string }) {
  return (
    <button type="button" className={styles.continue} onClick={onClick} disabled={disabled} data-testid={testID}>
      {children}
    </button>
  )
}

export function Quiet({ children, onClick, testID }: { children: ReactNode; onClick: () => void; testID?: string }) {
  return (
    <button type="button" className={styles.quiet} onClick={onClick} data-testid={testID}>
      {children}
    </button>
  )
}
