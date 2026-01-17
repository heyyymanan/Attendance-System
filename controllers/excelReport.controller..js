import ExcelJS from "exceljs";
import Employee from "../models/Employee.js"; // ✅ Adjust path if needed

// ==============================
// CONFIG
// ==============================
const COMPANY_NAME = "Shreeji Remedies";
const REPORT_TITLE = "Monthly Attendance & Salary Report";
const FULL_DAY_HOURS = 10.5;

const FULL_DAY_MINUTES = FULL_DAY_HOURS * 60;
const RELIEF_MINUTES = 30;

// ==============================
// FINANCIAL CONFIG (still static for these)
// you can make these dynamic later too if you store in DB
// ==============================
const EMPLOYEE_ALLOWANCES = { default: 0 };
const EMPLOYEE_ADVANCES = { default: 0 };
const EMPLOYEE_LOANS = { default: 0 };

// ✅ Interest in percent (2 means 2%)
const EMPLOYEE_INTEREST_PERCENT = {
  // B3517733: 2,
  // B3166E33: 1.5,
  default: 0,
};

const EMPLOYEE_PREMIUMS = { default: 0 };

// ==============================
// HELPERS
// ==============================
const pad2 = (n) => String(n).padStart(2, "0");

function getMonthDates(year, month) {
  const dates = [];
  const start = new Date(year, month - 1, 1);
  const next = new Date(year, month, 1);

  for (let d = new Date(start); d < next; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }
  return dates;
}

function monthName(year, month) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", { month: "long" });
}

