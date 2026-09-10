import type { Feedback, NpsCategory, NpsSummary } from '../types';

export function getNpsCategory(score: number): NpsCategory {
  if (score >= 9) return 'promoteur';
  if (score >= 7) return 'passif';
  return 'detracteur';
}

export function computeNps(feedback: Feedback[]): NpsSummary {
  const total = feedback.length;

  if (total === 0) {
    return { score: 0, detractors: 0, passives: 0, promoters: 0, total: 0 };
  }

  let promoters = 0;
  let passives = 0;
  let detractors = 0;

  for (const entry of feedback) {
    const category = getNpsCategory(entry.score);
    if (category === 'promoteur') promoters += 1;
    else if (category === 'passif') passives += 1;
    else detractors += 1;
  }

  return {
    score: Math.round(((promoters - detractors) / total) * 100),
    detractors,
    passives,
    promoters,
    total,
  };
}

export function getAverageScore(feedback: Feedback[]): number {
  if (feedback.length === 0) return 0;
  const sum = feedback.reduce((acc, entry) => acc + entry.score, 0);
  return Math.round((sum / feedback.length) * 10) / 10;
}

export function getScoreDistribution(feedback: Feedback[]): Array<{
  score: number;
  count: number;
}> {
  const counts = new Array<number>(11).fill(0);
  for (const entry of feedback) {
    if (entry.score >= 0 && entry.score <= 10) counts[entry.score] += 1;
  }
  return counts.map((count, score) => ({ score, count }));
}