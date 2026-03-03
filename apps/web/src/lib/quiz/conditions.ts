// Quiz Conditional Logic — SOL SaaS
// Determines which questions should be shown based on current answers

import type { QuestionDefinition } from './questions'

/**
 * Map of answers: questionKey → selected value (key letter)
 */
export type AnswerMap = Record<string, string>

/**
 * Determines if a question should be shown based on its showWhen condition
 * and the current set of answers.
 *
 * Rules:
 * - Questions without showWhen are always shown
 * - Questions with showWhen are shown only when the referenced question
 *   has the expected value
 */
export function shouldShowQuestion(
  question: QuestionDefinition,
  answers: AnswerMap
): boolean {
  if (!question.showWhen) return true

  const { questionKey, value } = question.showWhen
  const currentAnswer = answers[questionKey]

  if (!currentAnswer) return false

  if (Array.isArray(value)) {
    return value.includes(currentAnswer)
  }

  return currentAnswer === value
}

/**
 * Derives path1 (AD | ORGANIC) from Q1 answer.
 * Returns null if Q1 hasn't been answered yet.
 */
export function derivePath1(answers: AnswerMap): 'AD' | 'ORGANIC' | null {
  const q1 = answers['Q1']
  if (q1 === 'A') return 'AD'
  if (q1 === 'B') return 'ORGANIC'
  return null
}

/**
 * Derives path2 (MODELED | FROM_SCRATCH) from Q2 answer.
 * Returns null if Q2 hasn't been answered yet.
 */
export function derivePath2(answers: AnswerMap): 'MODELED' | 'FROM_SCRATCH' | null {
  const q2 = answers['Q2']
  if (q2 === 'A') return 'MODELED'
  if (q2 === 'B') return 'FROM_SCRATCH'
  return null
}

/**
 * Filters a list of questions to only those that should be visible
 * given the current answers (respects showWhen conditions).
 */
export function getVisibleQuestions(
  questions: QuestionDefinition[],
  answers: AnswerMap
): QuestionDefinition[] {
  return questions.filter((q) => shouldShowQuestion(q, answers))
}

/**
 * Calculates progress for a section: how many visible questions have been answered.
 */
export function getSectionProgress(
  questions: QuestionDefinition[],
  answers: AnswerMap
): { answered: number; total: number } {
  const visible = getVisibleQuestions(questions, answers)
  const answered = visible.filter((q) => answers[q.questionKey] !== undefined).length
  return { answered, total: visible.length }
}

/**
 * Checks if all required visible questions in a section have been answered.
 */
export function isSectionComplete(
  questions: QuestionDefinition[],
  answers: AnswerMap
): boolean {
  const visible = getVisibleQuestions(questions, answers)
  return visible
    .filter((q) => q.required)
    .every((q) => {
      const answer = answers[q.questionKey]
      return answer !== undefined && answer.trim() !== ''
    })
}