function excelColName(n) {
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

// Parse "09:57:55 am" → JS Date object (Excel time)
function parseTimeToExcelDate(timeStrRaw) {
  if (!timeStrRaw) return null;
  const t = String(timeStrRaw).trim().toLowerCase();

  const match = t.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;

  let hh = Number(match[1]);
  const mm = Number(match[2]);
  const ss = Number(match[3]);
  const ap = match[4];

  if (ap === "pm" && hh !== 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;

  return new Date(1970, 0, 1, hh, mm, ss);
}

// Build logMap(dateString -> logs[]) only for selected month
function processEmployees(employeesFromDb, monthDates) {
  const rows = [];

  for (const emp of employeesFromDb) {
    const logMap = new Map();
    for (const dt of monthDates) logMap.set(dt.toDateString(), []);

    for (const log of emp.logs || []) {
      try {
        const [dd, mm, yyyy] = String(log.date).split("/").map(Number);
        const logDate = new Date(yyyy, mm - 1, dd);
        const key = logDate.toDateString();
        if (logMap.has(key)) logMap.get(key).push(log);
      } catch (_) {}
    }

    rows.push({
      uid: emp.uid ?? "N/A",
      name: emp.name ?? "Unknown",
      salary: Number(emp.salary ?? 0), // ✅ NEW salary from DB
      logs: emp.logs || [],
      logMap,
    });
  }

  rows.sort((a, b) => String(a.uid).localeCompare(String(b.uid)));
  return rows;
}

// Attach financial values (salary from DB, others from map)
function mapFinancial(employees) {
  return employees.map((emp) => {
    const uid = String(emp.uid);

    const monthly_salary = Number(emp.salary ?? 0); // ✅ dynamic salary

    const allowance = EMPLOYEE_ALLOWANCES[uid] ?? EMPLOYEE_ALLOWANCES.default ?? 0;
    const advance_paid = EMPLOYEE_ADVANCES[uid] ?? EMPLOYEE_ADVANCES.default ?? 0;
    const loan = EMPLOYEE_LOANS[uid] ?? EMPLOYEE_LOANS.default ?? 0;

    const interest_percent =
      EMPLOYEE_INTEREST_PERCENT[uid] ?? EMPLOYEE_INTEREST_PERCENT.default ?? 0;

    const premium = EMPLOYEE_PREMIUMS[uid] ?? EMPLOYEE_PREMIUMS.default ?? 0;

    return {
      ...emp,
      monthly_salary,
      allowance,
      advance_paid,
      loan,
      interest_percent,
      premium,
    };
  });
}

// ==============================
// STYLES (ExcelJS)
// ==============================
const COLORS = {
  HEADER_FILL: "2C3E50",
  SUBHEADER_FILL: "34495E",
  CI_HEADER_FILL: "D5F5E3",
  CO_HEADER_FILL: "FADBD8",
  MINS_HEADER_FILL: "D6EAF8",
  SUNDAY_FILL: "FFE5E5",
  TODAY_FILL: "FCF3CF",
  ALT_COL_FILL: "ECF0F1",
  FINANCIAL_HEADER_FILL: "F39C12",
  DEDUCTIONS_HEADER_FILL: "27AE60",
  NAME_CELL_FILL: "F5B7B1",
  IN_HAND_SALARY_FILL: "A9DFBF",
};

function fill(color) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function thinBorder() {
  return {
    top: { style: "thin", color: { argb: "BDC3C7" } },
    left: { style: "thin", color: { argb: "BDC3C7" } },
    bottom: { style: "thin", color: { argb: "BDC3C7" } },
    right: { style: "thin", color: { argb: "BDC3C7" } },
  };
}

function center() {
  return { horizontal: "center", vertical: "middle", wrapText: true };
}

function styleCell(cell, { font, alignment, fillStyle, border, numFmt } = {}) {
  if (font) cell.font = font;
  if (alignment) cell.alignment = alignment;
  if (fillStyle) cell.fill = fillStyle;
  if (border) cell.border = border;
  if (numFmt) cell.numFmt = numFmt;
}

// ==============================
// SHEET BUILDERS
// ==============================
function createReportHeader(ws, monthNameStr, year) {
  ws.mergeCells("A1:F2");
  ws.getCell("A1").value = `${COMPANY_NAME}\n${REPORT_TITLE} - ${monthNameStr} ${year}`;
  styleCell(ws.getCell("A1"), {
    font: { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } },
    alignment: center(),
    fillStyle: fill(COLORS.HEADER_FILL),
  });

  ws.mergeCells("G1:J2");
  ws.getCell("G1").value = `Report Generated:\n${new Date().toISOString().slice(0, 16).replace("T", " ")}`;
  styleCell(ws.getCell("G1"), {
    font: { name: "Calibri", size: 11, italic: true, color: { argb: "FFFFFF" } },
    alignment: center(),
    fillStyle: fill(COLORS.HEADER_FILL),
  });
}

function createTableHeaders(ws, employees) {
  ws.mergeCells("A4:A5");
  ws.mergeCells("B4:B5");

  ws.getCell("A4").value = "Date";
  ws.getCell("B4").value = "Status";

  for (const addr of ["A4", "B4"]) {
    styleCell(ws.getCell(addr), {
      font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
      alignment: center(),
      fillStyle: fill(COLORS.SUBHEADER_FILL),
      border: thinBorder(),
    });
  }

  if (!employees.length) return;

  for (let i = 0; i < employees.length; i++) {
    const col = 3 + i;

    const uidCell = ws.getCell(4, col);
    const nameCell = ws.getCell(5, col);

    uidCell.value = employees[i].uid;
    nameCell.value = employees[i].name;

    for (const cell of [uidCell, nameCell]) {
      styleCell(cell, {
        font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
        alignment: center(),
        fillStyle: fill(COLORS.SUBHEADER_FILL),
        border: thinBorder(),
      });
    }
  }
}

function populateAttendanceData(ws, employees, dates) {
  const startRow = 6;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < dates.length; i++) {
    const dt = new Date(dates[i]);
    dt.setHours(0, 0, 0, 0);

    const rowCI = startRow + i * 3;
    const rowCO = rowCI + 1;
    const rowMINS = rowCI + 2;

    const isSunday = dt.getDay() === 0;
    const isToday = dt.getTime() === today.getTime();

    const dayFill = isSunday ? fill(COLORS.SUNDAY_FILL) : isToday ? fill(COLORS.TODAY_FILL) : undefined;

    const dateFont = isSunday
      ? { name: "Calibri", size: 11, bold: true, color: { argb: "943126" } }
      : isToday
        ? { name: "Calibri", size: 11, bold: true, color: { argb: "B7950B" } }
        : { name: "Calibri", size: 11 };

    ws.mergeCells(rowCI, 1, rowMINS, 1);
    ws.getCell(rowCI, 1).value = `${dt.toLocaleString("en-US", { weekday: "short" })}\n${dt.getDate()}`;

    for (let r = rowCI; r <= rowMINS; r++) {
      styleCell(ws.getCell(r, 1), {
        font: dateFont,
        alignment: center(),
        fillStyle: dayFill,
        border: thinBorder(),
      });
    }

    ws.getCell(rowCI, 2).value = "Check-In";
    ws.getCell(rowCO, 2).value = "Check-Out";
    ws.getCell(rowMINS, 2).value = "Minutes Worked";

    styleCell(ws.getCell(rowCI, 2), {
      font: { name: "Calibri", bold: true, color: { argb: "287431" } },
      alignment: center(),
      fillStyle: fill(COLORS.CI_HEADER_FILL),
      border: thinBorder(),
    });

    styleCell(ws.getCell(rowCO, 2), {
      font: { name: "Calibri", bold: true, color: { argb: "943126" } },
      alignment: center(),
      fillStyle: fill(COLORS.CO_HEADER_FILL),
      border: thinBorder(),
    });

    styleCell(ws.getCell(rowMINS, 2), {
      font: { name: "Calibri", bold: true, color: { argb: "1B4F72" } },
      alignment: center(),
      fillStyle: fill(COLORS.MINS_HEADER_FILL),
      border: thinBorder(),
    });

    if (!employees.length) continue;

    for (let j = 0; j < employees.length; j++) {
      const col = 3 + j;
      const emp = employees[j];

      const logs = emp.logMap.get(dt.toDateString()) || [];

      const checkins = [];
      const checkouts = [];

      for (const l of logs) {
        const t = parseTimeToExcelDate(l?.time);
        if (!t) continue;

        if (l.status === "Check-IN") checkins.push(t);
        if (l.status === "Check-OUT") checkouts.push(t);
      }

      const ciVal = checkins.length
        ? new Date(Math.min(...checkins.map((x) => x.getTime())))
        : "-";
      const coVal = checkouts.length
        ? new Date(Math.max(...checkouts.map((x) => x.getTime())))
        : "-";

      const ciCell = ws.getCell(rowCI, col);
      const coCell = ws.getCell(rowCO, col);

      ciCell.value = ciVal;
      coCell.value = coVal;

      if (ciVal instanceof Date) ciCell.numFmt = "h:mm:ss AM/PM";
      if (coVal instanceof Date) coCell.numFmt = "h:mm:ss AM/PM";

      const ciRef = ciCell.address;
      const coRef = coCell.address;

      const actualMinutesFormula = `ROUND((${coRef}-${ciRef})*1440,2)`;

      let minutesFormula =
        `=IF(OR(${ciRef}="-",${coRef}="-",${coRef}<${ciRef}), 0, ` +
        `LET(ActualMins, ${actualMinutesFormula}, ExpectedMins, ${FULL_DAY_MINUTES}, ` +
        `IF(ActualMins >= ExpectedMins, ActualMins, ` +
        `LET(Shortfall, ExpectedMins - ActualMins, ` +
        `IF(Shortfall <= ${RELIEF_MINUTES}, ExpectedMins, ActualMins)` +
        `))))`;

      if (isSunday) {
        const halfDayMinutes = FULL_DAY_MINUTES / 2;
        minutesFormula =
          `=IF(OR(${ciRef}="-",${coRef}="-",${coRef}<${ciRef}),0,` +
          `IF(${actualMinutesFormula}>=${halfDayMinutes},${FULL_DAY_MINUTES},${actualMinutesFormula}))`;
      }

      const minsCell = ws.getCell(rowMINS, col);
      minsCell.value = { formula: minutesFormula };
      minsCell.numFmt = "#,##0.00";

      const colFill = j % 2 !== 0 ? fill(COLORS.ALT_COL_FILL) : undefined;

      styleCell(ciCell, {
        font: { name: "Calibri", size: 11, color: { argb: "287431" } },
        alignment: center(),
        fillStyle: colFill,
        border: thinBorder(),
      });

      styleCell(coCell, {
        font: { name: "Calibri", size: 11, color: { argb: "943126" } },
        alignment: center(),
        fillStyle: colFill,
        border: thinBorder(),
      });

      styleCell(minsCell, {
        font: { name: "Calibri", size: 11 },
        alignment: center(),
        fillStyle: colFill,
        border: thinBorder(),
      });
    }

    ws.getRow(rowCI).height = 20;
    ws.getRow(rowCO).height = 20;
    ws.getRow(rowMINS).height = 20;
  }
}

