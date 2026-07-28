'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import type { Conversation, Message } from '../support-chat-page.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useSupportChatPage() {
  const { getAuthHeaders, user } = useAuth();
  const { canEdit } = useAdminSectionCanEdit();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  const fetchConversations = useCallback(async () => {
    if (!hasLoadedOnceRef.current) setLoading(true);
    else setRefreshing(true);
    try {
      const params = new URLSearchParams({ asSupport: 'true' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await apiFetch(`${API_URL}/support/conversations?${params}`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setConversations(list);
        setSelected((prev) =>
          prev && !list.find((c: Conversation) => c.id === prev.id) ? null : prev
        );
        hasLoadedOnceRef.current = true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders, statusFilter]);

  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true);
      try {
        const res = await apiFetch(`${API_URL}/support/conversations/${conversationId}/messages`, {
          headers: getAuthHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingMessages(false);
      }
    },
    [getAuthHeaders]
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (selected?.id) {
      fetchMessages(selected.id);
    } else {
      setMessages([]);
    }
  }, [selected?.id, fetchMessages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !selected || sending || !canEdit) return;
    setSending(true);
    setInput('');
    try {
      const res = await apiFetch(`${API_URL}/support/conversations/${selected.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content: text }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
      } else {
        setInput(text);
      }
    } catch (e) {
      setInput(text);
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const refresh = useCallback(async () => {
    await fetchConversations();
    if (selected?.id) {
      await fetchMessages(selected.id);
    }
  }, [fetchConversations, fetchMessages, selected?.id]);

  return {
    user,
    conversations,
    selected,
    setSelected,
    messages,
    statusFilter,
    setStatusFilter,
    input,
    setInput,
    loading,
    refreshing,
    loadingMessages,
    sending,
    sendMessage,
    refresh,
    canEdit,
  };
}

export type SupportChatPageModel = ReturnType<typeof useSupportChatPage>;
