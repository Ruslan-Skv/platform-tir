type ResizableSpreadsheetColGroupProps = {
  columnKeys: string[];
  columnWidths: number[];
};

/** Colgroup с runtime-ширинами колонок (вне PageView — не попадает в inline-style warn). */
export function ResizableSpreadsheetColGroup({
  columnKeys,
  columnWidths,
}: ResizableSpreadsheetColGroupProps) {
  return (
    <colgroup>
      {columnKeys.map((key, i) => (
        <col key={key} style={{ width: columnWidths[i] }} />
      ))}
    </colgroup>
  );
}
