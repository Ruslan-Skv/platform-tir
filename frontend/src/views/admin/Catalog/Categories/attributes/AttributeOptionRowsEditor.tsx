'use client';

export type AttributeOptionRowsEditorMod = {
  optionRowsEditor: string;
  optionRowsHeader: string;
  optionRowsTitle: string;
  addOptionButton: string;
  optionRowsHint: string;
  optionRowsEmpty: string;
  optionRowsList: string;
  optionRow: string;
  input: string;
  optionRowActions: string;
  optionRowMoveBtn: string;
  optionRowRemoveBtn: string;
};

type AttributeOptionRowsEditorProps = {
  rows: string[];
  onChange: (next: string[]) => void;
  mod: AttributeOptionRowsEditorMod;
};

export function AttributeOptionRowsEditor({ rows, onChange, mod }: AttributeOptionRowsEditorProps) {
  const moveRow = (index: number, direction: -1 | 1) => {
    const j = index + direction;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  };

  return (
    <div className={mod.optionRowsEditor}>
      <div className={mod.optionRowsHeader}>
        <span className={mod.optionRowsTitle}>Варианты списка</span>
        <button
          type="button"
          className={mod.addOptionButton}
          onClick={() => onChange([...rows, ''])}
        >
          + Добавить вариант
        </button>
      </div>
      <p className={mod.optionRowsHint}>
        На карточке товара значение можно выбрать только из этого списка. Порядок строк совпадает с
        порядком в выпадающем списке.
      </p>
      {rows.length === 0 ? (
        <p className={mod.optionRowsEmpty}>Пока нет вариантов — нажмите «Добавить вариант».</p>
      ) : (
        <ul className={mod.optionRowsList}>
          {rows.map((row, index) => (
            <li key={index} className={mod.optionRow}>
              <input
                type="text"
                value={row}
                onChange={(e) => {
                  const v = e.target.value;
                  const next = [...rows];
                  next[index] = v;
                  onChange(next);
                }}
                className={mod.input}
                placeholder={`Значение ${index + 1}`}
              />
              <div className={mod.optionRowActions}>
                <button
                  type="button"
                  className={mod.optionRowMoveBtn}
                  disabled={index === 0}
                  onClick={() => moveRow(index, -1)}
                  title="Выше"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={mod.optionRowMoveBtn}
                  disabled={index >= rows.length - 1}
                  onClick={() => moveRow(index, 1)}
                  title="Ниже"
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={mod.optionRowRemoveBtn}
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
