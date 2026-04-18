'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import React from 'react';

import styles from './BlogPostEditor.module.css';

interface BlogPostEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function BlogPostEditor({
  value,
  onChange,
  placeholder = 'Текст статьи: абзацы, списки, ссылки…',
}: BlogPostEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: styles.proseMirror,
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  if (!editor) {
    return <div className={styles.editorShell} aria-hidden />;
  }

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url =
      typeof window !== 'undefined' ? window.prompt('Адрес ссылки', prev || 'https://') : null;
    if (url === null) return;
    const u = url.trim();
    if (u === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: u }).run();
  };

  const btn = (label: string, active: boolean, onClick: () => void, title: string) => (
    <button
      type="button"
      className={`${styles.toolbarButton} ${active ? styles.toolbarButtonActive : ''}`}
      onClick={onClick}
      title={title}
      aria-pressed={active}
    >
      {label}
    </button>
  );

  return (
    <div className={styles.editorWrap}>
      <div className={styles.toolbar} role="toolbar" aria-label="Форматирование текста">
        {btn(
          'B',
          editor.isActive('bold'),
          () => editor.chain().focus().toggleBold().run(),
          'Жирный'
        )}
        {btn(
          'I',
          editor.isActive('italic'),
          () => editor.chain().focus().toggleItalic().run(),
          'Курсив'
        )}
        {btn(
          'S',
          editor.isActive('strike'),
          () => editor.chain().focus().toggleStrike().run(),
          'Зачёркнутый'
        )}
        <span className={styles.toolbarSep} aria-hidden />
        {btn(
          'H2',
          editor.isActive('heading', { level: 2 }),
          () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
          'Подзаголовок 2'
        )}
        {btn(
          'H3',
          editor.isActive('heading', { level: 3 }),
          () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
          'Подзаголовок 3'
        )}
        <span className={styles.toolbarSep} aria-hidden />
        {btn(
          '•',
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleBulletList().run(),
          'Маркированный список'
        )}
        {btn(
          '1.',
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleOrderedList().run(),
          'Нумерованный список'
        )}
        {btn(
          '❝',
          editor.isActive('blockquote'),
          () => editor.chain().focus().toggleBlockquote().run(),
          'Цитата'
        )}
        {btn('—', false, () => editor.chain().focus().setHorizontalRule().run(), 'Разделитель')}
        <span className={styles.toolbarSep} aria-hidden />
        {btn('🔗', editor.isActive('link'), setLink, 'Ссылка')}
        <span className={styles.toolbarSep} aria-hidden />
        {btn('↶', false, () => editor.chain().focus().undo().run(), 'Отменить')}
        {btn('↷', false, () => editor.chain().focus().redo().run(), 'Повторить')}
      </div>
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
