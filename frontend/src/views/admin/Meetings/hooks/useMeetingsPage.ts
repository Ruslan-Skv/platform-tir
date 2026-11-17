'use client';

import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import { useMeetingRoom } from '@/features/meetings';
import { type AdminUserItem, getAdminAccessUsers } from '@/shared/api/admin-access';
import {
  type Meeting,
  cancelMeeting,
  createMeeting,
  listMeetings,
} from '@/shared/api/admin-meetings';

export type MeetingsPageModel = ReturnType<typeof useMeetingsPage>;

export function useMeetingsPage(initialJoinId: string | null) {
  const { user } = useAuth();
  const [scope, setScope] = useState<'upcoming' | 'past'>('upcoming');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDate, setCreateDate] = useState('');
  const [createTime, setCreateTime] = useState('');
  const [createParticipantIds, setCreateParticipantIds] = useState<string[]>([]);

  const [joinId, setJoinId] = useState<string | null>(initialJoinId);
  const room = useMeetingRoom(joinId ?? '');

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      setMeetings(await listMeetings(scope));
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void getAdminAccessUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const openCreate = useCallback(() => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateDate('');
    setCreateTime('');
    setCreateParticipantIds([]);
    setCreateOpen(true);
  }, []);

  const submitCreate = useCallback(async () => {
    const title = createTitle.trim();
    if (!title || busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const scheduledAt =
        createDate && createTime
          ? new Date(`${createDate}T${createTime}`).toISOString()
          : undefined;
      const meeting = await createMeeting({
        title,
        description: createDescription.trim() || undefined,
        scheduledAt,
        participantIds: createParticipantIds,
      });
      setCreateOpen(false);
      if (scope === 'upcoming') await reload();
      // сразу открыть экран входа, если собрание «прямо сейчас»
      if (!scheduledAt) setJoinId(meeting.id);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Не удалось создать собрание');
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    createDate,
    createDescription,
    createParticipantIds,
    createTime,
    createTitle,
    reload,
    scope,
  ]);

  const submitCancel = useCallback(
    async (id: string) => {
      if (busy) return;
      setBusy(true);
      try {
        await cancelMeeting(id);
        await reload();
      } catch (e) {
        setErrorMessage(e instanceof Error ? e.message : 'Не удалось отменить собрание');
      } finally {
        setBusy(false);
      }
    },
    [busy, reload]
  );

  const openJoin = useCallback(async (id: string) => {
    setErrorMessage(null);
    // проверяем доступность собрания до показа экрана входа
    try {
      const { getMeeting } = await import('@/shared/api/admin-meetings');
      const meeting = await getMeeting(id);
      if (meeting.status === 'ENDED') {
        setErrorMessage('Собрание уже завершено');
        return;
      }
      if (meeting.status === 'CANCELLED') {
        setErrorMessage('Собрание отменено');
        return;
      }
      setJoinId(id);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Собрание недоступно');
    }
  }, []);

  const closeJoin = useCallback(() => {
    setJoinId(null);
    void reload();
  }, [reload]);

  return {
    scope,
    setScope,
    currentUserId: user?.id ?? null,
    meetings,
    loading,
    errorMessage,
    setErrorMessage,
    users,
    createOpen,
    setCreateOpen,
    busy,
    createTitle,
    createDescription,
    createDate,
    createTime,
    createParticipantIds,
    setCreateTitle,
    setCreateDescription,
    setCreateDate,
    setCreateTime,
    setCreateParticipantIds,
    openCreate,
    submitCreate,
    submitCancel,
    joinId,
    openJoin,
    closeJoin,
    room,
    reload,
  };
}