function createPivotedSummary(ws, employees, monthDates, startCol) {
  const startRow = 4;

  ws.getCell(startRow, startCol).value = "Financial Summary";
  styleCell(ws.getCell(startRow, startCol), {
    font: { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } },
    alignment: center(),
    fillStyle: fill(COLORS.FINANCIAL_HEADER_FILL),
  });

  ws.mergeCells(startRow, startCol, startRow, startCol + employees.length);

  const headers = [
    "ID",
    "Name",
    "Presence",
    "Absence",
    "Basic Salary",
    "Total Days",
    "Payable Days",
    "Per Day Amt",
    "Per Min Wage",
    "Total Mins",
    "Gross Salary",
    "Short Hour Deduct.",
    "Earned Salary",
    "In Hand Salary",
  ];

  for (let i = 0; i < headers.length; i++) {
    const cell = ws.getCell(startRow + 2 + i, startCol);
    cell.value = headers[i];

    if (headers[i] === "In Hand Salary") {
      styleCell(cell, {
        font: { name: "Calibri", size: 11, bold: true, color: { argb: "145A32" } },
        alignment: { horizontal: "right", vertical: "middle" },
        fillStyle: fill(COLORS.IN_HAND_SALARY_FILL),
        border: thinBorder(),
      });
    } else {
      styleCell(cell, {
        font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
        alignment: { horizontal: "right", vertical: "middle" },
        fillStyle: fill(COLORS.SUBHEADER_FILL),
        border: thinBorder(),
      });
    }
  }

  if (!employees.length) return;

  const numDates = monthDates.length;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const currentCol = startCol + 1 + i;

    const mainTableColLetter = excelColName(3 + i);
    const fullRange = `${mainTableColLetter}6:${mainTableColLetter}${5 + numDates * 3}`;
    const startCellFullRange = `${mainTableColLetter}6`;

    const cc = (rowIdx) => `${excelColName(currentCol)}${startRow + 2 + rowIdx}`;

    ws.getCell(startRow + 4, currentCol).value = {
      formula: `=SUMPRODUCT(--(MOD(ROW(${fullRange})-ROW(${startCellFullRange}),3)=2),--(${fullRange}>0))`,
    };

    ws.getCell(startRow + 5, currentCol).value = { formula: `=${cc(5)}-${cc(2)}` };

    ws.getCell(startRow + 6, currentCol).value = emp.monthly_salary;
    ws.getCell(startRow + 6, currentCol).numFmt = '"₹"#,##0.00';

    ws.getCell(startRow + 7, currentCol).value = numDates;

    ws.getCell(startRow + 8, currentCol).value = { formula: `=${cc(2)}` };

    ws.getCell(startRow + 9, currentCol).value = { formula: `=IF(${cc(5)}>0,${cc(4)}/${cc(5)},0)` };
    ws.getCell(startRow + 9, currentCol).numFmt = '"₹"#,##0.00';

    ws.getCell(startRow + 10, currentCol).value = {
      formula: `=IF(${cc(5)}>0,${cc(4)}/(${cc(5)}*${FULL_DAY_HOURS}*60),0)`,
    };
    ws.getCell(startRow + 10, currentCol).numFmt = '"₹"#,##0.0000';

    ws.getCell(startRow + 11, currentCol).value = {
      formula: `=SUMPRODUCT(--(MOD(ROW(${fullRange})-ROW(${startCellFullRange}),3)=2),${fullRange})`,
    };
    ws.getCell(startRow + 11, currentCol).numFmt = "#,##0.00";

    ws.getCell(startRow + 12, currentCol).value = { formula: `=${cc(7)}*${cc(6)}` };
    ws.getCell(startRow + 12, currentCol).numFmt = '"₹"#,##0.00';

    ws.getCell(startRow + 13, currentCol).value = {
      formula: `=MAX(0, (${cc(6)}*${FULL_DAY_HOURS}*60 - ${cc(9)})*${cc(8)})`,
    };
    ws.getCell(startRow + 13, currentCol).numFmt = '"₹"#,##0.00';

    ws.getCell(startRow + 14, currentCol).value = { formula: `=${cc(10)}-${cc(11)}` };
    ws.getCell(startRow + 14, currentCol).numFmt = '"₹"#,##0.00';

    // ✅ Deductions refs
    const deductionsTableStartCol = startCol + employees.length + 2;

    // Allowance is still +2
    const allowanceRef = `${excelColName(deductionsTableStartCol + 2)}${startRow + 3 + i}`;

    // ✅ Total Deductions is +8
    const deductionsTotalRef = `${excelColName(deductionsTableStartCol + 8)}${startRow + 3 + i}`;

    ws.getCell(startRow + 15, currentCol).value = {
      formula: `=${cc(12)}+${allowanceRef}-${deductionsTotalRef}`,
    };
    ws.getCell(startRow + 15, currentCol).numFmt = '"₹"#,##0.00';

    for (let rIdx = 2; rIdx <= 15; rIdx++) {
      const cell = ws.getCell(startRow + rIdx, currentCol);

      if (rIdx === 2) cell.value = emp.uid;
      if (rIdx === 3) cell.value = emp.name;

      const fillStyle =
        rIdx === 3 ? fill(COLORS.NAME_CELL_FILL)
          : rIdx === 15 ? fill(COLORS.IN_HAND_SALARY_FILL)
            : undefined;

      styleCell(cell, {
        font: { name: "Calibri", size: 11 },
        alignment: center(),
        fillStyle,
        border: thinBorder(),
      });
    }
  }
}

