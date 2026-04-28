'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import {
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
  getContractDocumentGlobalTemplate,
  getContractDocumentPackage,
  putContractDocumentGlobalTemplate,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import type { Contract } from '@/shared/api/admin-crm';
import { getContract, getContracts } from '@/shared/api/admin-crm';

import styles from '../ContractDocuments.module.css';
import { amountToRussianWords } from './amountToRussianWords';
import { mergeRepairFormFromCrmContract } from './applyCrmContractToForm';
import { applyTemplate } from './applyTemplate';
import {
  type RepairDocumentTemplateTabId,
  buildPersistedFormData,
  mergeFormDataFromStorage,
} from './formDataTemplateStorage';
import { printDocumentHtml } from './printDocument';
import { REPAIR_CONTRACT_PLACEHOLDER_GROUPS } from './repairContractPlaceholders';
import {
  REPAIR_DOCUMENT_TAB_IDS,
  REPAIR_DOCUMENT_TAB_LABELS,
  REPAIR_DOCUMENT_TEMPLATES,
  type RepairDocumentTabId,
} from './repairDocumentTemplates';
import { type RepairPackageFormData, mergeRepairPackageFormData } from './repairPackageForm';

/** Встроенный в код шаблон (если в БД нет общего шаблона). */
const FILE_REPAIR_CONTRACT_TEMPLATE = REPAIR_DOCUMENT_TEMPLATES.contract;

