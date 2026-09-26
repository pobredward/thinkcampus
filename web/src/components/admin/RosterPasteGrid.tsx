"use client";

import { useMemo } from "react";
import {
  DataSheetGrid,
  textColumn,
  keyColumn,
  type Column,
} from "react-datasheet-grid";
import "react-datasheet-grid/dist/style.css";

import {
  createEmptyRosterRow,
  DEFAULT_EMPTY_ROWS,
  emptyRosterRows,
  ROSTER_COLUMNS,
  type RosterGridRow,
} from "@/lib/rosterGrid";

interface RosterPasteGridProps {
  rows: RosterGridRow[];
  onRowsChange: (rows: RosterGridRow[]) => void;
}

export function RosterPasteGrid({ rows, onRowsChange }: RosterPasteGridProps) {
  const columns = useMemo((): Column<RosterGridRow>[] => {
    return ROSTER_COLUMNS.map((col) => ({
      // textColumn 기본이 string | null — RosterGridRow 는 string 필드만 사용
      ...keyColumn(col.key, textColumn as Parameters<typeof keyColumn<RosterGridRow>>[1]),
      title: col.required ? `${col.label} *` : col.label,
      minWidth: col.key === "studentName" ? 120 : 100,
    })) as Column<RosterGridRow>[];
  }, []);

  const clearAll = () => {
    onRowsChange(emptyRosterRows());
  };

  const addRows = () => {
    onRowsChange([...rows, ...Array.from({ length: 5 }, () => createEmptyRosterRow())]);
  };

  return (
    <div className="space-y-2 [&_.dsg-container]:rounded-lg [&_.dsg-container]:border [&_.dsg-container]:border-line">
      <p className="text-sm text-fg2 leading-relaxed">
        엑셀형 그리드(react-datasheet-grid): 드래그·Shift
        선택, ⌘A 전체 선택, Delete/Backspace로 셀 비우기, 엑셀 복사·붙여넣기.
      </p>
      <div className="min-h-[360px] w-full overflow-hidden rounded-lg">
        <DataSheetGrid<RosterGridRow>
          value={rows}
          onChange={onRowsChange}
          columns={columns}
          createRow={createEmptyRosterRow}
          autoAddRow
          disableSmartDelete
          lockRows={false}
          height={Math.min(520, 36 + rows.length * 40)}
          rowKey="id"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRows} className="rounded-lg border border-line px-3 py-1.5 text-sm">
          + 5행 추가
        </button>
        <button type="button" onClick={clearAll} className="rounded-lg border border-line px-3 py-1.5 text-sm text-fg2">
          전체 비우기 ({DEFAULT_EMPTY_ROWS}행으로 초기화)
        </button>
      </div>
    </div>
  );
}
