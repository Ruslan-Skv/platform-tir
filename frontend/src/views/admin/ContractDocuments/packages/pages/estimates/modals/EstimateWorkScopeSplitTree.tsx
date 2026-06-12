import cdBase from '../../../../styles/base.module.css';
import type { SiblingClaim } from '../../../platform/estimates/estimateWorkScopeTree';
import {
  type WorkScopeCategoryRow,
  type WorkScopeLineRow,
  lineKeysFromCategoryNodeId,
  lineKeysFromRoomNodeId,
  lineKeysFromStageNodeId,
  linesInWorkScopeRoom,
} from '../../../platform/estimates/estimateWorkScopeTree';
import { formatEstimatePresetTotalRub } from '../list/estimatesListUtils';
import { isLineKeyClaimedBySibling } from './estimateWorkScopeSplitUtils';

type EstimateWorkScopeSplitTreeProps = {
  tree: WorkScopeCategoryRow[];
  treeLoading: boolean;
  saving: boolean;
  selectedKeys: string[];
  selectedSet: Set<string>;
  claimIndex: Map<string, SiblingClaim[]>;
  selectableLineIds: string[];
  allSelectableSelected: boolean;
  anySelectableSelected: boolean;
  selectAllAvailableLines: () => void;
  deselectAllAvailableLines: () => void;
  toggleLine: (lineId: string) => void;
  toggleRoom: (roomId: string) => void;
  toggleStage: (stageId: string) => void;
  toggleCategory: (categoryId: string) => void;
};

function renderWorkScopeLineRow(
  line: WorkScopeLineRow,
  indentClass: string,
  {
    claimIndex,
    selectedKeys,
    selectedSet,
    saving,
    treeLoading,
    toggleLine,
  }: Pick<
    EstimateWorkScopeSplitTreeProps,
    'claimIndex' | 'selectedKeys' | 'selectedSet' | 'saving' | 'treeLoading' | 'toggleLine'
  >
) {
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
}

export function EstimateWorkScopeSplitTree(props: EstimateWorkScopeSplitTreeProps) {
  const {
    tree,
    treeLoading,
    saving,
    selectedKeys,
    selectedSet,
    claimIndex,
    selectableLineIds,
    allSelectableSelected,
    anySelectableSelected,
    selectAllAvailableLines,
    deselectAllAvailableLines,
    toggleLine,
    toggleRoom,
    toggleStage,
    toggleCategory,
  } = props;

  const lineRowProps = {
    claimIndex,
    selectedKeys,
    selectedSet,
    saving,
    treeLoading,
    toggleLine,
  };

  return (
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
                    return selectable.length > 0 && selectable.every((id) => selectedSet.has(id));
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
                            selectable.length > 0 && selectable.every((id) => selectedSet.has(id))
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
                                      !isLineKeyClaimedBySibling(id, claimIndex, selectedKeys) ||
                                      selectedKeys.includes(id)
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
                              renderWorkScopeLineRow(
                                line,
                                cdBase.workScopeSplitIndent4,
                                lineRowProps
                              )
                            )}
                          </div>
                        ))
                      : linesInWorkScopeRoom(room).map((line) =>
                          renderWorkScopeLineRow(line, cdBase.workScopeSplitIndent3, lineRowProps)
                        )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
