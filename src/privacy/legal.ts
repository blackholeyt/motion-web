/*
 * Privacy notice and "About this project" for the private, non-commercial operation (decision of
 * 03.11.2026). Since 24.11.2026 anyone can sign in, but an account works only with the access code
 * Mathis hands out (since 25.11.2026). No surname or postal address is published.
 * The longer drafts for a public release (with imprint and placeholders) are in commit 22223c3;
 * docs/DATENSCHUTZ.md, section 5, lists what a public release would need.
 *
 * Not checked by a lawyer. While legalDraft is true, both pages show a draft banner; legal.test.ts
 * fails if it is switched off with [placeholders] left.
 *
 * The texts are German only: everyone who uses Motion reads German.
 */

export const legalDraft = false
export const legalUpdated = '25. November 2026'
export const contactEmail = 'motion.web.support@gmail.com'

export interface LegalSection {
  heading: string
  paragraphs: string[]
  list?: string[]
}

export const about: LegalSection[] = [
  {
    heading: 'Ein privates Projekt',
    paragraphs: [
      'Motion ist ein privates, nicht kommerzielles Projekt von Mathis. Es gibt keine Werbung, keine Käufe und keine Einnahmen.',
      'Motion ist für Mathis und seine Freunde gedacht. Ein Konto funktioniert nur mit einem Zugangscode, den Mathis persönlich weitergibt. Ohne Konto funktioniert Motion vollständig auf deinem Gerät.',
    ],
  },
  {
    heading: 'Kontakt',
    paragraphs: [`E-Mail: ${contactEmail}`],
  },
]

export const privacyPolicy: LegalSection[] = [
  {
    heading: 'Wer dahintersteckt',
    paragraphs: [
      `Motion ist ein privates, nicht kommerzielles Projekt von Mathis. Fragen, Auskunft oder Löschwünsche: ${contactEmail}.`,
    ],
  },
  {
    heading: 'Das Wichtigste in Kürze',
    paragraphs: [],
    list: [
      'Ohne Konto bleiben alle Daten auf deinem Gerät. Niemand sonst sieht sie.',
      'Keine Werbung, kein Tracking, keine Analyse-Tools, keine Werbe-Cookies.',
      'Körpergewicht ist ein Gesundheitsdatum. Motion nutzt es nur, um dir deinen Fortschritt zu zeigen.',
      'Mit Konto werden deine Daten zur Sicherung auf Servern in Frankfurt am Main gespeichert.',
      'Export als JSON oder CSV und Löschen von Konto oder Gerätedaten gehen jederzeit in den Einstellungen.',
    ],
  },
  {
    heading: 'Auf deinem Gerät',
    paragraphs: [
      'Motion speichert im Speicher des Browsers bzw. der installierten App: Trainings und Sätze mit deinen Notizen, Routinen, Trainingsplan, Übungen und deine Ziele dafür, Ausdauer-Einheiten, Körpergewicht, XP, dein Profil (Name, Einheiten, Zielgewicht), Einstellungen, eine Liste importierter Sicherungen (Dateiname, Zeitpunkt, Anzahl der Einträge) und deine Einwilligung.',
      'Pausen-Benachrichtigungen erzeugt dein Gerät selbst. Dafür werden keine Daten an einen Server geschickt.',
      'Löschen: Einstellungen → „Daten auf diesem Gerät löschen“, oder die Website-Daten bzw. die App entfernen.',
    ],
  },
  {
    heading: 'Laden der App',
    paragraphs: [
      'Die App wird über GitHub Pages ausgeliefert (GitHub, Inc., USA). Beim Laden verarbeitet GitHub technisch nötige Verbindungsdaten wie IP-Adresse, Zeitpunkt und Browserkennung, um die App auszuliefern und vor Angriffen zu schützen.',
    ],
  },
  {
    heading: 'Konto und Cloud-Sicherung',
    paragraphs: [
      'Mit einem Konto werden deine E-Mail-Adresse, eine zufällige Konto-ID, Zeitpunkt und Version deiner Einwilligung sowie alle oben genannten Trainings- und Gesundheitsdaten bei Supabase (Supabase Inc., USA) gespeichert, damit sie gesichert sind und auf mehreren Geräten zur Verfügung stehen. Die Datenbank liegt in Frankfurt am Main. Bei der Anmeldung protokolliert Supabase technisch nötige Daten wie IP-Adresse und Zeitpunkt.',
      'Schlafwerte aus frühen Versionen von Motion bleiben, falls es welche gibt, in deinem Konto, bis du es löschst. Motion erfasst keine neuen Schlafwerte mehr.',
      'Das passiert nur mit deiner ausdrücklichen Einwilligung, die du beim Anmelden gibst. Mathis kann die Daten im Supabase-Dashboard technisch einsehen, schaut sie aber nicht an und gibt sie an niemanden weiter.',
    ],
  },
  {
    heading: 'Anmeldung',
    paragraphs: [
      'Der Anmeldecode kommt per E-Mail über ein Gmail-Konto von Motion (Google). Dabei werden deine E-Mail-Adresse und der Code verarbeitet.',
      'Bei „Mit Google fortfahren“ übermittelt Google deine E-Mail-Adresse, deinen Namen und dein Profilbild; Motion verwendet davon nur die E-Mail-Adresse. Google erfährt dabei, dass du dich bei Motion anmeldest.',
    ],
  },
  {
    heading: 'Zugangscode',
    paragraphs: [
      'Ein neues Konto braucht einmal den Zugangscode von Mathis. Dafür wird gespeichert, ob und wann dein Konto freigeschaltet wurde. Die Freischaltung wird mit dem Konto gelöscht.',
      'Gibst du einen falschen Code ein, werden deine Konto-ID und der Zeitpunkt festgehalten, damit niemand den Code durch Ausprobieren erraten kann. Einträge, die älter als einen Tag sind, werden bei der nächsten Code-Prüfung gelöscht.',
    ],
  },
  {
    heading: 'Löschen und Widerruf',
    paragraphs: [
      'Daten in deinem Konto bleiben gespeichert, bis du das Konto löschst. „Konto löschen“ entfernt sofort alle Einträge des Kontos und die Anmeldung selbst, und auf dem Gerät, auf dem du löschst, auch die lokale Kopie. Auf anderen Geräten bleibt die lokale Kopie, bis du dich dort abmeldest oder die Daten dort löschst.',
      'Deine Einwilligung kannst du jederzeit widerrufen: durch Löschen des Kontos bzw. der Gerätedaten oder per E-Mail. Auskunft bekommst du jederzeit über den Export oder per E-Mail.',
    ],
  },
  {
    heading: 'Alter',
    paragraphs: ['Wer jünger als 16 ist, braucht die Zustimmung der Eltern.'],
  },
  {
    heading: 'Stand',
    paragraphs: [`${legalUpdated}. Ändert sich hier etwas Wesentliches, fragt Motion beim nächsten Start erneut nach deiner Einwilligung.`],
  },
]

/** Placeholders left in a text: everything in square brackets. */
export function placeholders(sections: LegalSection[]): string[] {
  const text = sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.list ?? [])]).join('\n')
  return [...text.matchAll(/\[[^\]]+\]/g)].map((match) => match[0])
}
