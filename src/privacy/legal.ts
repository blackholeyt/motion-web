/*
 * Privacy policy and imprint, phase 6. DRAFTS: written from what the app actually does, but not
 * checked by a lawyer. Everything in [square brackets] is a placeholder that must be replaced before
 * Motion is offered to the public (checklist in docs/DATENSCHUTZ.md, section 5). While legalDraft is
 * true, both pages show a draft banner; legal.test.ts fails if it is switched off with placeholders left.
 *
 * The texts are German only: Motion is offered in Germany, and the German version is the binding one.
 */

export const legalDraft = true
export const legalUpdated = '[DATUM DER VERÖFFENTLICHUNG]'

export interface LegalSection {
  heading: string
  paragraphs: string[]
  list?: string[]
}

export const imprint: LegalSection[] = [
  {
    heading: 'Angaben gemäß § 5 DDG',
    paragraphs: ['[VORNAME NACHNAME]', '[STRASSE HAUSNUMMER]', '[PLZ ORT]', 'Deutschland'],
  },
  {
    heading: 'Kontakt',
    paragraphs: ['E-Mail: [KONTAKT-E-MAIL]', '[ZWEITER SCHNELLER KONTAKTWEG, z. B. Telefon oder Kontaktformular]'],
  },
  {
    heading: 'Hinweis',
    paragraphs: [
      'Motion ist ein privates, nicht kommerzielles Projekt. Es gibt keine Werbung und keine kostenpflichtigen Funktionen.',
      'Plattform der EU-Kommission zur Online-Streitbeilegung: Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.',
    ],
  },
]

