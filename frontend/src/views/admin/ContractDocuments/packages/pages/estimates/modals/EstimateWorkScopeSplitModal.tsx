'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  ContractEstimateGroup,
  ContractEstimatePreset,
} from '@/shared/api/admin-contract-document-packages';
import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import { generateSplitBundleId } from '../../../platform/estimates/estimateSplitBundle';
import {
  type SiblingClaim,
  type WorkScopeCategoryRow,
  type WorkScopeLineRow,
  buildEstimateWorkScopeTreeAsync,
  buildSiblingLineClaimIndex,
  collectAllLineScopeIds,
  lineKeysFromCategoryNodeId,
  lineKeysFromRoomNodeId,
  lineKeysFromStageNodeId,
  linesInWorkScopeRoom,
  resolveSplitBundleId,
  selectionIntersectsSiblingClaims,
} from '../../../platform/estimates/estimateWorkScopeTree';
import { formatEstimatePresetTotalRub } from '../list/estimatesListUtils';

function isLineKeyClaimedBySibling(
  lineId: string,
  claimIndex: Map<string, SiblingClaim[]>,
  selectedKeys: string[]
): boolean {
  if (selectedKeys.includes(lineId)) return false;
  return (claimIndex.get(lineId)?.length ?? 0) > 0;
}

