import { extractTextFromDocx } from './parseKnowledgeQuizImport';

export type ParsedOutlineArticle = {
  title: string;
  excerpt?: string;
};

export type ParsedOutlineModule = {
  order: number;
  name: string;
  description?: string;
  articles: ParsedOutlineArticle[];
};

export type ParseKnowledgeOutlineImportResult = {
  modules: ParsedOutlineModule[];
  warnings: string[];
};

const MODULE_LINE_RE = /^Модуль\s+(\d+)\.\s*(.+)$/i;
const ARTICLE_WITH_EXCERPT_RE = /^(.+?)\s*\(([^)]+)\)\s*\.?\s*$/;

function normalizeOutlineText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim();
}

function splitOutlineLines(text: string): string[] {
  const normalized = normalizeOutlineText(text);

  return normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isArticleLine(line: string): boolean {
  return ARTICLE_WITH_EXCERPT_RE.test(line);
}

function parseArticleLine(line: string): ParsedOutlineArticle {
  const match = line.match(ARTICLE_WITH_EXCERPT_RE);
  if (!match) {
    return { title: line.trim() };
  }

  return {
    title: match[1].trim(),
    excerpt: match[2].trim() || undefined,
  };
}

export function parseKnowledgeOutlineImportText(text: string): ParseKnowledgeOutlineImportResult {
  const lines = splitOutlineLines(text);
  if (lines.length === 0) {
    throw new Error(
      'Файл пустой. Ожидается структура: «Модуль 1. Название», затем темы конспектов.'
    );
  }

  const modules: ParsedOutlineModule[] = [];
  const warnings: string[] = [];
  let current: ParsedOutlineModule | null = null;
  let awaitingModuleDescription = false;

  for (const line of lines) {
    const moduleMatch = line.match(MODULE_LINE_RE);
    if (moduleMatch) {
      current = {
        order: Number.parseInt(moduleMatch[1], 10),
        name: moduleMatch[2].trim(),
        articles: [],
      };
      modules.push(current);
      awaitingModuleDescription = true;
      continue;
    }

    if (!current) {
      warnings.push(`Пропущена строка до первого модуля: «${line.slice(0, 60)}…»`);
      continue;
    }

    if (awaitingModuleDescription && !isArticleLine(line)) {
      current.description = line.trim();
      awaitingModuleDescription = false;
      continue;
    }

    awaitingModuleDescription = false;
    current.articles.push(parseArticleLine(line));
  }

  if (modules.length === 0) {
    throw new Error(
      'Не найдено ни одного модуля. Строки модулей должны начинаться с «Модуль 1.», «Модуль 2.» и т.д.'
    );
  }

  const emptyModules = modules.filter((module) => module.articles.length === 0);
  if (emptyModules.length > 0) {
    throw new Error(
      `У модулей без тем конспектов: ${emptyModules.map((module) => module.name).join(', ')}`
    );
  }

  return { modules, warnings };
}

export async function parseKnowledgeOutlineImportFile(
  file: File
): Promise<ParseKnowledgeOutlineImportResult> {
  const lowerName = file.name.toLowerCase();

  let text: string;
  if (lowerName.endsWith('.docx')) {
    text = await extractTextFromDocx(file);
  } else if (lowerName.endsWith('.txt')) {
    text = await file.text();
  } else {
    throw new Error('Поддерживаются файлы .docx и .txt');
  }

  return parseKnowledgeOutlineImportText(text);
}
