import type { Language } from '../i18n'
import { aiCSVColumns, buildCSVRows, toCSV } from './csvExport'

/*
 * "Analyse with AI": Motion hands a CSV of the chosen period plus a ready prompt to an AI chat.
 * No AI provider lets a web page attach a file, so on phones the share sheet carries file and
 * prompt to the AI app; elsewhere the file is downloaded, the prompt copied and the chat opened.
 * Nothing is sent anywhere by Motion itself.
 */

export const GUIDE_URL = 'https://blackholeyt.github.io/muskelaufbau/'

/** Weeks of training to include; null means everything. */
export type AIPeriod = 4 | 8 | 12 | 26 | 52 | null
export const aiPeriods: AIPeriod[] = [4, 8, 12, 26, 52, null]

export type AITarget = 'chatgpt' | 'claude' | 'perplexity'
export const aiTargets: { id: AITarget; label: string; url: string }[] = [
  { id: 'chatgpt', label: 'ChatGPT', url: 'https://chatgpt.com/' },
  { id: 'claude', label: 'Claude', url: 'https://claude.ai/new' },
  { id: 'perplexity', label: 'Perplexity', url: 'https://www.perplexity.ai/' },
]

export function periodStart(period: AIPeriod, now = new Date()): Date | null {
  if (period === null) return null
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - period * 7)
  return start
}

export interface AIExport {
  file: File
  prompt: string
  /** Completed workouts in the file. */
  workouts: number
}

export async function buildAIExport(period: AIPeriod, language: Language, now = new Date()): Promise<AIExport> {
  const rows = await buildCSVRows({ since: periodStart(period, now), muscle: true })
  const csv = toCSV(rows, aiCSVColumns)
  const name = `Motion-KI-Export-${now.toISOString().slice(0, 10)}.csv`
  // The byte order mark keeps umlauts readable, as in the regular CSV export.
  const file = new File(['﻿' + csv], name, { type: 'text/csv' })
  return { file, prompt: aiPrompt(period, language, name), workouts: rows.filter((row) => row.type === 'workout').length }
}

export function aiPrompt(period: AIPeriod, language: Language, fileName: string): string {
  return language === 'de' ? germanPrompt(period, fileName) : englishPrompt(period, fileName)
}

function germanPrompt(period: AIPeriod, fileName: string) {
  const range = period === null ? 'meinem gesamten Verlauf' : `den letzten ${period} Wochen`
  return `Du bist mein Trainingscoach für Muskelaufbau. Analysiere mein Krafttraining aus ${range}.

Grundlage für alle Bewertungen ist mein Leitfaden: ${GUIDE_URL}
Lies die Seite, wenn du kannst. Falls nicht, gelten diese Kernregeln daraus:
- Regelmäßig trainieren und Last oder Wiederholungen stetig steigern
- 10–16 harte Arbeitssätze pro Muskel und Woche, darüber abnehmender Nutzen
- Arbeitssätze nah am Muskelversagen: 1–2 Wiederholungen in Reserve (RIR)
- Kein Kaloriendefizit, nur ein kleiner Überschuss
- Protein 1,8–2,0 g pro kg Körpergewicht
- 7–9 Stunden Schlaf

Meine Daten stehen in der angehängten Datei ${fileName} (CSV aus meiner App Motion). Eine Zeile pro Eintrag, Spalte „type“:
- workout: ein abgeschlossenes Training (date, time, workout)
- set: ein Satz mit exercise, muscle, set, set_type (working = Arbeitssatz, warm-up = Aufwärmsatz), weight_kg, reps, duration_seconds, completed
- cardio: Ausdauer mit duration_seconds, distance_km, pace_s_per_km
- body_weight: Körpergewicht in kg (Spalte value)
Werte nur Arbeitssätze mit completed = yes als harte Sätze. Die Datei enthält nicht, wie nah ein Satz am Versagen war.

Bevor du analysierst, frag mich bitte:
1. Mit wie viel RIR trainiere ich meine Arbeitssätze normalerweise? (Gilt das für alle Übungen oder unterschiedlich?)
2. Was ist gerade mein Ziel (z. B. Aufbau, Kraft, Erhalt), und bin ich im Überschuss, auf Erhalt oder im Defizit?
Warte auf meine Antworten.

Danach:
1. Fortschritt: Welche Übungen steigen, welche stagnieren oder fallen? Nenne Zahlen (z. B. bestes Gewicht × Wiederholungen am Anfang und am Ende).
2. Volumen: harte Sätze pro Muskel und Woche im Durchschnitt, verglichen mit 10–16. Welche Muskeln bekommen zu wenig oder zu viel?
3. Regelmäßigkeit: Trainings pro Woche, Lücken, Auffälligkeiten.
4. Körpergewicht, falls vorhanden: Trend und was er für den Aufbau bedeutet.
5. Die 3 wichtigsten konkreten Änderungen für die nächsten Wochen, jeweils mit Bezug auf den Leitfaden.

Antworte auf Deutsch, knapp und konkret. Rate nicht: Wenn etwas aus den Daten nicht hervorgeht, sag es.`
}

function englishPrompt(period: AIPeriod, fileName: string) {
  const range = period === null ? 'my whole history' : `the last ${period} weeks`
  return `You are my muscle-building coach. Analyse my strength training from ${range}.

Base every judgement on my guide: ${GUIDE_URL} (in German)
Read the page if you can. If not, these are its core rules:
- Train regularly and keep adding load or reps
- 10–16 hard working sets per muscle per week, with diminishing returns above that
- Working sets close to failure: 1–2 reps in reserve (RIR)
- No calorie deficit, only a small surplus
- Protein 1.8–2.0 g per kg of body weight
- 7–9 hours of sleep

My data is in the attached file ${fileName} (CSV from my app Motion). One row per entry, column "type":
- workout: a completed workout (date, time, workout)
- set: a set with exercise, muscle, set, set_type (working or warm-up), weight_kg, reps, duration_seconds, completed
- cardio: cardio with duration_seconds, distance_km, pace_s_per_km
- body_weight: body weight in kg (column value)
Count only working sets with completed = yes as hard sets. The file does not say how close to failure a set was.

Before you analyse, please ask me:
1. How many RIR do I usually leave in my working sets? (The same for all exercises or different?)
2. What is my current goal (e.g. size, strength, maintenance), and am I in a surplus, at maintenance or in a deficit?
Wait for my answers.

Then:
1. Progress: which exercises go up, which stall or drop? Give numbers (e.g. best weight × reps at the start and at the end).
2. Volume: average hard sets per muscle per week compared with 10–16. Which muscles get too little or too much?
3. Consistency: workouts per week, gaps, anything unusual.
4. Body weight, if present: the trend and what it means for building muscle.
5. The 3 most important concrete changes for the coming weeks, each tied to the guide.

Answer briefly and concretely. Do not guess: if the data does not show something, say so.`
}
