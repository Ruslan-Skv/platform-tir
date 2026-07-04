export interface MissionPageInfo {
  pageTitle: string;
  introText: string | null;
  footerLinkName: string | null;
  content: string;
  isPublished: boolean;
}

export function formatMissionText(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
}
