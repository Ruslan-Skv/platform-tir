'use client';

import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { EditorContent, type Extensions, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import React, { useMemo } from 'react';

import styles from './BlogPostEditor.module.css';
import { BLOG_PARAGRAPH_INDENT_CLASS, BlogParagraph } from './blogParagraphExtension';

interface BlogPostEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  enableTables?: boolean;
}

export function BlogPostEditor({
  value,
  onChange,
  placeholder = 'Текст статьи: абзацы, списки, ссылки…',
  enableTables = false,
}: BlogPostEditorProps) {
  const extensions = useMemo((): Extensions => {
    const base: Extensions = [
      StarterKit.configure({
        paragraph: false,
        heading: { levels: [2, 3, 4, 5, 6] },
      }),
      BlogParagraph,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
      Placeholder.configure({ placeholder }),
    ];

    if (enableTables) {
      return [...base, Table.configure({ resizable: true }), TableRow, TableHeader, TableCell];
    }

    return base;
  }, [enableTables, placeholder]);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions,
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

  const toggleFirstLineIndent = () => {
    if (!editor.isActive('paragraph')) return;
    const raw = editor.getAttributes('paragraph').class;
    const cls = typeof raw === 'string' ? raw : '';
    const parts = cls.split(/\s+/).filter(Boolean);
    const has = parts.includes(BLOG_PARAGRAPH_INDENT_CLASS);
    const next = has
      ? parts.filter((c) => c !== BLOG_PARAGRAPH_INDENT_CLASS).join(' ')
      : [...parts, BLOG_PARAGRAPH_INDENT_CLASS].join(' ');
    editor
      .chain()
      .focus()
      .updateAttributes('paragraph', { class: next || null })
      .run();
  };

  const paraClass = editor.getAttributes('paragraph').class;
  const firstLineIndentActive =
    editor.isActive('paragraph') &&
    typeof paraClass === 'string' &&
    paraClass.split(/\s+/).includes(BLOG_PARAGRAPH_INDENT_CLASS);

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
        {btn(
          'H4',
          editor.isActive('heading', { level: 4 }),
          () => editor.chain().focus().toggleHeading({ level: 4 }).run(),
          'Подзаголовок 4'
        )}
        {btn(
          'H5',
          editor.isActive('heading', { level: 5 }),
          () => editor.chain().focus().toggleHeading({ level: 5 }).run(),
          'Подзаголовок 5'
        )}
        {btn(
          'H6',
          editor.isActive('heading', { level: 6 }),
          () => editor.chain().focus().toggleHeading({ level: 6 }).run(),
          'Подзаголовок 6'
        )}
        {btn(
          '¶',
          editor.isActive('paragraph'),
          () => editor.chain().focus().setParagraph().run(),
          'Обычный абзац (снять заголовок)'
        )}
        {btn(
          '⇥',
          firstLineIndentActive,
          toggleFirstLineIndent,
          'Красная строка: отступ первой строки абзаца (повторное нажатие — убрать)'
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
        {enableTables ? (
          <>
            <span className={styles.toolbarSep} aria-hidden />
            {btn(
              '⊞',
              editor.isActive('table'),
              () =>
                editor.chain().focus().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(),
              'Вставить таблицу'
            )}
            {btn('⊕', false, () => editor.chain().focus().addRowAfter().run(), 'Добавить строку')}
            {btn('⊖', false, () => editor.chain().focus().deleteRow().run(), 'Удалить строку')}
            {btn('✕', false, () => editor.chain().focus().deleteTable().run(), 'Удалить таблицу')}
          </>
        ) : null}
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