export const privacyPolicy: LegalSection[] = [
  {
    heading: '1. Verantwortlicher',
    paragraphs: [
      'Verantwortlich für die Datenverarbeitung in Motion ist: [VORNAME NACHNAME], [STRASSE HAUSNUMMER], [PLZ ORT], E-Mail: [KONTAKT-E-MAIL].',
      'Einen Datenschutzbeauftragten gibt es nicht, weil keine Pflicht dazu besteht.',
    ],
  },
  {
    heading: '2. Das Wichtigste in Kürze',
    paragraphs: [],
    list: [
      'Motion funktioniert ohne Konto. Dann bleiben alle Daten auf deinem Gerät und werden nicht an uns übertragen.',
      'Es gibt keine Werbung, kein Tracking, keine Analyse-Tools und keine Cookies zu Werbezwecken.',
      'Körpergewicht und Schlafindex sind Gesundheitsdaten. Motion verarbeitet sie nur mit deiner ausdrücklichen Einwilligung und nur, um dir deinen Fortschritt zu zeigen.',
      'Mit einem freiwilligen Konto werden deine Daten zur Sicherung und für mehrere Geräte auf Servern in Frankfurt am Main gespeichert.',
      'Du kannst deine Daten jederzeit als JSON oder CSV exportieren und dein Konto mit allen Daten in der App löschen.',
    ],
  },
  {
    heading: '3. Daten auf deinem Gerät',
    paragraphs: [
      'Motion speichert im Speicher deines Browsers bzw. der installierten App (IndexedDB und localStorage): Trainings, Sätze, Routinen, Trainingsplan, Übungen, Rekordziele, Ausdauer-Einheiten, Körpergewicht, Schlafindex, XP, dein Profil (Name, Einheiten, Zielgewicht) sowie Einstellungen und deine Einwilligung.',
      'Diese Daten verlassen dein Gerät ohne Konto nicht. Zweck: die Funktionen der App. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO und für Gesundheitsdaten deine ausdrückliche Einwilligung nach Art. 9 Abs. 2 lit. a DSGVO. Das Speichern auf deinem Gerät ist für den von dir gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG).',
      'Löschen: Einstellungen → „Daten auf diesem Gerät löschen“ oder Löschen der Website-Daten bzw. der App.',
    ],
  },
  {
    heading: '4. Bereitstellung der App (Hosting)',
    paragraphs: [
      'Die App wird über Cloudflare Pages ausgeliefert (Cloudflare, Inc., 101 Townsend St., San Francisco, CA 94107, USA). Beim Laden der App verarbeitet Cloudflare technisch notwendige Verbindungsdaten wie deine IP-Adresse, Zeitpunkt, angefragte Datei und Browserkennung, um die App auszuliefern und vor Angriffen zu schützen.',
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren Auslieferung). Cloudflare ist unter dem EU-US Data Privacy Framework zertifiziert [PRÜFEN]. Mit Cloudflare besteht ein Vertrag zur Auftragsverarbeitung [PRÜFEN: Self-Serve-DPA von Cloudflare]. Speicherdauer der Protokolle: [PRÜFEN].',
    ],
  },
  {
    heading: '5. Konto und Cloud-Sicherung (freiwillig)',
    paragraphs: [
      'Wenn du dich anmeldest, speichern wir deine E-Mail-Adresse, eine zufällige Konto-ID und alle in Abschnitt 3 genannten Trainings- und Gesundheitsdaten in deinem Konto, damit sie gesichert sind und auf mehreren Geräten zur Verfügung stehen. Außerdem speichern wir Zeitpunkt und Version deiner Einwilligung.',
      'Dienstleister ist Supabase ([FIRMA UND ANSCHRIFT AUS DEM SUPABASE-DPA ÜBERNEHMEN]). Die Datenbank liegt in der Region Frankfurt am Main (AWS eu-central-1). Supabase verarbeitet die Daten in unserem Auftrag; ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO [ABGESCHLOSSEN AM DATUM]. Soweit Supabase oder seine Unterauftragnehmer Daten außerhalb der EU verarbeiten, geschieht das auf Grundlage der EU-Standardvertragsklauseln [PRÜFEN].',
      'Bei der Anmeldung protokolliert Supabase technisch notwendige Daten wie IP-Adresse und Zeitpunkt, um Missbrauch zu verhindern.',
      'Rechtsgrundlage: deine ausdrückliche Einwilligung (Art. 6 Abs. 1 lit. a und Art. 9 Abs. 2 lit. a DSGVO), die du beim Anmelden gibst, sowie Art. 6 Abs. 1 lit. b DSGVO für die Bereitstellung des Kontos.',
    ],
  },
  {
    heading: '6. Anmeldung per E-Mail-Code',
    paragraphs: [
      'Für die Anmeldung per Code senden wir dir eine E-Mail. Der Versand läuft über einen E-Mail-Dienst von Google (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland). Dabei werden deine E-Mail-Adresse und der Inhalt der E-Mail (der Code) verarbeitet. [PRÜFEN: Für ein privates Gmail-Konto gibt es keinen Vertrag zur Auftragsverarbeitung; vor der Veröffentlichung auf einen Anbieter mit AV-Vertrag wechseln, siehe docs/DATENSCHUTZ.md.]',
    ],
  },
  {
    heading: '7. Anmeldung mit Google',
    paragraphs: [
      'Wenn du „Mit Google fortfahren“ wählst, wirst du zu Google weitergeleitet (Google Ireland Limited, Anschrift wie oben). Google teilt uns deine E-Mail-Adresse, deinen Namen und dein Profilbild mit; wir verwenden davon nur die E-Mail-Adresse. Google erfährt, dass du dich bei Motion anmeldest. Für die Verarbeitung durch Google gilt die Datenschutzerklärung von Google. Rechtsgrundlage: deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).',
    ],
  },
  {
    heading: '8. Speicherdauer',
    paragraphs: [
      'Daten in deinem Konto speichern wir, bis du das Konto löschst. Beim Löschen entfernt Motion sofort alle Datensätze des Kontos und die Anmeldung selbst; auf dem Gerät, auf dem du löschst, wird auch die lokale Kopie entfernt. Auf anderen Geräten bleibt die lokale Kopie, bis du dich dort abmeldest oder die Daten dort löschst.',
      'Eigene Sicherungskopien der Datenbank: [PRÜFEN: Wie lange werden manuelle Datenbank-Sicherungen aufbewahrt? z. B. höchstens 30 Tage].',
    ],
  },
  {
    heading: '9. Deine Rechte',
    paragraphs: ['Du hast das Recht auf:'],
    list: [
      'Auskunft über deine Daten (Art. 15 DSGVO) und eine Kopie: in der App über den Export als JSON oder CSV.',
      'Berichtigung (Art. 16 DSGVO): Alle Einträge lassen sich in der App bearbeiten.',
      'Löschung (Art. 17 DSGVO): in der App über „Konto löschen“ bzw. „Daten auf diesem Gerät löschen“.',
      'Einschränkung der Verarbeitung (Art. 18 DSGVO) und Widerspruch (Art. 21 DSGVO).',
      'Datenübertragbarkeit (Art. 20 DSGVO): Der JSON-Export enthält alle Daten in einem maschinenlesbaren Format.',
      'Widerruf deiner Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO): durch Löschen des Kontos bzw. der Daten auf dem Gerät oder per E-Mail an [KONTAKT-E-MAIL]. Die bis dahin erfolgte Verarbeitung bleibt rechtmäßig.',
      'Beschwerde bei einer Datenschutz-Aufsichtsbehörde (Art. 77 DSGVO), zum Beispiel bei [ZUSTÄNDIGE AUFSICHTSBEHÖRDE, z. B. Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen].',
    ],
  },
  {
    heading: '10. Mindestalter',
    paragraphs: ['Motion richtet sich an Personen ab 16 Jahren. Wer jünger ist, braucht die Zustimmung der Eltern (Art. 8 DSGVO).'],
  },
  {
    heading: '11. Keine automatisierten Entscheidungen',
    paragraphs: ['Motion trifft keine automatisierten Entscheidungen im Sinne von Art. 22 DSGVO und erstellt keine Profile zu Werbezwecken. XP, Level und Rekorde werden nur für dich berechnet.'],
  },
  {
    heading: '12. Änderungen',
    paragraphs: [`Wenn sich diese Datenschutzerklärung wesentlich ändert, fragt Motion beim nächsten Start erneut nach deiner Einwilligung. Stand: ${legalUpdated}.`],
  },
]

/** Placeholders left in a text: everything in square brackets. */
export function placeholders(sections: LegalSection[]): string[] {
  const text = sections.flatMap((section) => [section.heading, ...section.paragraphs, ...(section.list ?? [])]).join('\n')
  return [...text.matchAll(/\[[^\]]+\]/g)].map((match) => match[0])
}
