'use client';

import type { Socket } from 'socket.io-client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAdminSectionPermission } from '@/features/admin';
import { useAuth } from '@/features/auth';
import {
  type MessengerConversationDetail,
  type MessengerConversationSummary,
  type MessengerMessage,
  type MessengerUserRef,
  createMessengerChannel,
  createMessengerDirect,
  getMessengerConversation,
  listMessengerConversations,
  listMessengerMessages,
  listMessengerUsers,
  markMessengerRead,
  sendMessengerMessage,
} from '@/shared/api/messenger/admin-messenger';
import {
  connectMessengerSocket,
  joinMessengerConversation,
  leaveMessengerConversation,
} from '@/shared/api/messenger/messenger-socket';

export type MessengerPageModel = ReturnType<typeof useMessengerPage>;

type ListTab = 'channels' | 'direct';

export function useMessengerPage() {
  const { canEdit } = useAdminSectionPermission();
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  const [conversations, setConversations] = useState<MessengerConversationSummary[]>([]);
  const [users, setUsers] = useState<MessengerUserRef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<MessengerConversationDetail | null>(null);
  const [messages, setMessages] = useState<MessengerMessage[]>([]);
  const [listTab, setListTab] = useState<ListTab>('channels');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [channelTitle, setChannelTitle] = useState('');
  const [channelMemberIds, setChannelMemberIds] = useState<string[]>([]);
  const [dmModalOpen, setDmModalOpen] = useState(false);
  const [dmUserId, setDmUserId] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const applySummaryAsDetail = useCallback((summary: MessengerConversationSummary) => {
    setActiveDetail({
      id: summary.id,
      type: summary.type,
      title: summary.title,
      isGeneral: summary.isGeneral,
      kanbanCardId: summary.kanbanCardId,
      createdById: '',
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
      lastReadAt: summary.lastReadAt,
      members: summary.members,
    });
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    try {
      const { items } = await listMessengerMessages(conversationId, { limit: 80 });
      setMessages(items);
      await markMessengerRead(conversationId);
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const selectConversation = useCallback(
    async (id: string) => {
      const prev = selectedIdRef.current;
      if (prev && prev !== id) {
        leaveMessengerConversation(socketRef.current, prev);
      }
      setSelectedId(id);
      joinMessengerConversation(socketRef.current, id);
      const summary = conversationsRef.current.find((c) => c.id === id);
      if (summary) {
        applySummaryAsDetail(summary);
        if (summary.type === 'CHANNEL') setListTab('channels');
        else if (summary.type === 'DIRECT') setListTab('direct');
      } else {
        try {
          const detail = await getMessengerConversation(id);
          setActiveDetail(detail);
          if (detail.type === 'CHANNEL') setListTab('channels');
          else if (detail.type === 'DIRECT') setListTab('direct');
        } catch {
          /* keep previous detail if fetch fails */
        }
      }
      await loadMessages(id);
    },
    [applySummaryAsDetail, loadMessages]
  );

  const reloadConversations = useCallback(async () => {
    const list = await listMessengerConversations();
    setConversations(list);
    return list;
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [list, userList] = await Promise.all([
        reloadConversations(),
        listMessengerUsers().catch(() => [] as MessengerUserRef[]),
      ]);
      setUsers(userList);

      const queryConversationId =
        typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('c') : null;

      if (queryConversationId) {
        const inList = list.find((c) => c.id === queryConversationId);
        if (inList) {
          setSelectedId(inList.id);
          joinMessengerConversation(socketRef.current, inList.id);
          applySummaryAsDetail(inList);
          if (inList.type === 'CHANNEL') setListTab('channels');
          else if (inList.type === 'DIRECT') setListTab('direct');
          await loadMessages(inList.id);
          return;
        }
        try {
          const detail = await getMessengerConversation(queryConversationId);
          setSelectedId(detail.id);
          joinMessengerConversation(socketRef.current, detail.id);
          setActiveDetail(detail);
          if (detail.type === 'CHANNEL') setListTab('channels');
          else if (detail.type === 'DIRECT') setListTab('direct');
          await loadMessages(detail.id);
          return;
        } catch {
          /* fall through to default selection */
        }
      }

      const currentId = selectedIdRef.current;
      if (currentId) {
        const still = list.find((c) => c.id === currentId);
        if (still) {
          applySummaryAsDetail(still);
          await loadMessages(still.id);
          return;
        }
      }

      const preferred =
        list.find((c) => c.isGeneral) ?? list.find((c) => c.type === 'CHANNEL') ?? list[0] ?? null;
      if (preferred) {
        setSelectedId(preferred.id);
        joinMessengerConversation(socketRef.current, preferred.id);
        applySummaryAsDetail(preferred);
        await loadMessages(preferred.id);
      } else {
        setSelectedId(null);
        setMessages([]);
        setActiveDetail(null);
      }
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [applySummaryAsDetail, loadMessages, reloadConversations]);

  useEffect(() => {
    void reload();
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const socket = connectMessengerSocket({
      onMessageNew: (message) => {
        if (message.conversationId === selectedIdRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) return prev;
            return [...prev, message];
          });
          void markMessengerRead(message.conversationId);
        }
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== message.conversationId) return c;
            const unreadBump =
              message.conversationId === selectedIdRef.current || message.authorId === currentUserId
                ? 0
                : 1;
            return {
              ...c,
              unreadCount: c.unreadCount + unreadBump,
              lastMessage: {
                id: message.id,
                body: message.body,
                createdAt: message.createdAt,
                authorId: message.authorId,
                author: message.author,
              },
              updatedAt: message.createdAt,
            };
          });
          return [...next].sort((a, b) => {
            const at = a.lastMessage?.createdAt ?? a.updatedAt;
            const bt = b.lastMessage?.createdAt ?? b.updatedAt;
            return new Date(bt).getTime() - new Date(at).getTime();
          });
        });
      },
      onConversationUpdated: () => {
        void reloadConversations().catch(() => undefined);
      },
    });
    socketRef.current = socket;
    if (selectedIdRef.current) {
      joinMessengerConversation(socket, selectedIdRef.current);
    }
    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
  }, [currentUserId, reloadConversations]);

  const channels = useMemo(
    () => conversations.filter((c) => c.type === 'CHANNEL'),
    [conversations]
  );
  const directs = useMemo(() => conversations.filter((c) => c.type === 'DIRECT'), [conversations]);
  const listItems = listTab === 'channels' ? channels : directs;

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    setErrorMessage(null);
    try {
      const created = await sendMessengerMessage(selectedId, text);
      setInput('');
      setMessages((prev) => {
        if (prev.some((m) => m.id === created.id)) return prev;
        return [...prev, created];
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? {
                ...c,
                lastMessage: {
                  id: created.id,
                  body: created.body,
                  createdAt: created.createdAt,
                  authorId: created.authorId,
                  author: created.author,
                },
                unreadCount: 0,
              }
            : c
        )
      );
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Не удалось отправить');
    } finally {
      setSending(false);
    }
  }, [input, selectedId, sending]);

  const openChannelModal = useCallback(() => {
    setChannelTitle('');
    setChannelMemberIds([]);
    setChannelModalOpen(true);
  }, []);

  const submitChannel = useCallback(async () => {
    if (!channelTitle.trim() || busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const created = await createMessengerChannel({
        title: channelTitle.trim(),
        memberIds: channelMemberIds,
      });
      setChannelModalOpen(false);
      await reloadConversations();
      await selectConversation(created.id);
      setListTab('channels');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Не удалось создать канал');
    } finally {
      setBusy(false);
    }
  }, [busy, channelMemberIds, channelTitle, reloadConversations, selectConversation]);

  const openDmModal = useCallback(() => {
    setDmUserId('');
    setDmModalOpen(true);
  }, []);

  const submitDm = useCallback(async () => {
    if (!dmUserId || busy) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const created = await createMessengerDirect(dmUserId);
      setDmModalOpen(false);
      await reloadConversations();
      await selectConversation(created.id);
      setListTab('direct');
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Не удалось создать чат');
    } finally {
      setBusy(false);
    }
  }, [busy, dmUserId, reloadConversations, selectConversation]);

  return {
    canEdit,
    currentUserId,
    conversations,
    listTab,
    setListTab,
    listItems,
    selectedId,
    activeDetail,
    messages,
    users,
    input,
    setInput,
    loading,
    loadingMessages,
    sending,
    busy,
    errorMessage,
    reload,
    selectConversation,
    sendMessage,
    channelModalOpen,
    setChannelModalOpen,
    channelTitle,
    setChannelTitle,
    channelMemberIds,
    setChannelMemberIds,
    openChannelModal,
    submitChannel,
    dmModalOpen,
    setDmModalOpen,
    dmUserId,
    setDmUserId,
    openDmModal,
    submitDm,
  };
}
