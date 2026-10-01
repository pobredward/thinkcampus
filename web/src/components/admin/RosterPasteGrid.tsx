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
      <p className="text-[14px] leading-[20px] text-sub">엑셀에서 복사한 표를 그대로 붙여 넣을 수 있어요. 드래그로 여러 칸을 고르고 Delete 로 비워요.</p>
      <div className="min-h-[360px] w-full overflow-hidden rounded-lg">
        <DataSheetGrid<RosterGridRow>
          value={rows}
          onChange={onRowsChange}
          columns={columns}
          createRow={createEmptyRosterRow}
          autoAddRow
          addRowsComponent={false}
          disableSmartDelete
          lockRows={false}
          height={Math.min(520, 36 + rows.length * 40)}
          rowKey="id"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRows} className="tap min-h-[44px] rounded-lg border border-line bg-elev px-4 text-[15px] font-semibold text-fg2">
          5행 추가
        </button>
        <button type="button" onClick={clearAll} className="tap min-h-[44px] rounded-lg border border-line bg-elev px-4 text-[15px] font-semibold text-fg2">
          전체 비우기 ({DEFAULT_EMPTY_ROWS}행)
        </button>
      </div>
    </div>
  );
}