function createDeductionsTable(ws, employees, startCol) {
  const startRow = 4;

  ws.getCell(startRow, startCol).value = "Allowances & Deductions";
  styleCell(ws.getCell(startRow, startCol), {
    font: { name: "Calibri", size: 18, bold: true, color: { argb: "FFFFFF" } },
    alignment: center(),
    fillStyle: fill(COLORS.DEDUCTIONS_HEADER_FILL),
  });

  ws.mergeCells(startRow, startCol, startRow, startCol + 8);

  const headers = [
    "ID",
    "Name",
    "Allowance",
    "Advance Paid",
    "Loan",
    "Interest %",
    "Interest Amt",
    "Premium",
    "Total Deductions",
  ];

  const headerRow = startRow + 2;

  for (let i = 0; i < headers.length; i++) {
    const cell = ws.getCell(headerRow, startCol + i);
    cell.value = headers[i];
    styleCell(cell, {
      font: { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFF" } },
      alignment: center(),
      fillStyle: fill(COLORS.SUBHEADER_FILL),
      border: thinBorder(),
    });
  }

  if (!employees.length) return;

  const topDataRow = headerRow + 1;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const r = topDataRow + i;

    ws.getCell(r, startCol + 0).value = emp.uid;
    ws.getCell(r, startCol + 1).value = emp.name;

    ws.getCell(r, startCol + 2).value = emp.allowance;
    ws.getCell(r, startCol + 2).numFmt = '"₹"#,##0.00';

    ws.getCell(r, startCol + 3).value = emp.advance_paid;
    ws.getCell(r, startCol + 3).numFmt = '"₹"#,##0.00';

    ws.getCell(r, startCol + 4).value = emp.loan;
    ws.getCell(r, startCol + 4).numFmt = '"₹"#,##0.00';

    // Interest %
    const interestPercentCell = ws.getCell(r, startCol + 5);
    interestPercentCell.value = (emp.interest_percent ?? 0) / 100;
    interestPercentCell.numFmt = "0.00%";

    // Interest Amount = Loan * Interest %
    const loanRef = ws.getCell(r, startCol + 4).address;
    const percentRef = ws.getCell(r, startCol + 5).address;

    const interestAmtCell = ws.getCell(r, startCol + 6);
    interestAmtCell.value = { formula: `=${loanRef}*${percentRef}` };
    interestAmtCell.numFmt = '"₹"#,##0.00';

    ws.getCell(r, startCol + 7).value = emp.premium;
    ws.getCell(r, startCol + 7).numFmt = '"₹"#,##0.00';

    // Total Deductions = Advance + Loan + InterestAmt + Premium
    const advRef = ws.getCell(r, startCol + 3).address;
    const interestAmtRef = ws.getCell(r, startCol + 6).address;
    const premiumRef = ws.getCell(r, startCol + 7).address;

    const totalDedCell = ws.getCell(r, startCol + 8);
    totalDedCell.value = {
      formula: `=${advRef}+${loanRef}+${interestAmtRef}+${premiumRef}`,
    };
    totalDedCell.numFmt = '"₹"#,##0.00';

    for (let c = 0; c < 9; c++) {
      styleCell(ws.getCell(r, startCol + c), {
        font: { name: "Calibri", size: 11 },
        alignment: center(),
        border: thinBorder(),
      });
    }
  }
}

