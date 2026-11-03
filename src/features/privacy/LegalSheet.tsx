import { Fragment, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { about, legalDraft, privacyPolicy, type LegalSection } from '../../privacy/legal'
import { Sheet } from '../../ui/Sheet'
import { TextButton } from '../../ui/controls'
import styles from './privacy.module.css'

export type LegalPage = 'privacy' | 'about'

/** Placeholders in [square brackets] are highlighted, so nothing unfinished goes unnoticed. */
function withPlaceholders(text: string): ReactNode {
  return text.split(/(\[[^\]]+\])/g).map((part, index) => (part.startsWith('[') ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>))
}

function Sections({ sections }: { sections: LegalSection[] }) {
  return (
    <div className={styles.legal}>
      {sections.map((section) => (
        <section key={section.heading}>
          <h3>{section.heading}</h3>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{withPlaceholders(paragraph)}</p>
          ))}
          {section.list && (
            <ul>
              {section.list.map((item) => (
                <li key={item}>{withPlaceholders(item)}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}

/** Privacy notice and "About this project", readable before consent and from Settings. */
export function LegalSheet({ page, onClose }: { page: LegalPage | null; onClose: () => void }) {
  const { t, language } = useT()
  if (!page) return null
  return (
    <Sheet open onClose={onClose} title={page === 'privacy' ? t('Privacy policy') : t('About this project')} leading={<TextButton onClick={onClose}>{t('Done')}</TextButton>}>
      {legalDraft && (
        <p className={styles.draft} data-testid="legalDraft">
          {t('Draft: not yet legally reviewed. Highlighted placeholders must be replaced before Motion is published.')}
        </p>
      )}
      {language !== 'de' && <p className={styles.note}>{t('The legal texts are available in German only.')}</p>}
      <Sections sections={page === 'privacy' ? privacyPolicy : about} />
    </Sheet>
  )
}

export function LegalLinks({ onOpen }: { onOpen: (page: LegalPage) => void }) {
  const { t } = useT()
  return (
    <div className={styles.links}>
      <button type="button" onClick={() => onOpen('privacy')} data-testid="openPrivacyPolicy">
        {t('Privacy policy')}
      </button>
      <button type="button" onClick={() => onOpen('about')} data-testid="openAbout">
        {t('About this project')}
      </button>
    </div>
  )
}