export function EstimateWorkScopeSplitModal({
  preset,
  groups,
  allPresets,
  saving,
  onClose,
  onSave,
}: {
  preset: ContractEstimatePreset;
  groups: ContractEstimateGroup[];
  allPresets: ContractEstimatePreset[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    splitBundleId: string;
    estimateWorkScopeKeys: string[];
  }) => void | Promise<void>;
}) {
  const [tree, setTree] = useState<WorkScopeCategoryRow[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [workScopeSplitHint, setWorkScopeSplitHint] = useState<
    'draft_snapshot_mismatch' | 'no_subcategory_buckets' | null
  >(null);
  const treeLoadGen = useRef(0);

  useEffect(() => {
    const gen = ++treeLoadGen.current;
    setTreeLoading(true);
    setWorkScopeSplitHint(null);
    void buildEstimateWorkScopeTreeAsync(preset, groups).then((r) => {
      if (treeLoadGen.current !== gen) return;
      setTree(r.tree);
      setWorkScopeSplitHint(r.hint);
      setTreeLoading(false);
    });
  }, [preset, groups]);

  const allLineIds = useMemo(() => collectAllLineScopeIds(tree), [tree]);
  const resolvedSplitBundleId = useMemo(
    () => resolveSplitBundleId(preset, allPresets),
    [preset, allPresets]
  );
  const claimIndex = useMemo(
    () => buildSiblingLineClaimIndex(allPresets, preset),
    [allPresets, preset]
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    const raw = preset.estimateWorkScopeKeys;
    if (Array.isArray(raw)) {
      setSelectedKeys(raw.filter((k) => allLineIds.includes(k)));
    } else if (claimIndex.size > 0) {
      setSelectedKeys(allLineIds.filter((id) => !claimIndex.has(id)));
    } else {
      setSelectedKeys([...allLineIds]);
    }
    setLocalError(null);
  }, [preset.id, preset.estimateWorkScopeKeys, allLineIds, claimIndex]);

  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const selectedTotal = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          if (selectedSet.has(line.id)) sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree, selectedSet]);

  const grandTotalInTree = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree]);

  /** Строка отнесена к другому расчёту связки (по сохранённым `estimateWorkScopeKeys`). */
  const isLineKeyAssignedToSiblingPreset = useMemo(() => {
    if (!resolvedSplitBundleId) return () => false;
    return (lineId: string): boolean => claimIndex.has(lineId);
  }, [resolvedSplitBundleId, claimIndex]);

  /** Сумма позиций, которые ни здесь не выбраны, ни в связанных расчётах не отнесены. */
  const unassignedAcrossBundleTotal = useMemo(() => {
    let sum = 0;
    for (const cat of tree) {
      for (const room of cat.rooms) {
        for (const line of linesInWorkScopeRoom(room)) {
          if (selectedSet.has(line.id)) continue;
          if (isLineKeyAssignedToSiblingPreset(line.id)) continue;
          sum += line.amount;
        }
      }
    }
    return sum;
  }, [tree, selectedSet, isLineKeyAssignedToSiblingPreset]);

  /** Строки с обычным чекбоксом (не заняты соседним расчётом связки). */
  const selectableLineIds = useMemo(
    () => allLineIds.filter((id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys)),
    [allLineIds, claimIndex, selectedKeys]
  );

  const allSelectableSelected =
    selectableLineIds.length > 0 && selectableLineIds.every((id) => selectedSet.has(id));

  const anySelectableSelected = selectableLineIds.some((id) => selectedSet.has(id));

  const selectAllAvailableLines = () => {
    setSelectedKeys([...selectableLineIds]);
  };

  const deselectAllAvailableLines = () => {
    setSelectedKeys([]);
  };

  const toggleLine = (lineId: string) => {
    if (isLineKeyClaimedBySibling(lineId, claimIndex, selectedKeys)) return;
    setSelectedKeys((prev) =>
      prev.includes(lineId) ? prev.filter((x) => x !== lineId) : [...prev, lineId]
    );
  };

  const toggleRoom = (roomId: string) => {
    const lineIds = lineKeysFromRoomNodeId(tree, roomId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const toggleStage = (stageId: string) => {
    const lineIds = lineKeysFromStageNodeId(tree, stageId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const toggleCategory = (categoryId: string) => {
    const lineIds = lineKeysFromCategoryNodeId(tree, categoryId);
    const selectable = lineIds.filter(
      (id) => !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) || selectedKeys.includes(id)
    );
    const allSel = selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSel) {
        selectable.forEach((id) => next.delete(id));
      } else {
        selectable.forEach((id) => next.add(id));
      }
      return [...next];
    });
  };

  const renderWorkScopeLineRow = (line: WorkScopeLineRow, indentClass: string) => {
    const claims = claimIndex.get(line.id);
    const claimed = isLineKeyClaimedBySibling(line.id, claimIndex, selectedKeys);
    const claimTitle = claims?.[0]?.title;
    return (
      <label key={line.id} className={`${cdBase.workScopeSplitRow} ${indentClass}`}>
        {claimed ? (
          <span
            className={cdBase.workScopeSplitClaimedCheckbox}
            role="img"
            aria-label={
              claimTitle
                ? `Позиция уже включена в расчёт «${claimTitle}»`
                : 'Позиция уже включена в другом расчёте связки'
            }
            title={claimTitle ? `Уже в расчёте «${claimTitle}»` : 'Уже в другом расчёте связки'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </span>
        ) : (
          <input
            type="checkbox"
            checked={selectedSet.has(line.id)}
            disabled={saving || treeLoading}
            onChange={() => toggleLine(line.id)}
          />
        )}
        <span style={{ flex: 1, minWidth: 0 }}>{line.label}</span>
        <span className={cdBase.workScopeSplitRowMeta}>
          {formatEstimatePresetTotalRub(line.amount)}
        </span>
      </label>
    );
  };

  const handleSave = async () => {
    const hit = selectionIntersectsSiblingClaims(selectedSet, claimIndex);
    if (hit) {
      setLocalError(
        `Позиция уже отнесена к расчёту «${hit.title}». Снимите пересечение по составу работ.`
      );
      return;
    }
    if (selectedKeys.length === 0) {
      setLocalError('Отметьте хотя бы одну позицию для этого экземпляра расчёта.');
      return;
    }
    const bundle =
      resolvedSplitBundleId ?? ((preset.splitBundleId ?? '').trim() || generateSplitBundleId());
    setLocalError(null);
    await onSave({ splitBundleId: bundle, estimateWorkScopeKeys: [...selectedKeys] });
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Разделение сметы по договорам"
      size="lg"
      showCloseButton
    >
      <form
        className={cdBase.workScopeSplitModalForm}
        data-modal-form
        data-modal-density="compact"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <p data-modal-form-hint>
          Расчёт: <strong>{preset.title}</strong>. Отметьте позиции, которые войдут в этот экземпляр
          для договора. Связанные копии расчёта (та же группа разделения) видят занятые позиции и не
          могут включить их повторно.
        </p>
        <p data-modal-form-hint>
          Сумма всех позиций: <strong>{formatEstimatePresetTotalRub(grandTotalInTree)}</strong>
          {' · '}
          Выбрано здесь: <strong>{formatEstimatePresetTotalRub(selectedTotal)}</strong>
          {' · '}
          Невыбранные позиции
          {resolvedSplitBundleId ? ' (по связке)' : ''}:{' '}
          <strong>{formatEstimatePresetTotalRub(unassignedAcrossBundleTotal)}</strong>
        </p>
        {localError ? <p data-modal-form-error>{localError}</p> : null}

        <div className={cdBase.workScopeSplitTreePanel}>
          {!treeLoading && tree.length > 0 ? (
            <div className={cdBase.workScopeSplitTreeToolbar}>
              <button
                type="button"
                className={cdBase.workScopeSplitBulkLink}
                disabled={
                  saving || treeLoading || selectableLineIds.length === 0 || allSelectableSelected
                }
                onClick={selectAllAvailableLines}
              >
                Отметить все
              </button>
              <span className={cdBase.workScopeSplitBulkSep} aria-hidden>
                ·
              </span>
              <button
                type="button"
                className={cdBase.workScopeSplitBulkLink}
                disabled={
                  saving || treeLoading || selectableLineIds.length === 0 || !anySelectableSelected
                }
                onClick={deselectAllAvailableLines}
              >
                Снять все
              </button>
            </div>
          ) : null}
          <div className={cdBase.workScopeSplitTreeScroll}>
            {treeLoading ? (
              <p data-modal-form-hint style={{ margin: 0 }}>
                Загрузка подкатегорий из каталога…
              </p>
            ) : tree.length === 0 ? (
              <p data-modal-form-hint style={{ margin: 0 }}>
                Нет строк сметы для разделения.
              </p>
            ) : (
              tree.map((cat) => (
                <div key={cat.id}>
                  <label
                    className={`${cdBase.workScopeSplitRow} ${cdBase.workScopeSplitIndent1} ${cdBase.workScopeSplitHeading}`}
                  >
                    <input
                      type="checkbox"
                      checked={(() => {
                        const ids = lineKeysFromCategoryNodeId(tree, cat.id);
                        const selectable = ids.filter(
                          (id) =>
                            !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) ||
                            selectedKeys.includes(id)
                        );
                        return (
                          selectable.length > 0 && selectable.every((id) => selectedSet.has(id))
                        );
                      })()}
                      disabled={saving || treeLoading}
                      onChange={() => toggleCategory(cat.id)}
                    />
                    <span className={cdBase.workScopeSplitHeadingLabel}>{cat.label}</span>
                    <span className={cdBase.workScopeSplitHeadingLeader} aria-hidden="true" />
                    <span className={cdBase.workScopeSplitRowMeta}>
                      {formatEstimatePresetTotalRub(cat.amount)}
                    </span>
                  </label>
                  {cat.rooms.map((room) => {
                    const showStages = room.stages.length > 1;
                    return (
                      <div key={room.id}>
                        <label
                          className={`${cdBase.workScopeSplitRow} ${cdBase.workScopeSplitIndent2} ${cdBase.workScopeSplitHeading}`}
                        >
                          <input
                            type="checkbox"
                            checked={(() => {
                              const lineIds = lineKeysFromRoomNodeId(tree, room.id);
                              const selectable = lineIds.filter(
                                (id) =>
                                  !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) ||
                                  selectedKeys.includes(id)
                              );
                              return (
                                selectable.length > 0 &&
                                selectable.every((id) => selectedSet.has(id))
                              );
                            })()}
                            disabled={saving || treeLoading}
                            onChange={() => toggleRoom(room.id)}
                          />
                          <span className={cdBase.workScopeSplitHeadingLabel}>{room.label}</span>
                          <span className={cdBase.workScopeSplitHeadingLeader} aria-hidden="true" />
                          <span className={cdBase.workScopeSplitRowMeta}>
                            {formatEstimatePresetTotalRub(room.amount)}
                          </span>
                        </label>
                        {showStages
                          ? room.stages.map((stage) => (
                              <div key={stage.id}>
                                <label
                                  className={`${cdBase.workScopeSplitRow} ${cdBase.workScopeSplitIndent3} ${cdBase.workScopeSplitHeading}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={(() => {
                                      const lineIds = lineKeysFromStageNodeId(tree, stage.id);
                                      const selectable = lineIds.filter(
                                        (id) =>
                                          !isLineKeyClaimedBySibling(
                                            id,
                                            claimIndex,
                                            selectedKeys
                                          ) || selectedKeys.includes(id)
                                      );
                                      return (
                                        selectable.length > 0 &&
                                        selectable.every((id) => selectedSet.has(id))
                                      );
                                    })()}
                                    disabled={saving || treeLoading}
                                    onChange={() => toggleStage(stage.id)}
                                  />
                                  <span className={cdBase.workScopeSplitHeadingLabel}>
                                    {stage.label}
                                  </span>
                                  <span
                                    className={cdBase.workScopeSplitHeadingLeader}
                                    aria-hidden="true"
                                  />
                                  <span className={cdBase.workScopeSplitRowMeta}>
                                    {formatEstimatePresetTotalRub(stage.amount)}
                                  </span>
                                </label>
                                {stage.lines.map((line) =>
                                  renderWorkScopeLineRow(line, cdBase.workScopeSplitIndent4)
                                )}
                              </div>
                            ))
                          : linesInWorkScopeRoom(room).map((line) =>
                              renderWorkScopeLineRow(line, cdBase.workScopeSplitIndent3)
                            )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>

        {!treeLoading && workScopeSplitHint === 'draft_snapshot_mismatch' ? (
          <p data-modal-form-hint>
            Подкатегории недоступны: в сохранённом снимке этой сметы нет скрытых id позиций каталога
            (так было до последнего обновления). Они появляются после следующего сохранения сметы из
            редактора расчёта. Если кнопки «Сохранить» не видно — внесите любое маленькое изменение
            (например пробел в названии помещения), затем сохраните.
          </p>
        ) : null}
        {!treeLoading && workScopeSplitHint === 'no_subcategory_buckets' ? (
          <p data-modal-form-hint>
            Подкатегории не разделены: в каталоге для этих видов работ одна секция позиций, либо
            ответ каталога не содержит нужных id позиций.
          </p>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Подкатегории (секции позиций в каталоге услуг) подставляются только в этой модалке, если
            совпадают черновик калькулятора и снимок сметы. В печатной смете по-прежнему только
            помещения и родительские категории.
          </span>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </button>
          <button
            type="submit"
            data-modal-btn="primary"
            disabled={saving || treeLoading || allLineIds.length === 0}
          >
            {saving ? 'Сохранение…' : 'Сохранить состав'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
