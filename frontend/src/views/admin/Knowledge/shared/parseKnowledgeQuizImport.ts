import JSZip from 'jszip';

export type ParsedImportQuestion = {
  text: string;
  explanation: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

export type ParseKnowledgeQuizImportResult = {
  questions: ParsedImportQuestion[];
  warnings: string[];
};

function normalizeImportText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/([a-d])\s*\n\s*\)\s*/gi, '$1) ')
    .trim();
}

function splitQuestionBlocks(text: string): string[] {
  const normalized = normalizeImportText(text);

  const blocks = [...normalized.matchAll(/[\s\S]*?Правильный\s+ответ:\s*[a-d][^\n]*/gi)].map(
    (match) => match[0].trim()
  );
  if (blocks.length > 0) {
    return blocks;
  }

  return normalized
    .split(/\n{2,}/)
    .map((block) => block.replace(/\n+/g, ' ').trim())
    .filter(Boolean);
}

function parseQuestionBlock(block: string, index: number): ParsedImportQuestion | null {
  const trimmed = block.trim();
  const answerMatch = trimmed.match(/Правильный\s+ответ:\s*([a-d])(.*)$/i);
  if (!answerMatch) {
    return null;
  }

  const correctLetter = answerMatch[1].toLowerCase();
  const explanation = answerMatch[2]
    .trim()
    .replace(/^[(\s]+/, '')
    .replace(/[)\s]+$/, '')
    .trim();

  const beforeAnswer = trimmed.slice(0, trimmed.indexOf(answerMatch[0])).trim();
  const optionMatches = [...beforeAnswer.matchAll(/([a-d])\)\s*/gi)];

  if (optionMatches.length < 2) {
    throw new Error(`Вопрос ${index + 1}: найдено меньше двух вариантов ответа`);
  }

  const questionText = beforeAnswer.slice(0, optionMatches[0].index).trim();
  if (!questionText) {
    throw new Error(`Вопрос ${index + 1}: не удалось определить текст вопроса`);
  }

  const options = optionMatches.map((match, optionIndex) => {
    const start = match.index! + match[0].length;
    const end = optionMatches[optionIndex + 1]?.index ?? beforeAnswer.length;
    const letter = match[1].toLowerCase();
    const text = beforeAnswer.slice(start, end).trim();

    if (!text) {
      throw new Error(`Вопрос ${index + 1}: пустой вариант «${letter})»`);
    }

    return {
      text,
      isCorrect: letter === correctLetter,
    };
  });

  if (!options.some((option) => option.isCorrect)) {
    throw new Error(
      `Вопрос ${index + 1}: правильный ответ «${correctLetter})» не найден среди вариантов`
    );
  }

  return {
    text: questionText,
    explanation,
    options,
  };
}

export function parseKnowledgeQuizImportText(text: string): ParseKnowledgeQuizImportResult {
  const blocks = splitQuestionBlocks(text);
  if (blocks.length === 0) {
    throw new Error(
      'Не найдено ни одного вопроса. Проверьте формат: вопрос, варианты a) b) c)…, строка «Правильный ответ: …»'
    );
  }

  const questions: ParsedImportQuestion[] = [];
  const warnings: string[] = [];

  blocks.forEach((block, index) => {
    try {
      const parsed = parseQuestionBlock(block, index);
      if (parsed) {
        questions.push(parsed);
      } else {
        warnings.push(`Блок ${index + 1}: пропущен — нет строки «Правильный ответ»`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'неизвестная ошибка';
      throw new Error(message);
    }
  });

  if (questions.length === 0) {
    throw new Error('Не удалось распознать вопросы в файле');
  }

  return { questions, warnings };
}

export async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const documentXml = await zip.file('word/document.xml')?.async('string');

  if (!documentXml) {
    throw new Error('Не удалось прочитать содержимое .docx');
  }

  const paragraphs = documentXml
    .split(/<w:p[ >]/)
    .slice(1)
    .map((paragraph) =>
      [...paragraph.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((match) => match[1]).join('')
    )
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    throw new Error('Документ пустой');
  }

  return paragraphs.join('\n\n');
}

export async function parseKnowledgeQuizImportFile(
  file: File
): Promise<ParseKnowledgeQuizImportResult> {
  const lowerName = file.name.toLowerCase();

  let text: string;
  if (lowerName.endsWith('.docx')) {
    text = await extractTextFromDocx(file);
  } else if (lowerName.endsWith('.txt')) {
    text = await file.text();
  } else {
    throw new Error('Поддерживаются файлы .docx и .txt');
  }

  return parseKnowledgeQuizImportText(text);
}