function parseDecimalAmount(raw: string): number | null {
  const normalized = raw.replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyValue(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

interface RepairContractDocumentEditorPageProps {
  packageId: string;
}

export function RepairContractDocumentEditorPage({
  packageId,
}: RepairContractDocumentEditorPageProps) {
  const [activeTab, setActiveTab] = useState<RepairDocumentTabId>('data');
  const [draftTitle, setDraftTitle] = useState('');
  const [draftCrmContractId, setDraftCrmContractId] = useState<string | null>(null);
  const [form, setForm] = useState<RepairPackageFormData>(() => mergeRepairPackageFormData({}));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaveSuccessModalOpen, setIsSaveSuccessModalOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [contractQuery, setContractQuery] = useState('');
  const [contractResults, setContractResults] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const contractHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [contractDocView, setContractDocView] = useState<'preview' | 'edit'>('preview');
  const [formatToolbarLevel, setFormatToolbarLevel] = useState<'basic' | 'advanced'>('basic');
  const [formatToolbarQuery, setFormatToolbarQuery] = useState('');
  const [showAllFormatTools, setShowAllFormatTools] = useState(false);
  const [globalContractState, setGlobalContractState] = useState<{
    loaded: boolean;
    html: string | null;
  }>({ loaded: false, html: null });
  const [publishingGlobal, setPublishingGlobal] = useState(false);
  const [executorProfiles, setExecutorProfiles] = useState<ExecutorRequisiteProfile[]>([]);

  const resolvedContractDefaultTemplate = useMemo(() => {
    if (!globalContractState.loaded) return FILE_REPAIR_CONTRACT_TEMPLATE;
    if (globalContractState.html !== null) return globalContractState.html;
    return FILE_REPAIR_CONTRACT_TEMPLATE;
  }, [globalContractState]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [row, globalTpl, profilesRes] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentGlobalTemplate('REPAIR', 'contract').catch(() => ({
          html: null as string | null,
          updatedAt: null as string | null,
        })),
        getContractDocumentExecutorProfiles('REPAIR').catch(() => ({
          items: [] as ExecutorRequisiteProfile[],
          updatedAt: null as string | null,
        })),
      ]);
      if (row.kind !== 'REPAIR') {
        setError('Этот пакет относится к другому направлению.');
        return;
      }
      setDraftTitle(row.title ?? '');
      setDraftCrmContractId(row.crmContractId ?? null);
      const { form: mergedForm, templateOverrides: ov } = mergeFormDataFromStorage(row.formData);
      setForm(mergedForm);
      setTemplateOverrides(ov);
      setGlobalContractState({ loaded: true, html: globalTpl.html });
      setExecutorProfiles(profilesRes.items ?? []);
      setExcelMessage(null);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [packageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const searchContracts = useCallback(async (q: string) => {
    setContractsLoading(true);
    try {
      const res = await getContracts({
        search: q.trim() || undefined,
        limit: 25,
        page: 1,
      });
      setContractResults(res.data);
    } catch {
      setContractResults([]);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void searchContracts(contractQuery);
    }, 350);
    return () => window.clearTimeout(t);
  }, [contractQuery, searchContracts]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateContractDocumentPackage(packageId, {
        title: draftTitle.trim() || null,
        formData: buildPersistedFormData(form, templateOverrides),
        crmContractId: draftCrmContractId,
      });
      setDirty(false);
      setIsSaveSuccessModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить');
    } finally {
      setSaving(false);
    }
  };

  const handlePullFromCrm = async () => {
    if (!draftCrmContractId) return;
    setError(null);
    try {
      const c = await getContract(draftCrmContractId);
      setForm((prev) => mergeRepairFormFromCrmContract(c, prev));
      setDirty(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договор CRM');
    }
  };

  const updateCustomer = <K extends keyof RepairPackageFormData['customer']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      const nextCustomer = { ...p.customer, [key]: value };
      if (key === 'type') {
        const nextType = value as RepairPackageFormData['customer']['type'];
        if (nextType === 'PERSON') {
          nextCustomer.organizationName = '';
          nextCustomer.representativeFullNameNominative = '';
          nextCustomer.representativeFullNameGenitive = '';
          nextCustomer.representativePositionNominative = '';
          nextCustomer.representativePositionGenitive = '';
          nextCustomer.inn = '';
          nextCustomer.ogrn = '';
        } else {
          nextCustomer.fullName = '';
          nextCustomer.passportSeriesNumber = '';
          nextCustomer.passportIssuedBy = '';
          nextCustomer.passportIssueDate = '';
        }
      }
      return { ...p, customer: nextCustomer };
    });
    setDirty(true);
  };

  const updateExecutor = <K extends keyof RepairPackageFormData['executor']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      const nextExecutor = { ...p.executor, [key]: value };
      // Keep legacy placeholder value in sync for old templates.
      if (key === 'directorNameNominative') {
        nextExecutor.directorName = value;
      }
      return { ...p, executor: nextExecutor };
    });
    setDirty(true);
  };

  const applyExecutorProfile = (title: string) => {
    setForm((p) => {
      const profile = executorProfiles.find((it) => it.title === title);
      if (!profile) {
        return { ...p, executor: { ...p.executor, selectedProfileTitle: '' } };
      }
      return {
        ...p,
        executor: {
          ...p.executor,
          selectedProfileTitle: title,
          companyName: profile.companyName ?? '',
          inn: profile.inn ?? '',
          kpp: profile.kpp ?? '',
          ogrn: profile.ogrn ?? '',
          legalAddress: profile.legalAddress ?? '',
          actualAddress: profile.actualAddress ?? '',
          bankDetails: profile.bankDetails ?? '',
          directorNameNominative: profile.directorNameNominative ?? '',
          directorNameGenitive: profile.directorNameGenitive ?? '',
          directorName: profile.directorNameNominative ?? '',
          basis: profile.basis ?? '',
        },
      };
    });
    setDirty(true);
  };

  const updateObject = <K extends keyof RepairPackageFormData['object']>(key: K, value: string) => {
    setForm((p) => ({ ...p, object: { ...p.object, [key]: value } }));
    setDirty(true);
  };

  const updateContract = <K extends keyof RepairPackageFormData['contract']>(
    key: K,
    value: string
  ) => {
    setForm((p) => {
      const nextContract = { ...p.contract, [key]: value };
      if (key === 'totalAmount') {
        nextContract.totalAmountWords = amountToRussianWords(value);
        const parsedAmount = parseDecimalAmount(value);
        nextContract.recommendedPrepayment =
          parsedAmount === null ? '' : formatMoneyValue(parsedAmount * 0.7);
      }
      return { ...p, contract: nextContract };
    });
    setDirty(true);
  };

  const updateEstimate = <K extends keyof RepairPackageFormData['estimate']>(
    key: K,
    value: string
  ) => {
    setForm((p) => ({ ...p, estimate: { ...p.estimate, [key]: value } }));
    setDirty(true);
  };

  const renderedDoc = useMemo(() => {
    if (activeTab === 'data') return '';
    const tab = activeTab as RepairDocumentTemplateTabId;
    let tpl: string;
    if (tab === 'contract') {
      tpl =
        templateOverrides.contract ??
        (globalContractState.loaded && globalContractState.html !== null
          ? globalContractState.html
          : FILE_REPAIR_CONTRACT_TEMPLATE);
    } else {
      tpl = templateOverrides[tab] ?? REPAIR_DOCUMENT_TEMPLATES[tab];
    }
    return applyTemplate(tpl, form);
  }, [activeTab, form, templateOverrides, globalContractState]);

  const contractTemplateSource = useMemo(
    () =>
      activeTab === 'contract'
        ? (templateOverrides.contract ?? resolvedContractDefaultTemplate)
        : '',
    [activeTab, templateOverrides.contract, resolvedContractDefaultTemplate]
  );

  const handleContractTemplateChange = (value: string) => {
    setTemplateOverrides((prev) => {
      const next = { ...prev };
      if (value === resolvedContractDefaultTemplate) delete next.contract;
      else next.contract = value;
      return next;
    });
    setDirty(true);
  };

  const insertContractPlaceholder = (path: string) => {
    const el = contractHtmlTextareaRef.current;
    const cur = templateOverrides.contract ?? resolvedContractDefaultTemplate;
    const token = `{{${path}}}`;
    if (el) {
      const start = el.selectionStart ?? cur.length;
      const end = el.selectionEnd ?? start;
      const next = cur.slice(0, start) + token + cur.slice(end);
      handleContractTemplateChange(next);
      const pos = start + token.length;
      window.requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    } else {
      handleContractTemplateChange(cur + token);
    }
  };

  const updateContractHtmlBySelection = (
    transform: (
      selected: string,
      hasSelection: boolean
    ) => {
      content: string;
      cursorOffset?: number;
      selectLength?: number;
    }
  ) => {
    const el = contractHtmlTextareaRef.current;
    const current = contractTemplateSource;
    if (!el) {
      const next = transform('', false).content;
      handleContractTemplateChange(current + next);
      return;
    }
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;
    const selected = current.slice(start, end);
    const hasSelection = start !== end;
    const result = transform(selected, hasSelection);
    const next = current.slice(0, start) + result.content + current.slice(end);
    handleContractTemplateChange(next);
    const cursor = start + (result.cursorOffset ?? result.content.length);
    const selectLength = result.selectLength ?? 0;
    window.requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor + selectLength);
    });
  };

  const wrapSelection = (before: string, after: string, placeholder = 'текст') => {
    updateContractHtmlBySelection((selected, hasSelection) => ({
      content: `${before}${hasSelection ? selected : placeholder}${after}`,
      cursorOffset: hasSelection ? before.length + selected.length + after.length : before.length,
      selectLength: hasSelection ? 0 : placeholder.length,
    }));
  };

  const wrapParagraphWithAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    wrapSelection(`<p style="text-align: ${align}; margin: 0 0 8pt;">`, '</p>', 'Новый абзац');
  };

  const wrapParagraphWithIndent = () => {
    wrapSelection(
      '<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">',
      '</p>',
      'Абзац с красной строкой'
    );
  };

  const wrapAsHeading = (level: 1 | 2 | 3) => {
    const tag = `h${level}`;
    const fontSize = level === 1 ? '14pt' : level === 2 ? '12pt' : '11pt';
    wrapSelection(
      `<${tag} style="text-align: center; font-size: ${fontSize}; margin: 14pt 0 8pt;">`,
      `</${tag}>`,
      level === 1 ? 'Название договора' : level === 2 ? 'Название раздела' : 'Название подпункта'
    );
  };

  const wrapAsList = (ordered: boolean) => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const lines = (hasSelection ? selected : 'Пункт 1\nПункт 2')
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      const items = lines.map((line) => `  <li>${line}</li>`).join('\n');
      const tag = ordered ? 'ol' : 'ul';
      return {
        content: `<${tag} style="margin: 0 0 8pt 22px; padding: 0;">\n${items}\n</${tag}>`,
      };
    });
  };

  const insertSectionTemplate = () => {
    const block = `
<h2 style="text-align: center; margin: 14pt 0 8pt;">N. НАЗВАНИЕ РАЗДЕЛА</h2>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.1. Первый пункт раздела.
</p>
<p style="text-align: justify; text-indent: 1.25cm; margin: 0 0 8pt;">
  N.2. Второй пункт раздела.
</p>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertSignatureLines = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 16pt;">
  <tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 10px;">
      <p style="margin: 0 0 22pt;">Подрядчик _____________________ / {{executor.directorName}}</p>
    </td>
    <td style="width: 50%; vertical-align: bottom; padding-left: 10px;">
      <p style="margin: 0 0 22pt;">Заказчик _____________________ / {{customer.fullName}}</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const clearFormattingInSelection = () => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = hasSelection ? selected : contractTemplateSource;
      const cleaned = source.replace(/<[^>]+>/g, '').trim();
      return { content: cleaned || 'текст' };
    });
  };

  const uppercaseSelection = () => {
    updateContractHtmlBySelection((selected, hasSelection) => ({
      content: (hasSelection ? selected : 'ТЕКСТ').toUpperCase(),
    }));
  };

  const insertHorizontalRule = () => {
    updateContractHtmlBySelection(() => ({
      content: '<hr style="border: 0; border-top: 1px solid #999; margin: 12pt 0;" />',
    }));
  };

  const insertPageBreak = () => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="page-break-after: always;"></div>',
    }));
  };

  const insertRequisitesTemplate = () => {
    const block = `
<h2 style="text-align: center; margin: 16pt 0 8pt;">РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h2>
<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ПОДРЯДЧИК</p>
      <p style="margin: 0 0 4pt;">{{executor.companyName}}</p>
      <p style="margin: 0 0 4pt;">ИНН {{executor.inn}}, КПП {{executor.kpp}}, ОГРН {{executor.ogrn}}</p>
      <p style="margin: 0 0 4pt;">Юр. адрес: {{executor.legalAddress}}</p>
      <p style="margin: 0 0 4pt;">Факт. адрес: {{executor.actualAddress}}</p>
      <p style="margin: 0 0 8pt; white-space: pre-wrap;">{{executor.bankDetails}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{executor.directorName}}</p>
      <p style="margin: 0; font-size: 9pt;">м.п.</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЗАКАЗЧИК</p>
      <p style="margin: 0 0 4pt;">{{customer.fullName}}</p>
      <p style="margin: 0 0 4pt;">Адрес: {{customer.address}}</p>
      <p style="margin: 0 0 4pt;">Тел.: {{customer.phone}}</p>
      <p style="margin: 0 0 4pt;">E-mail: {{customer.email}}</p>
      <p style="margin: 0 0 4pt;">Паспорт: {{customer.passportSeriesNumber}}</p>
      <p style="margin: 0 0 8pt;">Выдан: {{customer.passportIssuedBy}}, {{customer.passportIssueDate}}</p>
      <p style="margin: 20pt 0 0;">___________________ / {{customer.fullName}}</p>
      <p style="margin: 0; font-size: 9pt;">подпись</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const wrapParagraphWithSpacing = (lineHeight: number, marginBottomPt: number) => {
    wrapSelection(
      `<p style="text-align: justify; line-height: ${lineHeight}; margin: 0 0 ${marginBottomPt}pt;">`,
      '</p>',
      'Абзац'
    );
  };

  const wrapParagraphWithIndentCm = (indentCm: number) => {
    wrapSelection(
      `<p style="text-align: justify; text-indent: ${indentCm}cm; margin: 0 0 8pt;">`,
      '</p>',
      'Абзац'
    );
  };

  const insertQuoteBlock = () => {
    const block = `
<blockquote style="margin: 8pt 0; padding: 8pt 10pt; border-left: 3px solid #94a3b8; background: #f8fafc;">
  <p style="margin: 0; font-style: italic;">Текст примечания / важного условия.</p>
</blockquote>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertSimpleTable = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin: 8pt 0;">
  <tr>
    <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Пункт</th>
    <th style="border: 1px solid #cbd5e1; padding: 6px; text-align: left;">Содержание</th>
  </tr>
  <tr>
    <td style="border: 1px solid #cbd5e1; padding: 6px;">1</td>
    <td style="border: 1px solid #cbd5e1; padding: 6px;">Описание</td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const insertEmptySpacer = () => {
    updateContractHtmlBySelection(() => ({
      content: '<div style="height: 10pt;"></div>',
    }));
  };

  const convertTextToParagraphs = () => {
    updateContractHtmlBySelection((selected, hasSelection) => {
      const source = (hasSelection ? selected : contractTemplateSource).trim();
      const parts = source
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((line) => `<p style="margin: 0 0 8pt;">${line}</p>`)
        .join('\n');
      return {
        content: parts || '<p style="margin: 0 0 8pt;">Новый абзац</p>',
      };
    });
  };

  const insertTwoColumnsBlock = () => {
    const block = `
<table style="width: 100%; border-collapse: collapse; margin-top: 8pt;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding: 8px 10px 8px 0; border-right: 1px solid #bbb;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ЛЕВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{customer.fullName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
    <td style="width: 50%; vertical-align: top; padding: 8px 0 8px 10px;">
      <p style="text-align: center; font-weight: bold; margin: 0 0 8pt;">ПРАВАЯ КОЛОНКА</p>
      <p style="margin: 0 0 6pt;">{{executor.companyName}}</p>
      <p style="margin: 0;">___________________ / подпись</p>
    </td>
  </tr>
</table>`.trim();
    updateContractHtmlBySelection(() => ({ content: block }));
  };

  const handlePublishAsGlobalDefault = async () => {
    const msg =
      'Текущий HTML договора (как в поле редактора / предпросмотре) будет сохранён как шаблон по умолчанию для всех новых пакетов «Ремонт» и для пакетов без своего текста договора. Продолжить?';
    if (typeof window !== 'undefined' && !window.confirm(msg)) return;
    setPublishingGlobal(true);
    setError(null);
    try {
      const html = contractTemplateSource;
      await putContractDocumentGlobalTemplate({ kind: 'REPAIR', tab: 'contract', html });
      setGlobalContractState({ loaded: true, html });
      setTemplateOverrides((prev) => {
        if (prev.contract === html) {
          const next = { ...prev };
          delete next.contract;
          return next;
        }
        return prev;
      });
      setExcelMessage(
        'Общий шаблон по умолчанию обновлён в системе. Пакеты без своего переопределения увидят его после перезагрузки страницы.'
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить общий шаблон');
    } finally {
      setPublishingGlobal(false);
    }
  };

  const handleResetContractTemplate = () => {
    setTemplateOverrides((prev) => {
      const next = { ...prev };
      delete next.contract;
      return next;
    });
    setExcelMessage(null);
    setDirty(true);
  };

  const handlePrint = () => {
    if (!renderedDoc) return;
    printDocumentHtml(renderedDoc, REPAIR_DOCUMENT_TAB_LABELS[activeTab]);
  };

  useEffect(() => {
    if (activeTab !== 'contract') {
      setContractDocView('preview');
    }
  }, [activeTab]);

  useEffect(() => {
    if (contractDocView !== 'edit') {
      setFormatToolbarLevel('basic');
    }
  }, [contractDocView]);

  useEffect(() => {
    setShowAllFormatTools(false);
    setFormatToolbarQuery('');
  }, [formatToolbarLevel]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  type ToolButton = {
    label: string;
    onClick: () => void;
    secondary?: boolean;
  };

  const basicTools: ToolButton[] = [
    { label: 'H1', onClick: () => wrapAsHeading(1) },
    { label: 'H2', onClick: () => wrapAsHeading(2) },
    { label: 'Слева', onClick: () => wrapParagraphWithAlign('left') },
    { label: 'Центр', onClick: () => wrapParagraphWithAlign('center') },
    { label: 'По ширине', onClick: () => wrapParagraphWithAlign('justify') },
    { label: 'Абзац+отступ', onClick: wrapParagraphWithIndent },
    { label: 'Жирный', onClick: () => wrapSelection('<strong>', '</strong>', 'жирный текст') },
    { label: 'Курсив', onClick: () => wrapSelection('<em>', '</em>', 'курсив') },
    { label: 'Марк. список', onClick: () => wrapAsList(false) },
    { label: 'Нум. список', onClick: () => wrapAsList(true) },
    { label: 'Текст → абзацы', onClick: convertTextToParagraphs },
    { label: '2 колонки', onClick: insertTwoColumnsBlock },
    { label: 'Подписи сторон', onClick: insertSignatureLines },
    { label: 'Реквизиты (готово)', onClick: insertRequisitesTemplate, secondary: true },
  ];

  const advancedTools: ToolButton[] = [
    { label: 'H3', onClick: () => wrapAsHeading(3) },
    { label: 'Справа', onClick: () => wrapParagraphWithAlign('right') },
    { label: 'Без отступа', onClick: () => wrapParagraphWithIndentCm(0) },
    { label: 'Отступ 1.25см', onClick: () => wrapParagraphWithIndentCm(1.25) },
    { label: 'Интервал узкий', onClick: () => wrapParagraphWithSpacing(1.3, 6) },
    { label: 'Интервал широкий', onClick: () => wrapParagraphWithSpacing(1.6, 10) },
    { label: 'Подчерк.', onClick: () => wrapSelection('<u>', '</u>', 'подчёркнуто') },
    { label: 'ВЕРХНИЙ РЕГИСТР', onClick: uppercaseSelection },
    { label: 'Очистить формат', onClick: clearFormattingInSelection },
    { label: 'Шаблон раздела', onClick: insertSectionTemplate },
    { label: 'Цитата / примеч.', onClick: insertQuoteBlock },
    { label: 'Таблица 2×2', onClick: insertSimpleTable },
    { label: 'Пустая строка', onClick: insertEmptySpacer, secondary: true },
    { label: 'Разделитель', onClick: insertHorizontalRule, secondary: true },
    { label: 'Разрыв страницы', onClick: insertPageBreak, secondary: true },
  ];

  const sourceTools = formatToolbarLevel === 'basic' ? basicTools : advancedTools;
  const q = formatToolbarQuery.trim().toLowerCase();
  const visibleTools = sourceTools.filter((tool) => {
    if (!showAllFormatTools && tool.secondary) return false;
    if (!q) return true;
    return tool.label.toLowerCase().includes(q);
  });

  return (
    <div className={`${styles.page} ${styles.pageWide}`}>
      <div className={`${styles.editorHeader} ${styles.blockHeader}`}>
        <div>
          <Link className={styles.backLink} href="/admin/contract-documents/repair">
            ← К списку (Ремонт)
          </Link>
          <h1 className={styles.title} style={{ marginTop: 8 }}>
            Пакет документов
          </h1>
          <p className={styles.subtitle} style={{ marginBottom: 0 }}>
            ID: {packageId}
            {draftCrmContractId ? (
              <>
                {' '}
                ·{' '}
                <Link className={styles.link} href={`/admin/crm/contracts/${draftCrmContractId}`}>
                  Договор в CRM
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <div className={styles.headerActions}>
          <input
            type="text"
            placeholder="Название черновика"
            value={draftTitle}
            onChange={(e) => {
              setDraftTitle(e.target.value);
              setDirty(true);
            }}
            className={styles.draftTitleInput}
          />
          <div className={styles.headerButtonsRow}>
            {activeTab !== 'data' ? (
              <button type="button" className={styles.secondaryBtn} onClick={handlePrint}>
                Печать
              </button>
            ) : null}
            <button
              type="button"
              className={styles.primaryBtn}
              disabled={saving || !dirty}
              onClick={() => void handleSave()}
            >
              {saving ? 'Сохранение…' : dirty ? 'Сохранить' : 'Сохранено'}
            </button>
          </div>
        </div>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
      {isSaveSuccessModalOpen ? (
        <div className={styles.saveModalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.saveModalCard}>
            <h3 className={styles.saveModalTitle}>Сохранено</h3>
            <p className={styles.saveModalText}>Изменения успешно сохранены.</p>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setIsSaveSuccessModalOpen(false)}
            >
              Ок
            </button>
          </div>
        </div>
      ) : null}

      <div className={`${styles.tabBar} ${styles.blockTabs}`} role="tablist">
        {REPAIR_DOCUMENT_TAB_IDS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`${styles.tab} ${activeTab === id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(id)}
          >
            {REPAIR_DOCUMENT_TAB_LABELS[id]}
          </button>
        ))}
      </div>

      {activeTab === 'data' ? (
        <div className={`${styles.blockData} ${styles.dataCompact}`}>
          <div className={styles.formGrid}>
            <div className={styles.dataTopRow}>
              <div className={styles.dataTopBlock}>
                <h3 className={styles.sectionTitle}>Связь с CRM</h3>
                <div
                  className={`${styles.field} ${styles.crmCompactField} ${styles.crmCompactBox}`}
                >
                  <label htmlFor="crm_search">Найти договор (№, ФИО, телефон)</label>
                  <input
                    id="crm_search"
                    value={contractQuery}
                    onChange={(e) => setContractQuery(e.target.value)}
                    placeholder="Начните вводить для поиска…"
                  />
                  <p className={styles.hint} style={{ marginTop: 2 }}>
                    {contractsLoading ? 'Поиск…' : `Найдено: ${contractResults.length}`}
                  </p>
                  {contractResults.length > 0 ? (
                    <ul className={styles.crmResultsList}>
                      {contractResults.map((c) => (
                        <li key={c.id} className={styles.crmResultItem}>
                          <button
                            type="button"
                            className={`${styles.secondaryBtn} ${styles.crmResultBtn}`}
                            onClick={() => {
                              setDraftCrmContractId(c.id);
                              setDirty(true);
                            }}
                          >
                            № {c.contractNumber} · {c.customerName || '—'}{' '}
                            {draftCrmContractId === c.id ? '(выбран)' : ''}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div
                  className={`${styles.field} ${styles.crmCompactField} ${styles.crmCompactBox}`}
                  style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}
                >
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!draftCrmContractId}
                    onClick={() => void handlePullFromCrm()}
                  >
                    Подставить данные из CRM в форму
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    disabled={!draftCrmContractId}
                    onClick={() => {
                      setDraftCrmContractId(null);
                      setDirty(true);
                    }}
                  >
                    Отвязать договор
                  </button>
                  {draftCrmContractId ? (
                    <Link
                      className={styles.secondaryBtn}
                      href={`/admin/crm/contracts/${draftCrmContractId}`}
                    >
                      Открыть карточку в CRM
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className={`${styles.dataTopBlock} ${styles.contractCompactBlock}`}>
                <h3 className={styles.sectionTitle}>Договор (реквизиты для подстановки)</h3>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cn">Номер договора</label>
                    <input
                      id="cn"
                      value={form.contract.number}
                      onChange={(e) => updateContract('number', e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cd">Дата договора</label>
                    <input
                      id="cd"
                      value={form.contract.date}
                      onChange={(e) => updateContract('date', e.target.value)}
                    />
                  </div>
                </div>
                <div className={`${styles.contractInlineRow} ${styles.contractAmountsRow}`}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="cta">Сумма договора (цифрами)</label>
                    <input
                      id="cta"
                      value={form.contract.totalAmount}
                      onChange={(e) => updateContract('totalAmount', e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="ctaw">Сумма прописью</label>
                    <input
                      id="ctaw"
                      className={styles.autoFilledInput}
                      value={form.contract.totalAmountWords}
                      onChange={(e) => updateContract('totalAmountWords', e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="crp">Рекомендованная предоплата (70%)</label>
                    <input
                      id="crp"
                      className={styles.autoFilledInput}
                      value={form.contract.recommendedPrepayment}
                      readOnly
                    />
                  </div>
                </div>
                <div className={styles.contractInlineRow}>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="prep">Аванс / предоплата</label>
                    <input
                      id="prep"
                      value={form.contract.prepaymentAmount}
                      onChange={(e) => updateContract('prepaymentAmount', e.target.value)}
                    />
                  </div>
                  <div className={`${styles.field} ${styles.contractInlineField}`}>
                    <label htmlFor="wp">Сроки / период работ</label>
                    <input
                      id="wp"
                      value={form.contract.workPeriod}
                      onChange={(e) => updateContract('workPeriod', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionCustomer}`}>
              <h3 className={styles.sectionTitle}>Заказчик</h3>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="c_type">Тип заказчика</label>
                  <select
                    id="c_type"
                    value={form.customer.type}
                    onChange={(e) =>
                      updateCustomer(
                        'type',
                        e.target.value as RepairPackageFormData['customer']['type']
                      )
                    }
                  >
                    <option value="PERSON">Физлицо</option>
                    <option value="COMPANY">ЮЛ</option>
                    <option value="ENTREPRENEUR">ИП</option>
                  </select>
                </div>
                {form.customer.type === 'PERSON' ? (
                  <div className={styles.field}>
                    <label htmlFor="c_fullName">ФИО</label>
                    <input
                      id="c_fullName"
                      value={form.customer.fullName}
                      onChange={(e) => updateCustomer('fullName', e.target.value)}
                    />
                  </div>
                ) : (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameNom">ФИО представителя (именительный)</label>
                      <input
                        id="c_repFullNameNom"
                        value={form.customer.representativeFullNameNominative}
                        onChange={(e) =>
                          updateCustomer('representativeFullNameNominative', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_repFullNameGen">ФИО представителя (родительный)</label>
                      <input
                        id="c_repFullNameGen"
                        value={form.customer.representativeFullNameGenitive}
                        onChange={(e) =>
                          updateCustomer('representativeFullNameGenitive', e.target.value)
                        }
                      />
                    </div>
                  </>
                )}
                {form.customer.type !== 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_orgName">Наименование организации</label>
                      <input
                        id="c_orgName"
                        value={form.customer.organizationName}
                        onChange={(e) => updateCustomer('organizationName', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posNom">Должность представителя (именительный)</label>
                      <input
                        id="c_posNom"
                        value={form.customer.representativePositionNominative}
                        onChange={(e) =>
                          updateCustomer('representativePositionNominative', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_posGen">Должность представителя (родительный)</label>
                      <input
                        id="c_posGen"
                        value={form.customer.representativePositionGenitive}
                        onChange={(e) =>
                          updateCustomer('representativePositionGenitive', e.target.value)
                        }
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_inn">ИНН</label>
                      <input
                        id="c_inn"
                        value={form.customer.inn}
                        onChange={(e) => updateCustomer('inn', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_ogrn">ОГРН</label>
                      <input
                        id="c_ogrn"
                        value={form.customer.ogrn}
                        onChange={(e) => updateCustomer('ogrn', e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
                <div className={styles.field}>
                  <label htmlFor="c_address">Адрес</label>
                  <input
                    id="c_address"
                    value={form.customer.address}
                    onChange={(e) => updateCustomer('address', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="c_phone">Телефон</label>
                  <input
                    id="c_phone"
                    value={form.customer.phone}
                    onChange={(e) => updateCustomer('phone', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="c_email">E-mail</label>
                  <input
                    id="c_email"
                    value={form.customer.email}
                    onChange={(e) => updateCustomer('email', e.target.value)}
                  />
                </div>
                {form.customer.type === 'PERSON' ? (
                  <>
                    <div className={styles.field}>
                      <label htmlFor="c_passport">Паспорт (серия и номер)</label>
                      <input
                        id="c_passport"
                        value={form.customer.passportSeriesNumber}
                        onChange={(e) => updateCustomer('passportSeriesNumber', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportBy">Кем выдан</label>
                      <input
                        id="c_passportBy"
                        value={form.customer.passportIssuedBy}
                        onChange={(e) => updateCustomer('passportIssuedBy', e.target.value)}
                      />
                    </div>
                    <div className={styles.field}>
                      <label htmlFor="c_passportDate">Дата выдачи</label>
                      <input
                        id="c_passportDate"
                        value={form.customer.passportIssueDate}
                        onChange={(e) => updateCustomer('passportIssueDate', e.target.value)}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionExecutor}`}>
              <h3 className={styles.sectionTitle}>Исполнитель</h3>
              <div className={styles.sectionFields}>
                <div className={styles.field}>
                  <label htmlFor="e_profile">Наши реквизиты (из справочника)</label>
                  <select
                    id="e_profile"
                    value={form.executor.selectedProfileTitle}
                    onChange={(e) => applyExecutorProfile(e.target.value)}
                  >
                    <option value="">— выбрать набор —</option>
                    {executorProfiles.map((profile) => (
                      <option key={profile.title} value={profile.title}>
                        {profile.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_company">Наименование организации</label>
                  <input
                    id="e_company"
                    value={form.executor.companyName}
                    onChange={(e) => updateExecutor('companyName', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_inn">ИНН</label>
                  <input
                    id="e_inn"
                    value={form.executor.inn}
                    onChange={(e) => updateExecutor('inn', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_kpp">КПП</label>
                  <input
                    id="e_kpp"
                    value={form.executor.kpp}
                    onChange={(e) => updateExecutor('kpp', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_ogrn">ОГРН</label>
                  <input
                    id="e_ogrn"
                    value={form.executor.ogrn}
                    onChange={(e) => updateExecutor('ogrn', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_legal">Юридический адрес</label>
                  <textarea
                    id="e_legal"
                    value={form.executor.legalAddress}
                    onChange={(e) => updateExecutor('legalAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_actual">Фактический адрес</label>
                  <textarea
                    id="e_actual"
                    value={form.executor.actualAddress}
                    onChange={(e) => updateExecutor('actualAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_bank">Банковские реквизиты</label>
                  <textarea
                    id="e_bank"
                    value={form.executor.bankDetails}
                    onChange={(e) => updateExecutor('bankDetails', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_directorNom">Подписант (именительный падеж)</label>
                  <input
                    id="e_directorNom"
                    value={form.executor.directorNameNominative}
                    onChange={(e) => updateExecutor('directorNameNominative', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_directorGen">Подписант (родительный падеж)</label>
                  <input
                    id="e_directorGen"
                    value={form.executor.directorNameGenitive}
                    onChange={(e) => updateExecutor('directorNameGenitive', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="e_basis">Действует на основании</label>
                  <input
                    id="e_basis"
                    value={form.executor.basis}
                    onChange={(e) => updateExecutor('basis', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={`${styles.sectionCard} ${styles.sectionObject}`}>
              <h3 className={styles.sectionTitle}>Объект</h3>
              <div className={`${styles.sectionFields} ${styles.objectSectionFields}`}>
                <div className={styles.field}>
                  <label htmlFor="o_addr">Адрес объекта</label>
                  <input
                    id="o_addr"
                    value={form.object.objectAddress}
                    onChange={(e) => updateObject('objectAddress', e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="o_desc">Описание работ / объекта</label>
                  <textarea
                    id="o_desc"
                    value={form.object.objectDescription}
                    onChange={(e) => updateObject('objectDescription', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <p className={styles.hint}>
            Полная инструкция:{' '}
            <Link className={styles.link} href="/admin/contract-documents/instruction">
              Оформление договоров → Инструкция
            </Link>
            . На вкладке «Договор» можно править HTML и вставлять плейсхолдеры.
          </p>
        </div>
      ) : activeTab === 'contract' ? (
        <>
          <div
            className={`${styles.docToolbar} ${styles.blockImport}`}
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={handleResetContractTemplate}
              >
                Сбросить к шаблону по умолчанию
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                disabled={publishingGlobal}
                onClick={() => void handlePublishAsGlobalDefault()}
              >
                {publishingGlobal ? 'Сохранение…' : 'Сделать шаблоном по умолчанию для всех'}
              </button>
              <button
                type="button"
                className={
                  contractDocView === 'preview'
                    ? styles.contractModeBtnActive
                    : styles.contractModeBtn
                }
                onClick={() => setContractDocView('preview')}
              >
                Только препросмотр
              </button>
              <button
                type="button"
                className={
                  contractDocView === 'edit' ? styles.contractModeBtnActive : styles.contractModeBtn
                }
                onClick={() => setContractDocView('edit')}
              >
                Редактировать шаблон и плейсхолдеры
              </button>
              {templateOverrides.contract ? (
                <span className={styles.hint} style={{ margin: 0 }}>
                  У пакета свой текст договора. Если он совпадает с текущим «шаблоном по умолчанию»
                  (общим или из кода), переопределение снимется при сохранении поля.
                </span>
              ) : (
                <span className={styles.hint} style={{ margin: 0 }}>
                  Без своего текста используется общий шаблон из системы (если задан), иначе —
                  встроенный из кода. Кнопка «Сделать шаблоном по умолчанию для всех» сохраняет
                  текущий HTML для всех пакетов без своего текста.
                </span>
              )}
            </div>
            {excelMessage ? <p className={styles.hint}>{excelMessage}</p> : null}
          </div>

          {contractDocView === 'edit' ? (
            <>
              <div className={`${styles.contractTopTools} ${styles.blockTools}`}>
                <div className={styles.contractEditorMain}>
                  <div className={styles.formatLevelBar}>
                    <button
                      type="button"
                      className={
                        formatToolbarLevel === 'basic'
                          ? styles.formatLevelBtnActive
                          : styles.formatLevelBtn
                      }
                      onClick={() => setFormatToolbarLevel('basic')}
                    >
                      Базовые
                    </button>
                    <button
                      type="button"
                      className={
                        formatToolbarLevel === 'advanced'
                          ? styles.formatLevelBtnActive
                          : styles.formatLevelBtn
                      }
                      onClick={() => setFormatToolbarLevel('advanced')}
                    >
                      Расширенные
                    </button>
                  </div>
                  <div className={styles.formatToolbarTopRow}>
                    <input
                      type="text"
                      value={formatToolbarQuery}
                      onChange={(e) => setFormatToolbarQuery(e.target.value)}
                      placeholder="Поиск инструмента…"
                      className={styles.formatSearchInput}
                    />
                    <button
                      type="button"
                      className={
                        showAllFormatTools ? styles.formatLevelBtnActive : styles.formatLevelBtn
                      }
                      onClick={() => setShowAllFormatTools((v) => !v)}
                    >
                      {showAllFormatTools ? 'Только частые' : 'Показать все'}
                    </button>
                  </div>
                  <div className={styles.formatToolbar}>
                    {visibleTools.map((tool) => (
                      <button
                        key={tool.label}
                        type="button"
                        className={styles.formatBtn}
                        onClick={tool.onClick}
                      >
                        {tool.label}
                      </button>
                    ))}
                    {visibleTools.length === 0 ? (
                      <span className={styles.hint} style={{ margin: 0 }}>
                        По запросу ничего не найдено.
                      </span>
                    ) : null}
                  </div>
                </div>
                <aside className={styles.placeholderPanelTop} aria-label="Плейсхолдеры для вставки">
                  {REPAIR_CONTRACT_PLACEHOLDER_GROUPS.map((group) => (
                    <div key={group.title}>
                      <div className={styles.placeholderGroupTitle}>{group.title}</div>
                      <div className={styles.placeholderChips}>
                        {group.items.map((item) => (
                          <button
                            key={item.path}
                            type="button"
                            className={styles.placeholderChip}
                            title={`Вставить {{${item.path}}}`}
                            onClick={() => insertContractPlaceholder(item.path)}
                          >
                            {item.label} <code>{`{{${item.path}}}`}</code>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </aside>
              </div>

              <p className={styles.hint}>
                Нажмите на поле слева — в шаблон вставится <code>{'{{путь}}'}</code> в позицию
                курсора. Панель форматирования разделена на уровни: «Базовые» и «Расширенные», есть
                поиск по названию кнопок и переключатель «Только частые / Показать все». Разрешены
                теги HTML (<code>&lt;p&gt;</code>, <code>&lt;h1&gt;</code>,{' '}
                <code>&lt;table&gt;</code> и т.д.). После правок нажмите «Сохранить» вверху
                страницы.
              </p>

              <div className={styles.contractLiveGrid}>
                <div className={styles.contractEditColumn}>
                  <label className={styles.contractEditorLabel} htmlFor="contract_html_source">
                    HTML шаблона договора (подстановка при сохранении вкладки «Данные»)
                  </label>
                  <textarea
                    id="contract_html_source"
                    ref={contractHtmlTextareaRef}
                    className={styles.contractHtmlTextarea}
                    spellCheck={false}
                    value={contractTemplateSource}
                    onChange={(e) => handleContractTemplateChange(e.target.value)}
                  />
                </div>
                <div className={styles.contractPreviewColumn}>
                  <h3 className={styles.previewBlockTitle}>Предпросмотр с подстановкой данных</h3>
                  <div className={`${styles.docPane} ${styles.previewResizable}`}>
                    <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={styles.docPane}>
                <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div className={styles.docPane}>
            <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
          </div>
        </>
      )}
    </div>
  );
}
