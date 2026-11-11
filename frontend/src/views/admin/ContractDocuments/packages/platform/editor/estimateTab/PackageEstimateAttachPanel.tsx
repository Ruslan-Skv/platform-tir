'use client';

import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { EditIcon } from '@/shared/ui/icons/EditIcon';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { getEffectiveEstimateAdditionalMarkupPercent } from '../../estimates/applyEstimatePresetIds';
import attachStyles from './PackageEstimateAttach.module.css';
import type { PackageEstimateTabProps } from './PackageEstimateTab';
import { ESTIMATE_HINT, ESTIMATE_TAB_HINT } from './packageEstimateTabStyles';

/** «Открепить расчёт»: крестик в том же stroke-стиле, что иконки действий списка расчётов. */
function DetachEstimateIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export type PackageEstimateAttachPanelProps = Pick<
  PackageEstimateTabProps,
  | 'form'
  | 'signedDocsLocked'
  | 'isProductDirectionPackage'
  | 'linkedCrmCustomerId'
  | 'estimateCreate'
  | 'contractEstimateObjectKey'
  | 'estimateAttachGroupKey'
  | 'setEstimateAttachGroupKey'
  | 'estimatePresetToAttach'
  | 'setEstimatePresetToAttach'
  | 'attachEstimatePickMeta'
  | 'attachableForSelectedGroup'
  | 'attachableEstimatePresets'
  | 'attachBlockedByCrmMismatch'
  | 'attachBlockedByDirectionMismatch'
  | 'estimatePresets'
  | 'estimateGroups'
  | 'estimateUsageById'
  | 'lockedEstimatePresetIds'
  | 'draggingEstimatePresetId'
  | 'setDraggingEstimatePresetId'
  | 'estimateMarkupSaving'
  | 'onEstimateObjectChange'
  | 'onAttachPreset'
  | 'onMovePreset'
  | 'onRemovePreset'
  | 'onEstimatePresetMarkupChange'
>;

