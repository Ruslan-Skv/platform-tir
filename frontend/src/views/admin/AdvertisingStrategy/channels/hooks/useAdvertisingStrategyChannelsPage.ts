'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type MarketingChannel,
  createMarketingChannel,
  deleteMarketingChannel,
  getMarketingChannels,
  getMarketingStrategy,
  updateMarketingChannel,
} from '@/shared/api/admin-marketing';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import {
  budgetFromShare,
  shareFromBudget,
  slugifyChannelCode,
} from '../../shared/advertising-strategy.utils';

type ChannelFormState = {
  name: string;
  code: string;
  priority: string;
  monthlyBudget: string;
  sharePercent: string;
  role: string;
  description: string;
  isActive: boolean;
};

const emptyForm = (): ChannelFormState => ({
  name: '',
  code: '',
  priority: '10',
  monthlyBudget: '',
  sharePercent: '',
  role: '',
  description: '',
  isActive: true,
});

function toForm(channel: MarketingChannel): ChannelFormState {
  return {
    name: channel.name,
    code: channel.code,
    priority: String(channel.priority),
    monthlyBudget: channel.monthlyBudget != null ? String(channel.monthlyBudget) : '',
    sharePercent: channel.budgetSharePercent != null ? String(channel.budgetSharePercent) : '',
    role: channel.role ?? '',
    description: channel.description ?? '',
    isActive: channel.isActive,
  };
}

export function useAdvertisingStrategyChannelsPage() {
  const [channels, setChannels] = useState<MarketingChannel[]>([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingChannel | null>(null);
  const [form, setForm] = useState<ChannelFormState>(emptyForm);
  const [codeTouched, setCodeTouched] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [chs, strategy] = await Promise.all([getMarketingChannels(), getMarketingStrategy()]);
      setChannels(chs);
      setTotalBudget(strategy.monthlyBudgetTotal ?? 0);
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить каналы');
    } finally {
      setLoading(false);
    }
  }, [showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const plannedTotal = useMemo(
    () =>
      channels
        .filter((c) => c.isActive && c.monthlyBudget != null)
        .reduce((sum, c) => sum + (c.monthlyBudget ?? 0), 0),
    [channels]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setCodeTouched(false);
    resetSaveFeedback();
    setModalOpen(true);
  };

  const openEdit = (channel: MarketingChannel) => {
    setEditing(channel);
    setForm(toForm(channel));
    setCodeTouched(true);
    resetSaveFeedback();
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const onBudgetInput = (money: string) => {
    const amount = money.trim() === '' ? null : Number(money);
    setForm((f) => ({
      ...f,
      monthlyBudget: money,
      sharePercent:
        amount === null || !Number.isFinite(amount) || totalBudget <= 0
          ? f.sharePercent
          : String(shareFromBudget(amount, totalBudget) ?? ''),
    }));
  };

  const onShareInput = (share: string) => {
    const pct = share.trim() === '' ? null : Number(share);
    setForm((f) => ({
      ...f,
      sharePercent: share,
      monthlyBudget:
        pct === null || !Number.isFinite(pct) || totalBudget <= 0
          ? f.monthlyBudget
          : String(budgetFromShare(pct, totalBudget) ?? ''),
    }));
  };

  const onNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      code: codeTouched ? f.code : slugifyChannelCode(name),
    }));
  };

  const onCodeChange = (code: string) => {
    setCodeTouched(true);
    setForm((f) => ({ ...f, code }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        priority: Number(form.priority) || 100,
        monthlyBudget: form.monthlyBudget.trim() === '' ? null : Number(form.monthlyBudget),
        role: form.role.trim() || null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editing) {
        await updateMarketingChannel(editing.id, payload);
      } else {
        await createMarketingChannel(payload);
      }
      showSaveSuccess();
      closeModal();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (channel: MarketingChannel) => {
    if (
      !window.confirm(`Удалить канал «${channel.name}»? Статистика по каналу тоже будет удалена.`)
    ) {
      return;
    }
    resetSaveFeedback();
    try {
      await deleteMarketingChannel(channel.id);
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка удаления');
    }
  };

  return {
    channels,
    totalBudget,
    loading,
    saving,
    modalOpen,
    editing,
    form,
    setForm,
    saveNoticeVisible,
    errorMessage,
    plannedTotal,
    openCreate,
    openEdit,
    closeModal,
    onBudgetInput,
    onShareInput,
    onNameChange,
    onCodeChange,
    handleSubmit,
    handleDelete,
  };
}

export type AdvertisingStrategyChannelsPageModel = ReturnType<
  typeof useAdvertisingStrategyChannelsPage
>;
