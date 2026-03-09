import ExcelJS from 'exceljs';

/**
 * Read an Excel file and return rows as array of objects (like sheet_to_json).
 * First row is used as headers.
 */
export async function readExcelFile(file: File): Promise<Record<string, any>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) return [];

  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber] = String(cell.value ?? '');
  });

  const rows: Record<string, any>[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const obj: Record<string, any> = {};
    let hasData = false;

    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const header = headers[colNumber];
      if (!header) return;
      obj[header] = cell.value;
      hasData = true;
    });

    if (hasData) rows.push(obj);
  }

  return rows;
}

/**
 * Read an Excel file and return raw rows as arrays (like sheet_to_json with header:1).
 */
export async function readExcelFileRaw(file: File): Promise<any[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) return [];

  const rows: any[][] = [];
  worksheet.eachRow((row) => {
    const values: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      // Pad array to correct position
      while (values.length < colNumber - 1) values.push(undefined);
      values[colNumber - 1] = cell.value;
    });
    rows.push(values);
  });

  return rows;
}

/**
 * Parse an Excel date serial number to { y, m, d }.
 */
export function parseExcelDate(value: any): { y: number; m: number; d: number } | null {
  if (value instanceof Date) {
    return { y: value.getFullYear(), m: value.getMonth() + 1, d: value.getDate() };
  }
  if (typeof value === 'number') {
    // Excel serial date conversion
    const epoch = new Date(1899, 11, 30);
    const date = new Date(epoch.getTime() + value * 86400000);
    return { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
  }
  return null;
}

interface WriteExcelOptions {
  sheetName: string;
  fileName: string;
  headers: string[];
  rows: Record<string, any>[];
  columnWidths?: number[];
}

/**
 * Create and download an Excel file.
 */
export async function writeAndDownloadExcel({ sheetName, fileName, headers, rows, columnWidths }: WriteExcelOptions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  worksheet.columns = headers.map((h, i) => ({
    header: h,
    key: h,
    width: columnWidths?.[i] ?? Math.max(h.length + 2, 15),
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
