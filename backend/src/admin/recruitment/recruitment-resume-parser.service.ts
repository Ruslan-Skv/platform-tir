import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export type ParsedResumeData = {
  emails: string[];
  phones: string[];
  skills: string[];
  experienceYears: number | null;
  educationHints: string[];
  jobTitles: string[];
  summary: string;
};

const SKILL_KEYWORDS = [
  'продажи',
  'менеджер',
  'crm',
  'переговоры',
  'клиент',
  'b2b',
  'b2c',
  'холодные звонки',
  'активные продажи',
  'консультирование',
  'двери',
  'мебель',
  'ремонт',
  'отделка',
  'строительство',
  '1с',
  'excel',
  'powerpoint',
  'коммуникация',
  'презентация',
  'лидерство',
  'команда',
];

const JOB_TITLE_PATTERNS = [
  /менеджер(?:\s+по\s+продажам)?/gi,
  /специалист(?:\s+по\s+продажам)?/gi,
  /руководитель(?:\s+отдела)?/gi,
  /консультант/gi,
  /торговый\s+представитель/gi,
];

@Injectable()
export class RecruitmentResumeParserService {
  async extractText(filePath: string, mimeType?: string | null): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf' || mimeType === 'application/pdf') {
      const buffer = fs.readFileSync(filePath);
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text ?? '';
      } finally {
        await parser.destroy();
      }
    }

    if (ext === '.docx' || mimeType?.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value ?? '';
    }

    if (ext === '.txt' || mimeType === 'text/plain') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    if (ext === '.doc') {
      throw new Error('Формат .doc не поддерживается. Сохраните резюме как PDF или DOCX.');
    }

    throw new Error('Неподдерживаемый формат файла. Допустимы PDF, DOCX, TXT.');
  }

  parseResumeText(text: string): ParsedResumeData {
    const normalized = text.replace(/\r\n/g, '\n').trim();
    const lower = normalized.toLowerCase();

    const emails = [...new Set(normalized.match(/[\w.+-]+@[\w-]+\.[\w.-]+/gi) ?? [])];
    const phones = [
      ...new Set(
        (normalized.match(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g) ?? []).map(
          (p) => p.replace(/\s+/g, ' ').trim(),
        ),
      ),
    ];

    const skills = SKILL_KEYWORDS.filter((skill) => lower.includes(skill));

    const experienceYears = this.extractExperienceYears(lower);

    const educationHints: string[] = [];
    if (/высшее/.test(lower)) educationHints.push('высшее');
    if (/среднее\s+специальное/.test(lower)) educationHints.push('среднее специальное');
    if (/mba|магистр/.test(lower)) educationHints.push('MBA/магистратура');
    if (/курс|сертификат/.test(lower)) educationHints.push('дополнительное обучение');

    const jobTitles = new Set<string>();
    for (const pattern of JOB_TITLE_PATTERNS) {
      const matches = normalized.match(pattern);
      if (matches) {
        for (const m of matches) {
          jobTitles.add(m.charAt(0).toUpperCase() + m.slice(1).toLowerCase());
        }
      }
    }

    const summary = normalized.length > 500 ? `${normalized.slice(0, 500).trim()}…` : normalized;

    return {
      emails,
      phones,
      skills,
      experienceYears,
      educationHints,
      jobTitles: [...jobTitles],
      summary,
    };
  }

  private extractExperienceYears(text: string): number | null {
    const patterns = [
      /опыт\s+(?:работы\s+)?(\d+)\s*(?:лет|года|г\.)/,
      /(\d+)\s*(?:лет|года)\s+опыта/,
      /стаж\s+(\d+)\s*(?:лет|года)/,
      /experience[:\s]+(\d+)\s*(?:years?|yrs?)/,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const years = parseInt(match[1], 10);
        if (!Number.isNaN(years) && years >= 0 && years <= 50) {
          return years;
        }
      }
    }

    return null;
  }
}
