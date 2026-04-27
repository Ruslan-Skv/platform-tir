'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import {
  getContractDocumentGlobalTemplate,
  getContractDocumentPackage,
  putContractDocumentGlobalTemplate,
  updateContractDocumentPackage,
} from '@/shared/api/admin-contract-document-packages';
import type { Contract } from '@/shared/api/admin-crm';
import { getContract, getContracts } from '@/shared/api/admin-crm';

import styles from '../ContractDocuments.module.css';
import { mergeRepairFormFromCrmContract } from './applyCrmContractToForm';
import { applyTemplate } from './applyTemplate';
import { contractHtmlFromExcelArrayBuffer } from './excelToDocPrintHtml';
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
  const [dirty, setDirty] = useState(false);
  const [contractQuery, setContractQuery] = useState('');
  const [contractResults, setContractResults] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [templateOverrides, setTemplateOverrides] = useState<
    Partial<Record<RepairDocumentTemplateTabId, string>>
  >({});
  const [excelMessage, setExcelMessage] = useState<string | null>(null);
  const contractExcelInputRef = useRef<HTMLInputElement>(null);
  const contractHtmlTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [contractDocView, setContractDocView] = useState<'preview' | 'edit'>('preview');
  const [globalContractState, setGlobalContractState] = useState<{
    loaded: boolean;
    html: string | null;
  }>({ loaded: false, html: null });
  const [publishingGlobal, setPublishingGlobal] = useState(false);

  const resolvedContractDefaultTemplate = useMemo(() => {
    if (!globalContractState.loaded) return FILE_REPAIR_CONTRACT_TEMPLATE;
    if (globalContractState.html !== null) return globalContractState.html;
    return FILE_REPAIR_CONTRACT_TEMPLATE;
  }, [globalContractState]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [row, globalTpl] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentGlobalTemplate('REPAIR', 'contract').catch(() => ({
          html: null as string | null,
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
      await load();
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
    setForm((p) => ({ ...p, customer: { ...p.customer, [key]: value } }));
    setDirty(true);
  };

  const updateExecutor = <K extends keyof RepairPackageFormData['executor']>(
    key: K,
    value: string
  ) => {
    setForm((p) => ({ ...p, executor: { ...p.executor, [key]: value } }));
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
    setForm((p) => ({ ...p, contract: { ...p.contract, [key]: value } }));
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

  const handleContractExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setExcelMessage(null);
    setError(null);
    try {
      const XLSX = await import('xlsx');
      const buf = await file.arrayBuffer();
      const { html, sheetUsed } = contractHtmlFromExcelArrayBuffer(buf, XLSX);
      setTemplateOverrides((prev) => ({ ...prev, contract: html }));
      setDirty(true);
      setExcelMessage(`Загружен лист «${sheetUsed}». Не забудьте нажать «Сохранить».`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось прочитать Excel');
    }
  };

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

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.hint}>Загрузка…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.editorHeader}>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <input
            type="text"
            placeholder="Название черновика"
            value={draftTitle}
            onChange={(e) => {
              setDraftTitle(e.target.value);
              setDirty(true);
            }}
            style={{
              minWidth: 220,
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #d1d5db',
            }}
          />
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
      {error ? <p className={styles.error}>{error}</p> : null}

      <div className={styles.tabBar} role="tablist">
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
        <>
          <div className={styles.formGrid}>
            <h3 className={styles.sectionTitle}>Связь с CRM</h3>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="crm_search">Найти договор (№, ФИО, телефон)</label>
              <input
                id="crm_search"
                value={contractQuery}
                onChange={(e) => setContractQuery(e.target.value)}
                placeholder="Начните вводить для поиска…"
              />
              <p className={styles.hint} style={{ marginTop: 6 }}>
                {contractsLoading ? 'Поиск…' : `Найдено: ${contractResults.length}`}
              </p>
              {contractResults.length > 0 ? (
                <ul
                  style={{ margin: '8px 0 0', paddingLeft: 18, maxHeight: 180, overflowY: 'auto' }}
                >
                  {contractResults.map((c) => (
                    <li key={c.id} style={{ marginBottom: 6 }}>
                      <button
                        type="button"
                        className={styles.secondaryBtn}
                        style={{ textAlign: 'left', width: '100%', justifyContent: 'flex-start' }}
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
              className={styles.field}
              style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8 }}
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

            <h3 className={styles.sectionTitle}>Заказчик</h3>
            <div className={styles.field}>
              <label htmlFor="c_fullName">ФИО</label>
              <input
                id="c_fullName"
                value={form.customer.fullName}
                onChange={(e) => updateCustomer('fullName', e.target.value)}
              />
            </div>
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

            <h3 className={styles.sectionTitle}>Исполнитель</h3>
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
              <label htmlFor="e_director">Подписант (ФИО, должность)</label>
              <input
                id="e_director"
                value={form.executor.directorName}
                onChange={(e) => updateExecutor('directorName', e.target.value)}
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

            <h3 className={styles.sectionTitle}>Объект</h3>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="o_addr">Адрес объекта</label>
              <input
                id="o_addr"
                value={form.object.objectAddress}
                onChange={(e) => updateObject('objectAddress', e.target.value)}
              />
            </div>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="o_desc">Описание работ / объекта</label>
              <textarea
                id="o_desc"
                value={form.object.objectDescription}
                onChange={(e) => updateObject('objectDescription', e.target.value)}
              />
            </div>

            <h3 className={styles.sectionTitle}>Договор (реквизиты для подстановки)</h3>
            <div className={styles.field}>
              <label htmlFor="cn">Номер договора</label>
              <input
                id="cn"
                value={form.contract.number}
                onChange={(e) => updateContract('number', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="cd">Дата договора</label>
              <input
                id="cd"
                value={form.contract.date}
                onChange={(e) => updateContract('date', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="cta">Сумма договора (цифрами)</label>
              <input
                id="cta"
                value={form.contract.totalAmount}
                onChange={(e) => updateContract('totalAmount', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="ctaw">Сумма прописью</label>
              <input
                id="ctaw"
                value={form.contract.totalAmountWords}
                onChange={(e) => updateContract('totalAmountWords', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="prep">Аванс / предоплата</label>
              <input
                id="prep"
                value={form.contract.prepaymentAmount}
                onChange={(e) => updateContract('prepaymentAmount', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="wp">Сроки / период работ</label>
              <input
                id="wp"
                value={form.contract.workPeriod}
                onChange={(e) => updateContract('workPeriod', e.target.value)}
              />
            </div>

            <h3 className={styles.sectionTitle}>Смета (черновик текста)</h3>
            <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="est">Текст для вкладки «Смета»</label>
              <textarea
                id="est"
                rows={6}
                value={form.estimate.notes}
                onChange={(e) => updateEstimate('notes', e.target.value)}
              />
            </div>
          </div>
          <p className={styles.hint}>
            Полная инструкция:{' '}
            <Link className={styles.link} href="/admin/contract-documents/instruction">
              Оформление договоров → Инструкция
            </Link>
            . На вкладке «Договор» можно править HTML и вставлять плейсхолдеры, либо загрузить текст
            из Excel (.xlsx).
          </p>
        </>
      ) : activeTab === 'contract' ? (
        <>
          <div
            className={styles.docToolbar}
            style={{ flexDirection: 'column', alignItems: 'stretch' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              <input
                ref={contractExcelInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className={styles.visuallyHidden}
                onChange={(e) => void handleContractExcelChange(e)}
              />
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => contractExcelInputRef.current?.click()}
              >
                Загрузить текст из Excel (.xlsx)
              </button>
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

          <div className={styles.contractModeBar}>
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
          </div>

          {contractDocView === 'edit' ? (
            <>
              <div className={styles.contractEditGrid}>
                <aside className={styles.placeholderPanel} aria-label="Плейсхолдеры для вставки">
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
                <div className={styles.contractEditorMain}>
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
              </div>
              <p className={styles.hint}>
                Нажмите на поле слева — в шаблон вставится <code>{'{{путь}}'}</code> в позицию
                курсора. Разрешены теги HTML (<code>&lt;p&gt;</code>, <code>&lt;h1&gt;</code>,{' '}
                <code>&lt;table&gt;</code> и т.д.). После правок нажмите «Сохранить» вверху
                страницы.
              </p>
              <h3 className={styles.previewBlockTitle}>Предпросмотр с подстановкой данных</h3>
            </>
          ) : null}

          <div className={styles.docToolbar}>
            <button type="button" className={styles.primaryBtn} onClick={handlePrint}>
              Печать
            </button>
            <span className={styles.hint} style={{ margin: 0 }}>
              Откроется окно печати только с текстом этой вкладки.
            </span>
          </div>
          <div className={styles.docPane}>
            <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
          </div>
        </>
      ) : (
        <>
          <div className={styles.docToolbar}>
            <button type="button" className={styles.primaryBtn} onClick={handlePrint}>
              Печать
            </button>
            <span className={styles.hint} style={{ margin: 0 }}>
              Откроется окно печати только с текстом этой вкладки.
            </span>
          </div>
          <div className={styles.docPane}>
            <div dangerouslySetInnerHTML={{ __html: renderedDoc }} />
          </div>
        </>
      )}
    </div>
  );
}