export function PackageEstimateAttachPanel({
  form,
  signedDocsLocked,
  isProductDirectionPackage,
  linkedCrmCustomerId,
  estimateCreate,
  contractEstimateObjectKey,
  estimateAttachGroupKey,
  setEstimateAttachGroupKey,
  estimatePresetToAttach,
  setEstimatePresetToAttach,
  attachEstimatePickMeta,
  attachableForSelectedGroup,
  attachableEstimatePresets,
  attachBlockedByCrmMismatch,
  attachBlockedByDirectionMismatch,
  estimatePresets,
  estimateGroups,
  estimateUsageById,
  lockedEstimatePresetIds,
  draggingEstimatePresetId,
  setDraggingEstimatePresetId,
  estimateMarkupSaving,
  onEstimateObjectChange,
  onAttachPreset,
  onMovePreset,
  onRemovePreset,
  onEstimatePresetMarkupChange,
}: PackageEstimateAttachPanelProps) {
  return (
    <>
      <div
        className={`${attachStyles.estimatePickAndAttachedRow} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateAttachWindowsTypography}`}
      >
        <div className={attachStyles.estimatePickColumn}>
          <div className={attachStyles.estimateSelectsRow}>
            <div className={`${cdEstimateTab.field} ${attachStyles.estimateAttachWindowsField}`}>
              <label htmlFor="estimate_group_select">Объект</label>
              <select
                id="estimate_group_select"
                value={
                  (form.estimate.selectedPresetIds?.length ?? 0) > 0
                    ? contractEstimateObjectKey
                    : estimateAttachGroupKey
                }
                disabled={signedDocsLocked || (form.estimate.selectedPresetIds?.length ?? 0) > 0}
                onChange={(e) => {
                  const v = e.target.value;
                  setEstimateAttachGroupKey(v);
                  setEstimatePresetToAttach('');
                  if (!signedDocsLocked && (form.estimate.selectedPresetIds?.length ?? 0) === 0) {
                    onEstimateObjectChange(v);
                  }
                }}
              >
                <option value="">— объект —</option>
                {attachEstimatePickMeta.hasUngrouped ? (
                  <option value="__ungrouped__">Вне объекта</option>
                ) : null}
                {attachEstimatePickMeta.groupsOrdered.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={`${cdEstimateTab.field} ${attachStyles.estimateAttachWindowsField}`}>
              <label htmlFor="estimate_select">Расчёт</label>
              <select
                id="estimate_select"
                value={estimatePresetToAttach}
                disabled={
                  signedDocsLocked ||
                  !((form.estimate.selectedPresetIds?.length ?? 0) > 0
                    ? contractEstimateObjectKey
                    : estimateAttachGroupKey || contractEstimateObjectKey)
                }
                onChange={(e) => setEstimatePresetToAttach(e.target.value)}
              >
                <option value="">
                  {(form.estimate.selectedPresetIds?.length ?? 0) > 0
                    ? '— расчёт —'
                    : estimateAttachGroupKey || contractEstimateObjectKey
                      ? '— расчёт —'
                      : '— сначала выберите объект —'}
                </option>
                {attachableForSelectedGroup.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.title} · {preset.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={attachStyles.estimateAttachBlock}>
            <div className={attachStyles.estimateAttachActionsRow}>
              <button
                type="button"
                className={`${cdWorkspace.primaryBtn} ${attachStyles.estimateAttachPrimaryBtn}`}
                disabled={signedDocsLocked || !estimatePresetToAttach}
                title={
                  signedDocsLocked
                    ? 'Договор подписан: вкладка только для просмотра.'
                    : !estimatePresetToAttach
                      ? 'Сначала выберите объект и свободный расчёт в списках слева — затем нажмите «Прикрепить».'
                      : `Прикрепить выбранный расчёт к ${
                          isProductDirectionPackage ? 'счёту-заказу' : 'смете'
                        } этого договора: его позиции попадут в таблицу ниже, а объект зафиксируется. Открепить можно крестиком — сам расчёт останется в разделе «Расчёты».`
                }
                onClick={() => {
                  onAttachPreset(estimatePresetToAttach);
                  setEstimatePresetToAttach('');
                }}
              >
                Прикрепить
              </button>
              <button
                type="button"
                className={cdWorkspace.secondaryBtn}
                disabled={Boolean(estimateCreate.createBlockedReason)}
                title={
                  estimateCreate.createBlockedReason ??
                  'Создать новый расчёт, не уходя из договора: откроется окно, готовый расчёт сразу прикрепится к этому договору.'
                }
                onClick={estimateCreate.open}
              >
                + Создать расчёт
              </button>
            </div>
            {attachableEstimatePresets.length === 0 ? (
              <p className={ESTIMATE_TAB_HINT}>
                {isProductDirectionPackage && !linkedCrmCustomerId?.trim()
                  ? 'Выберите заказчика на вкладке «Данные».'
                  : attachBlockedByDirectionMismatch
                    ? 'Есть свободные расчёты этого объекта, но другого направления — они скрыты. Направление расчёта должно совпадать с направлением договора: создайте нужный расчёт кнопкой «+ Создать расчёт» или в разделе «Расчёты».'
                    : attachBlockedByCrmMismatch
                      ? 'Есть расчёты с этим адресом, но у другой карточки заказчика в CRM. Откройте расчёт и выберите того же заказчика, что в договоре (через поиск в базе), либо в договоре выберите ту же карточку, что в расчёте.'
                      : isProductDirectionPackage
                        ? 'Нет свободных расчётов этого заказчика для прикрепления (проверьте раздел «Расчёты» и статус «В работе») — или создайте новый кнопкой «+ Создать расчёт».'
                        : 'Нет свободных расчётов для прикрепления — можно создать новый кнопкой «+ Создать расчёт».'}
              </p>
            ) : (
              <p className={ESTIMATE_HINT} style={{ marginTop: 0 }}>
                Сначала объект, затем расчёт → «Прикрепить». Нельзя смешивать расчёты разных
                объектов. Справа — порядок{' '}
                {isProductDirectionPackage ? 'в счёте-заказе' : 'в смете'} (перетаскивание) и
                наценка каждого расчёта, % — то же поле, что в разделе «Расчёты».
              </p>
            )}
          </div>
        </div>
        <aside className={attachStyles.estimateAttachedColumn}>
          <div className={attachStyles.estimateAttachedColumnTitle}>Прикреплённые</div>
          {(form.estimate.selectedPresetIds?.length ?? 0) > 0 ? (
            <div className={attachStyles.estimateAttachedPresetList}>
              {(form.estimate.selectedPresetIds ?? []).map((presetId) => {
                const preset = estimatePresets.find((x) => x.id === presetId);
                const usageCount = estimateUsageById.get(presetId)?.length ?? 0;
                const markupLocked = lockedEstimatePresetIds.has(presetId);
                const markupDisabled = signedDocsLocked || estimateMarkupSaving || markupLocked;
                const effectiveMarkup = preset
                  ? getEffectiveEstimateAdditionalMarkupPercent(preset, estimateGroups)
                  : 0;
                const groupMarkup =
                  preset?.groupId && typeof preset.additionalMarkupPercent !== 'number'
                    ? (estimateGroups.find((g) => g.id === preset.groupId)
                        ?.additionalMarkupPercent ?? 0)
                    : 0;
                /** Правка расчёта прямо здесь (модалка вкладки); null — можно. */
                const editBlockReason = preset ? estimateCreate.editBlockReason(preset) : null;
                const editTitle = editBlockReason ?? 'Редактировать расчёт здесь';
                return (
                  <div
                    key={presetId}
                    draggable={!signedDocsLocked}
                    onDragStart={() => {
                      if (!signedDocsLocked) setDraggingEstimatePresetId(presetId);
                    }}
                    onDragEnd={() => setDraggingEstimatePresetId(null)}
                    onDragOver={(e) => {
                      if (!signedDocsLocked) e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (signedDocsLocked) return;
                      if (draggingEstimatePresetId) {
                        onMovePreset(draggingEstimatePresetId, presetId);
                      }
                      setDraggingEstimatePresetId(null);
                    }}
                    className={attachStyles.estimateAttachedPresetRow}
                    style={{
                      opacity: draggingEstimatePresetId === presetId ? 0.6 : 1,
                    }}
                  >
                    <div className={attachStyles.estimateAttachedPresetMain}>
                      <strong>{preset?.title ?? presetId}</strong>
                      <span className={attachStyles.estimateAttachedPresetMeta}>
                        {' '}
                        · {preset?.categoryName ?? '—'}
                        {usageCount > 0 ? ` · ещё в пакетах: ${usageCount}` : null}
                      </span>
                      {preset ? (
                        <span className={attachStyles.estimateAttachedMarkup}>
                          <label
                            title={
                              markupLocked
                                ? 'Нельзя менять наценку: расчёт закрыт для изменений (прикреплён к пакету со статусом «Договор подписан» или к подписанному Д/с).'
                                : `Наценка расчёта, % (сейчас ${effectiveMarkup}%). Пусто — для расчёта в объекте действует наценка объекта${
                                    groupMarkup > 0 ? ` (${groupMarkup}%)` : ''
                                  }; иначе +% к цене каждой позиции сметы.`
                            }
                          >
                            <span className={attachStyles.estimateAttachedMarkupLabel}>
                              Наценка, %
                            </span>
                            <input
                              key={`${preset.id}:markup:${preset.additionalMarkupPercent ?? 'none'}`}
                              type="number"
                              min={0}
                              max={999}
                              step={0.1}
                              className={attachStyles.estimateAttachedMarkupInput}
                              defaultValue={
                                typeof preset.additionalMarkupPercent === 'number'
                                  ? String(preset.additionalMarkupPercent)
                                  : '0'
                              }
                              disabled={markupDisabled}
                              onFocus={(e) => {
                                e.currentTarget.dataset.markupAtFocus = e.currentTarget.value;
                              }}
                              onBlur={(e) => {
                                if (e.currentTarget.dataset.markupAtFocus === e.currentTarget.value)
                                  return;
                                onEstimatePresetMarkupChange(preset.id, e.target.value);
                              }}
                            />
                          </label>
                          {groupMarkup > 0 ? (
                            <em className={attachStyles.estimateAttachedMarkupInherited}>
                              объекта {groupMarkup}%
                            </em>
                          ) : null}
                        </span>
                      ) : null}
                    </div>
                    <AdminTableIconButton
                      className={attachStyles.estimateAttachedRemoveBtn}
                      aria-label={`Редактировать расчёт «${preset?.title ?? presetId}»`}
                      title={editTitle}
                      disabled={signedDocsLocked || Boolean(editBlockReason)}
                      onClick={() => {
                        if (!preset) return;
                        estimateCreate.openEdit(preset);
                      }}
                    >
                      <EditIcon />
                    </AdminTableIconButton>
                    <AdminTableIconButton
                      className={attachStyles.estimateAttachedRemoveBtn}
                      aria-label="Открепить расчёт"
                      title="Открепить расчёт (сам расчёт останется в разделе «Расчёты»)"
                      disabled={signedDocsLocked}
                      onClick={() => onRemovePreset(presetId)}
                    >
                      <DetachEstimateIcon />
                    </AdminTableIconButton>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className={attachStyles.estimateAttachedEmpty}>Пока нет</p>
          )}
        </aside>
      </div>
      {form.estimate.selectedPresetIds?.length &&
      !(form.estimate.selectedPresetIds ?? []).every(
        (id) => (estimateUsageById.get(id)?.length ?? 0) === 0
      ) ? (
        <p
          className={`${ESTIMATE_TAB_HINT} ${attachStyles.estimateTabHintFullWidth} ${attachStyles.estimateAttachWindowsTypography}`}
        >
          Часть расчётов уже прикреплена в других пакетах:{' '}
          {[
            ...new Set(
              (form.estimate.selectedPresetIds ?? [])
                .flatMap((id) => estimateUsageById.get(id) ?? [])
                .map((u) => `№ ${u.contractNumber} от ${u.contractDate}`)
            ),
          ].join('; ')}
        </p>
      ) : null}
    </>
  );
}
