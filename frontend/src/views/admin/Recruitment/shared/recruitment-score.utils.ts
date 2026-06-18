export function recruitmentScoreClass(
  styles: Record<string, string>,
  score: number | null | undefined
): string {
  if (score == null) return '';
  if (score >= 70) return styles.scoreHigh;
  if (score >= 45) return styles.scoreMid;
  return styles.scoreLow;
}