function finalizeStyles(ws, numMainCols) {
  ws.getColumn("A").width = 10;
  ws.getColumn("B").width = 15;

  for (let i = 3; i <= numMainCols; i++) ws.getColumn(i).width = 20;

  for (let i = numMainCols + 1; i <= numMainCols + 35; i++) ws.getColumn(i).width = 18;

  ws.views = [{ state: "frozen", xSplit: 2, ySplit: 5 }];
  ws.properties.defaultRowHeight = 20;
  ws.properties.showGridLines = false;
}

// ==============================
// ✅ FINAL CONTROLLER
// ==============================
export const downloadMonthlyAttendanceReport = async (req, res) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || month < 1 || month > 12 || !year || year < 2000 || year > 2100) {
      return res.status(400).json({
        message: "Invalid month/year. Example: /export?month=1&year=2026",
      });
    }

    const dates = getMonthDates(year, month);
    const monthNameStr = monthName(year, month);

    // ✅ Fetch uid + name + salary + logs from DB
    const employeesFromDb = await Employee.find(
      {},
      { uid: 1, name: 1, salary: 1, logs: 1, _id: 0 }
    ).lean();

    let employees = processEmployees(employeesFromDb, dates);
    employees = mapFinancial(employees);

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet(`Attendance ${monthNameStr} ${year}`);

    createReportHeader(ws, monthNameStr, year);
    createTableHeaders(ws, employees);

    const numMainCols = 2 + employees.length;
    const summaryStartCol = numMainCols + 2;

    createPivotedSummary(ws, employees, dates, summaryStartCol);

    const deductionsStartCol = summaryStartCol + employees.length + 2;
    createDeductionsTable(ws, employees, deductionsStartCol);

    populateAttendanceData(ws, employees, dates);
    finalizeStyles(ws, numMainCols);

    const fileName = `Pivoted_Attendance_Report_with_Salary_${pad2(month)}_${year}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({ message: "Failed to export attendance report" });
  }
};
