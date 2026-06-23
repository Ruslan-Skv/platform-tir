'use client';

import React, { useRef, useState } from 'react';

import { uploadBlogFeaturedImage } from '@/shared/api/admin-blog';
import { blockHasTextOrImages } from '@/shared/lib/blog-content';

import styles from './BlogPostBlocksEditor.module.css';
import { BlogPostEditor } from './BlogPostEditor';

export interface LocalBlockImage {
  url: string;
  alt: string;
}

export interface LocalBlock {
  clientId: string;
  bodyHtml: string;
  images: LocalBlockImage[];
}

interface BlogPostBlocksEditorProps {
  blocks: LocalBlock[];
  onChange: (blocks: LocalBlock[]) => void;
  onError: (message: string) => void;
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function BlogPostBlocksEditor({ blocks, onChange, onError }: BlogPostBlocksEditorProps) {
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const setFileRef = (key: string, el: HTMLInputElement | null) => {
    fileRefs.current[key] = el;
  };

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const addBlock = () => {
    onChange([...blocks, { clientId: newId(), bodyHtml: '<p></p>', images: [] }]);
  };

  const removeBlock = (clientId: string) => {
    onChange(blocks.filter((b) => b.clientId !== clientId));
  };

  const moveBlock = (clientId: string, dir: -1 | 1) => {
    const i = blocks.findIndex((b) => b.clientId === clientId);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const updateBody = (clientId: string, html: string) => {
    onChange(blocks.map((b) => (b.clientId === clientId ? { ...b, bodyHtml: html } : b)));
  };

  const addImageRow = (clientId: string) => {
    onChange(
      blocks.map((b) =>
        b.clientId === clientId ? { ...b, images: [...b.images, { url: '', alt: '' }] } : b
      )
    );
  };

  const updateImage = (clientId: string, imageIndex: number, patch: Partial<LocalBlockImage>) => {
    onChange(
      blocks.map((b) => {
        if (b.clientId !== clientId) return b;
        const images = b.images.map((img, idx) =>
          idx === imageIndex ? { ...img, ...patch } : img
        );
        return { ...b, images };
      })
    );
  };

  const removeImage = (clientId: string, imageIndex: number) => {
    onChange(
      blocks.map((b) => {
        if (b.clientId !== clientId) return b;
        return { ...b, images: b.images.filter((_, idx) => idx !== imageIndex) };
      })
    );
  };

  const handleFile = async (clientId: string, imageIndex: number, file: File) => {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
      onError('Допустимы только JPG, PNG, WebP и GIF');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      onError('Размер файла не больше 10 МБ');
      return;
    }
    const key = `${clientId}-${imageIndex}`;
    setUploadingKey(key);
    try {
      const { imageUrl } = await uploadBlogFeaturedImage(file);
      updateImage(clientId, imageIndex, { url: imageUrl });
    } catch {
      onError('Ошибка загрузки файла');
    } finally {
      setUploadingKey(null);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <button
          data-admin-mutation
          type="button"
          className={styles.addBlockButton}
          onClick={addBlock}
        >
          + Добавить блок
        </button>
      </div>

      {blocks.length === 0 ? (
        <p className={styles.emptyHint}>
          Нет блоков — нажмите «Добавить блок» или отключите режим блоков.
        </p>
      ) : null}

      {blocks.map((block, blockIndex) => {
        const valid = blockHasTextOrImages(block.bodyHtml, block.images);
        return (
          <section
            key={block.clientId}
            className={`${styles.blockCard} ${!valid ? styles.blockCardInvalid : ''}`}
          >
            <div className={styles.blockHeader}>
              <span className={styles.blockTitle}>Блок {blockIndex + 1}</span>
              <div className={styles.blockActions}>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Выше"
                  disabled={blockIndex === 0}
                  onClick={() => moveBlock(block.clientId, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  title="Ниже"
                  disabled={blockIndex === blocks.length - 1}
                  onClick={() => moveBlock(block.clientId, 1)}
                >
                  ↓
                </button>
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.removeBlockButton}
                  onClick={() => removeBlock(block.clientId)}
                >
                  Удалить блок
                </button>
              </div>
            </div>

            <label className={styles.label}>
              Текст блока
              <BlogPostEditor
                key={block.clientId}
                value={block.bodyHtml}
                onChange={(html) => updateBody(block.clientId, html)}
                placeholder="Текст раздела…"
              />
            </label>

            <div className={styles.imagesSection}>
              <div className={styles.imagesHeader}>
                <span>Фотоматериалы</span>
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.addImageButton}
                  onClick={() => addImageRow(block.clientId)}
                >
                  + Добавить фото
                </button>
              </div>

              {block.images.map((img, imageIndex) => {
                const uploadKey = `${block.clientId}-${imageIndex}`;
                const busy = uploadingKey === uploadKey;
                return (
                  <div key={uploadKey} className={styles.imageRow}>
                    <input
                      type="text"
                      className={styles.input}
                      value={img.url}
                      onChange={(e) =>
                        updateImage(block.clientId, imageIndex, { url: e.target.value })
                      }
                      placeholder="https://… или загрузите файл"
                    />
                    <input
                      type="text"
                      className={styles.inputAlt}
                      value={img.alt}
                      onChange={(e) =>
                        updateImage(block.clientId, imageIndex, { alt: e.target.value })
                      }
                      placeholder="Подпись (alt)"
                    />
                    <input
                      ref={(el) => setFileRef(uploadKey, el)}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif"
                      className={styles.hiddenFile}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f) void handleFile(block.clientId, imageIndex, f);
                      }}
                    />
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      disabled={busy}
                      onClick={() => fileRefs.current[uploadKey]?.click()}
                    >
                      {busy ? '…' : 'Файл'}
                    </button>
                    <button
                      type="button"
                      className={styles.removeImgBtn}
                      onClick={() => removeImage(block.clientId, imageIndex)}
                      title="Убрать"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
