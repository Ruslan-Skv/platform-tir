'use client';

import { Modal } from '@/shared/ui/Modal';

import cdBase from '../../../../styles/base.module.css';
import cdHub from '../../../../styles/contracts-list-hub.module.css';
import { formatEstimatePresetTotalRub } from '../list/estimatesListUtils';
import { EstimateWorkScopeSplitTree } from './EstimateWorkScopeSplitTree';
import type { EstimateWorkScopeSplitModalModel } from './useEstimateWorkScopeSplitModal';

export function EstimateWorkScopeSplitModalView(
  props: EstimateWorkScopeSplitModalModel & { isOpen: boolean }
) {
  const {
    isOpen,
    preset,
    saving,
    onClose,
    tree,
    treeLoading,
    workScopeSplitHint,
    splitGroupMode,
    setSplitGroupMode,
    selectedKeys,
    selectedSet,
    selectionDirty,
    claimIndex,
    localError,
    resolvedSplitBundleId,
    grandTotalInTree,
    selectedTotal,
    unassignedAcrossBundleTotal,
    allLineIds,
    selectableLineIds,
    allSelectableSelected,
    anySelectableSelected,
    selectAllAvailableLines,
    deselectAllAvailableLines,
    toggleLine,
    toggleRoom,
    toggleStage,
    toggleCategory,
    handleSave,
  } = props;

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Разделение сметы по договорам"
      size="lg"
      showCloseButton
      alignTop
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

        <div
          className={cdHub.contractsListChipRow}
          role="group"
          aria-label="Вариант группировки позиций"
        >
          <span className={cdHub.contractsListChipRowLabel}>Группировка</span>
          <button
            type="button"
            className={`${cdHub.contractsListChip}${splitGroupMode === 'subcategory' ? ` ${cdHub.contractsListChipActive}` : ''}`}
            aria-pressed={splitGroupMode === 'subcategory'}
            disabled={saving || treeLoading}
            onClick={() => setSplitGroupMode('subcategory')}
            title="Категория → помещение → подкатегория каталога → вид работ"
          >
            По подкатегориям
          </button>
          <button
            type="button"
            className={`${cdHub.contractsListChip}${splitGroupMode === 'work_group' ? ` ${cdHub.contractsListChipActive}` : ''}`}
            aria-pressed={splitGroupMode === 'work_group'}
            disabled={saving || treeLoading}
            onClick={() => setSplitGroupMode('work_group')}
            title="Категория → помещение → группа работ (демонтаж / черновые / чистовые) → вид работ"
          >
            По группам работ
          </button>
        </div>

        <EstimateWorkScopeSplitTree
          tree={tree}
          treeLoading={treeLoading}
          saving={saving}
          groupMode={splitGroupMode}
          selectedKeys={selectedKeys}
          selectedSet={selectedSet}
          claimIndex={claimIndex}
          selectableLineIds={selectableLineIds}
          allSelectableSelected={allSelectableSelected}
          anySelectableSelected={anySelectableSelected}
          selectAllAvailableLines={selectAllAvailableLines}
          deselectAllAvailableLines={deselectAllAvailableLines}
          toggleLine={toggleLine}
          toggleRoom={toggleRoom}
          toggleStage={toggleStage}
          toggleCategory={toggleCategory}
        />

        {workScopeSplitHint === 'draft_snapshot_mismatch' ? (
          <p data-modal-form-hint>
            Подкатегории недоступны: в сохранённом снимке этой сметы нет скрытых id позиций каталога
            (так было до последнего обновления). Они появляются после следующего сохранения сметы из
            редактора расчёта. Если кнопки «Сохранить» не видно — внесите любое маленькое изменение
            (например пробел в названии помещения), затем сохраните.
          </p>
        ) : null}
        {workScopeSplitHint === 'no_subcategory_buckets' ? (
          <p data-modal-form-hint>
            Подкатегории не разделены: в каталоге для этих видов работ одна секция позиций, либо
            ответ каталога не содержит нужных id позиций.
          </p>
        ) : null}
        {workScopeSplitHint === 'no_work_group_marks' ? (
          <p data-modal-form-hint>
            Группы работ не размечены: у позиций этой сметы в каталоге услуг не задана группа
            (демонтажные / черновые / чистовые). Разметьте её в разделе «Виды работ» (колонка
            «Группа работ»), затем снова откройте это окно.
          </p>
        ) : null}

        <div data-modal-footer-info data-modal-tone="info" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            {splitGroupMode === 'work_group'
              ? 'Группы работ (демонтаж / черновые / чистовые) берутся из справочника «Виды работ». В этом режиме отдельные виды работ не показываются — отметка ставится сразу на группу, помещение или категорию. Отмеченный состав не зависит от варианта группировки.'
              : 'Подкатегории (секции позиций в каталоге услуг) подставляются только в этой модалке, если совпадают черновик калькулятора и снимок сметы. В печатной смете по-прежнему только помещения и родительские категории.'}
          </span>
        </div>

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" disabled={saving} onClick={onClose}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="submit"
            data-modal-btn="primary"
            disabled={saving || treeLoading || allLineIds.length === 0 || !selectionDirty}
            title={selectionDirty ? undefined : 'Сначала измените отметки позиций'}
          >
            {saving ? 'Сохранение…' : 'Сохранить состав'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
