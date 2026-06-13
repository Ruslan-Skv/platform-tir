'use client';

import styles from './FooterSectionPage.module.css';
import { EMPTY_NEW_LINK, UPLOADS_BASE } from './footer-section-page.constants';
import type { FooterSectionPageModel } from './hooks/useFooterSectionPage';

type FooterSectionPageViewProps = {
  model: FooterSectionPageModel;
};

export function FooterSectionPageView({ model }: FooterSectionPageViewProps) {
  const {
    data,
    setData,
    loading,
    saving,
    message,
    editingSection,
    setEditingSection,
    editingLink,
    setEditingLink,
    newSectionTitle,
    setNewSectionTitle,
    newLink,
    setNewLink,
    addingLinkToSection,
    setAddingLinkToSection,
    uploadingIcon,
    fileInputRef,
    handleSaveBlock,
    handleUploadVkIcon,
    handleBlockChange,
    handleAddSection,
    handleUpdateSection,
    handleDeleteSection,
    handleAddLink,
    handleUpdateLink,
    handleDeleteLink,
  } = model;

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Футер</h1>
        <p className={styles.subtitle}>
          Управление контактами, секциями и ссылками в футере сайта.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Контакты и режим работы</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Телефон</label>
            <input
              type="text"
              value={data.block.phone}
              onChange={(e) => handleBlockChange('phone', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input
              type="text"
              value={data.block.email}
              onChange={(e) => handleBlockChange('email', e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (пн-пт)</label>
            <input
              type="text"
              value={data.block.workingHours.weekdays}
              onChange={(e) => handleBlockChange('workingHours.weekdays', e.target.value)}
              className={styles.input}
              placeholder="пн-пт: 11-19"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (сб)</label>
            <input
              type="text"
              value={data.block.workingHours.saturday}
              onChange={(e) => handleBlockChange('workingHours.saturday', e.target.value)}
              className={styles.input}
              placeholder="сб: 12-16"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Режим работы (вс)</label>
            <input
              type="text"
              value={data.block.workingHours.sunday}
              onChange={(e) => handleBlockChange('workingHours.sunday', e.target.value)}
              className={styles.input}
              placeholder="вс: выходной"
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Нижняя часть и соцсети</h2>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label>Название компании (в копирайте)</label>
            <input
              type="text"
              value={data.block.copyrightCompanyName}
              onChange={(e) => handleBlockChange('copyrightCompanyName', e.target.value)}
              className={styles.input}
              placeholder="Территория интерьерных решений"
            />
          </div>
          <div className={styles.formGroup}>
            <label>Разработчик сайта</label>
            <input
              type="text"
              value={data.block.developer}
              onChange={(e) => handleBlockChange('developer', e.target.value)}
              className={styles.input}
              placeholder="ИП Сквиря Р.В."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Ссылка ВКонтакте</label>
            <input
              type="text"
              value={data.block.socialLinks.vk.href}
              onChange={(e) => handleBlockChange('socialLinks.vk.href', e.target.value)}
              className={styles.input}
              placeholder="https://vk.com/..."
            />
          </div>
          <div className={styles.formGroup}>
            <label>Иконка ВКонтакте</label>
            <div className={styles.iconUploadRow}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                onChange={handleUploadVkIcon}
                className={styles.hiddenFileInput}
                disabled={uploadingIcon}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingIcon}
              >
                {uploadingIcon ? 'Загрузка...' : 'Загрузить иконку'}
              </button>
              {data.block.socialLinks.vk.icon && (
                <div className={styles.iconPreview}>
                  <img
                    src={
                      data.block.socialLinks.vk.icon.startsWith('http')
                        ? data.block.socialLinks.vk.icon
                        : data.block.socialLinks.vk.icon.startsWith('/uploads/')
                          ? `${UPLOADS_BASE}${data.block.socialLinks.vk.icon}`
                          : data.block.socialLinks.vk.icon
                    }
                    alt="Иконка ВК"
                    className={styles.iconPreviewImg}
                  />
                </div>
              )}
            </div>
            <input
              type="text"
              value={data.block.socialLinks.vk.icon}
              onChange={(e) => handleBlockChange('socialLinks.vk.icon', e.target.value)}
              className={`${styles.input} ${styles.iconUrlInput}`}
              placeholder="/images/icons-vk.png или URL"
            />
          </div>
        </div>
        <div className={styles.saveBlock}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSaveBlock}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить контакты'}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Секции с ссылками</h2>
        {data.sections.map((section) => (
          <div key={section.id} className={styles.sectionCard}>
            <div className={styles.sectionCardHeader}>
              {editingSection === section.id ? (
                <input
                  type="text"
                  value={section.title}
                  onChange={(e) =>
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            sections: prev.sections.map((s) =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ),
                          }
                        : prev
                    )
                  }
                  className={`${styles.input} ${styles.sectionTitleInput}`}
                  autoFocus
                />
              ) : (
                <h3 className={styles.sectionCardTitle}>{section.title}</h3>
              )}
              <div className={styles.sectionCardActions}>
                {editingSection === section.id ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                      onClick={() => handleUpdateSection(section.id, section.title)}
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => setEditingSection(null)}
                    >
                      Отмена
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => setEditingSection(section.id)}
                    >
                      Изменить
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                      onClick={() => handleDeleteSection(section.id)}
                    >
                      Удалить
                    </button>
                  </>
                )}
              </div>
            </div>
            <ul className={styles.linksList}>
              {section.links.map((link) => (
                <li key={link.id} className={styles.linkRow}>
                  {editingLink === link.id ? (
                    <>
                      <input
                        type="text"
                        value={link.name}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          links: s.links.map((l) =>
                                            l.id === link.id ? { ...l, name: e.target.value } : l
                                          ),
                                        }
                                      : s
                                  ),
                                }
                              : prev
                          )
                        }
                        className={`${styles.input} ${styles.linkEditName}`}
                        placeholder="Название"
                      />
                      <input
                        type="text"
                        value={link.href}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  sections: prev.sections.map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          links: s.links.map((l) =>
                                            l.id === link.id ? { ...l, href: e.target.value } : l
                                          ),
                                        }
                                      : s
                                  ),
                                }
                              : prev
                          )
                        }
                        className={`${styles.input} ${styles.linkEditHref}`}
                        placeholder="/path или https://..."
                      />
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                        onClick={() => handleUpdateLink(section.id, link.id, link.name, link.href)}
                      >
                        OK
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() => setEditingLink(null)}
                      >
                        Отмена
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={styles.linkName}>{link.name}</span>
                      <span className={styles.linkHref}>{link.href}</span>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                        onClick={() => setEditingLink(link.id)}
                      >
                        Изменить
                      </button>
                      <button
                        type="button"
                        className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                        onClick={() => handleDeleteLink(section.id, link.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {addingLinkToSection === section.id ? (
              <div className={styles.addLinkForm}>
                <input
                  type="text"
                  value={newLink.name}
                  onChange={(e) => setNewLink((p) => ({ ...p, name: e.target.value }))}
                  className={styles.input}
                  placeholder="Название ссылки"
                />
                <input
                  type="text"
                  value={newLink.href}
                  onChange={(e) => setNewLink((p) => ({ ...p, href: e.target.value }))}
                  className={styles.input}
                  placeholder="/path или https://..."
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSuccess} ${styles.btnSmall}`}
                  onClick={() => handleAddLink(section.id)}
                >
                  Добавить
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                  onClick={() => {
                    setAddingLinkToSection(null);
                    setNewLink(EMPTY_NEW_LINK);
                  }}
                >
                  Отмена
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`}
                onClick={() => setAddingLinkToSection(section.id)}
              >
                + Добавить ссылку
              </button>
            )}
          </div>
        ))}
        <div className={styles.addSectionForm}>
          <input
            type="text"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
            className={`${styles.input} ${styles.newSectionInput}`}
            placeholder="Название новой секции"
          />
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
            onClick={handleAddSection}
          >
            Добавить секцию
          </button>
        </div>
      </section>
    </div>
  );
}
