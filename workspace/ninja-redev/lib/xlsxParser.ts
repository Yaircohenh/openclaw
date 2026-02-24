// ============================================================
// XLSX Parser — extracts ModelInputs from uploaded Excel files
// Supports the AARE model format + generic guessing
// ============================================================

import * as XLSX from 'xlsx';
import { ModelInputs, DEFAULT_INPUTS } from './model';

export interface ParseResult {
  inputs: ModelInputs;
  confidence: number;         // 0-1 how confident we are
  matchedFields: string[];    // fields successfully extracted
  warnings: string[];
  sheetNames: string[];
  rawData: Record<string, Record<string, unknown>>; // sheet → {cellAddr: value}
}

// ── Cell-value helpers ─────────────────────────────────────
function numVal(v: unknown): number | null {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[$,%]/g, ''));
    return isNaN(n) ? null : n;
  }
  return null;
}

function strVal(v: unknown): string {
  return v != null ? String(v).trim() : '';
}

// ── Sheet reader ───────────────────────────────────────────
function readSheet(wb: XLSX.WorkBook, name: string): Array<Array<unknown>> {
  const ws = wb.Sheets[name];
  if (!ws) return [];
  const data = XLSX.utils.sheet_to_json<Array<unknown>>(ws, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  return data;
}

function findSheetByKeyword(wb: XLSX.WorkBook, keywords: string[]): string | null {
  for (const name of wb.SheetNames) {
    const lower = name.toLowerCase();
    if (keywords.some(k => lower.includes(k))) return name;
  }
  return null;
}

// ── Parse Assumptions sheet ───────────────────────────────
function parseAssumptions(rows: Array<Array<unknown>>, result: Partial<ModelInputs>, matched: string[]): void {
  // Walk every row and look for label → value pairs
  // Typically: col B = label, col C/F = value
  const LABEL_COL = 1; // col B (0-indexed)
  const VALUE_COLS = [2, 5, 6, 16]; // col C, F, G, Q

  for (const row of rows) {
    const label = strVal(row[LABEL_COL]).toLowerCase();
    if (!label) continue;

    const getValue = (): number | null => {
      for (const c of VALUE_COLS) {
        const v = numVal(row[c]);
        if (v !== null) return v;
      }
      return null;
    };

    const v = getValue();

    // Deal info
    if (label.includes('land price') && !label.includes('per unit') && v !== null) {
      result.landPrice = v; matched.push('landPrice');
    }
    if ((label.includes('deal name') || label.includes('project name')) && row[2]) {
      result.dealName = strVal(row[2]); matched.push('dealName');
    }
    if (label.includes('address') && row[2] && !result.address) {
      result.address = strVal(row[2]); matched.push('address');
    }
    if ((label.includes('city') || label.includes('state') || label.includes('zip')) && row[2]) {
      result.cityStateZip = strVal(row[2]); matched.push('cityStateZip');
    }

    // Timeline
    if (label.includes('preconstruction') && label.includes('month') && v !== null) {
      result.preconstructionMonths = Math.round(v); matched.push('preconstructionMonths');
    }
    if (label.includes('construction') && label.includes('month') && !label.includes('pre') && v !== null) {
      result.constructionMonths = Math.round(v); matched.push('constructionMonths');
    }

    // Rents
    if ((label.includes('residential') || label.includes('resi')) && label.includes('margin') && v !== null) {
      result.resiRentPerNSF = v; matched.push('resiRentPerNSF');
    }
    if (label.includes('retail') && (label.includes('rent') || label.includes('$/nsf') || label.includes('margin')) && v !== null) {
      result.retailRentPerNSF = v; matched.push('retailRentPerNSF');
    }
    if ((label.includes('misc') || label.includes('miscellaneous')) && label.includes('income') && v !== null) {
      result.miscIncomePerUnit = v; matched.push('miscIncomePerUnit');
    }
    if (label.includes('rent') && label.includes('growth') && v !== null) {
      result.rentGrowth = v > 1 ? v / 100 : v; matched.push('rentGrowth');
    }
    if (label.includes('parking') && label.includes('space') && !label.includes('residential') && v !== null) {
      result.parkingRentPerSpace = v; matched.push('parkingRentPerSpace');
    }

    // Lease-up
    if (label.includes('occupancy') && label.includes('tco') && !label.includes('retail')) {
      // Check columns for resi vs retail
      const resiV = numVal(row[10]) ?? numVal(row[11]);
      if (resiV !== null) { result.resiOccAtTCO = resiV; matched.push('resiOccAtTCO'); }
      const retailV = numVal(row[11]) ?? numVal(row[12]);
      if (retailV !== null) { result.retailOccAtTCO = retailV; matched.push('retailOccAtTCO'); }
    }
    if (label.includes('lease up') && label.includes('month') && !label.includes('stabiliz')) {
      const rV = numVal(row[10]) ?? numVal(row[11]);
      if (rV !== null) { result.resiLeaseUpPerMonth = rV; matched.push('resiLeaseUpPerMonth'); }
      const rtV = numVal(row[11]) ?? numVal(row[12]);
      if (rtV !== null) { result.retailLeaseUpPerMonth = rtV; matched.push('retailLeaseUpPerMonth'); }
    }
    if (label.includes('stabilized') && label.includes('occupancy')) {
      const rV = numVal(row[10]) ?? numVal(row[11]) ?? v;
      if (rV !== null) { result.resiStabilizedOcc = rV; matched.push('resiStabilizedOcc'); }
    }

    // Concessions
    if (label.includes('resi') && label.includes('month') && label.includes('free')) {
      const rV = numVal(row[11]) ?? numVal(row[12]) ?? v;
      if (rV !== null) { result.resiMonthsFree = Math.round(rV); matched.push('resiMonthsFree'); }
    }
    if (label.includes('retail') && label.includes('month') && label.includes('free')) {
      const rV = numVal(row[11]) ?? numVal(row[12]) ?? v;
      if (rV !== null) { result.retailMonthsFree = Math.round(rV); matched.push('retailMonthsFree'); }
    }

    // Operating expenses
    if (label === 'utilities' && v !== null) {
      result.utilities = v; matched.push('utilities');
    }
    if ((label.includes('repair') || label === 'repairs and maintenance') && v !== null) {
      result.repairsMaintenance = v; matched.push('repairsMaintenance');
    }
    if (label === 'labor' && v !== null) {
      result.labor = v; matched.push('labor');
    }
    if (label === 'insurance' && v !== null) {
      result.insurance = v; matched.push('insurance');
    }
    if ((label.includes('g&a') || label.includes('general') || label.includes('service contract')) && v !== null) {
      result.gaServiceContracts = v; matched.push('gaServiceContracts');
    }
    if ((label.includes('marketing') || label.includes('leasing')) && label !== 'marketing/leasing' && v !== null) {
      result.marketingLeasing = v; matched.push('marketingLeasing');
    }
    if (label === 'marketing/leasing' && v !== null) {
      result.marketingLeasing = v; matched.push('marketingLeasing');
    }
    if (label.includes('turnover') && v !== null) {
      result.turnover = v; matched.push('turnover');
    }
    if (label.includes('capital reserve') && v !== null) {
      result.capexReserves = v; matched.push('capexReserves');
    }
    if (label.includes('management fee') && v !== null) {
      result.managementFeePercent = v > 1 ? v / 100 : v; matched.push('managementFeePercent');
    }
    if (label.includes('opex contingency') && v !== null) {
      result.opexContingencyPercent = v > 1 ? v / 100 : v; matched.push('opexContingencyPercent');
    }
    if (label.includes('expense') && label.includes('increase') && v !== null) {
      result.annualExpenseIncrease = v > 1 ? v / 100 : v; matched.push('annualExpenseIncrease');
    }
    if (label.includes('asset management') && v !== null) {
      result.assetMgmtFee = v > 1 ? v / 100 : v; matched.push('assetMgmtFee');
    }

    // Taxes
    if (label.includes('assessment') && label.includes('%') && v !== null) {
      result.assessmentPctOfCost = v > 1 ? v / 100 : v; matched.push('assessmentPctOfCost');
    }
    if (label.includes('tax rate') && v !== null) {
      result.taxRate = v > 1 ? v / 100 : v; matched.push('taxRate');
    }

    // Financing - Acquisition Loan
    if ((label.includes('ltc') || label.includes('loan to cost')) && label.includes('land') && v !== null) {
      result.acqLoanLTC = v > 1 ? v / 100 : v; matched.push('acqLoanLTC');
    }
    if (label.includes('interest rate') && v !== null) {
      // Heuristic: first interest rate → acq, second → const
      if (!result.acqLoanInterestRate) {
        result.acqLoanInterestRate = v > 1 ? v / 100 : v; matched.push('acqLoanInterestRate');
      } else if (!result.constLoanInterestRate) {
        result.constLoanInterestRate = v > 1 ? v / 100 : v; matched.push('constLoanInterestRate');
      }
    }
    if ((label.includes('ltc') || label.includes('loan to cost')) && !label.includes('land') && v !== null) {
      result.constLoanLTC = v > 1 ? v / 100 : v; matched.push('constLoanLTC');
    }

    // Sale assumptions
    if ((label.includes('cap rate') || label.includes('capitalization')) && !label.includes('increase')) {
      const rV = numVal(row[10]) ?? numVal(row[11]);
      const rtV = numVal(row[11]) ?? numVal(row[12]);
      if (rV !== null) { result.resiCapRate = rV > 1 ? rV / 100 : rV; matched.push('resiCapRate'); }
      if (rtV !== null && rtV !== rV) { result.retailCapRate = rtV > 1 ? rtV / 100 : rtV; matched.push('retailCapRate'); }
    }
    if (label.includes('sale month') && label.includes('post') && v !== null) {
      const rV = numVal(row[10]) ?? v;
      if (rV !== null) { result.resiSaleMonthPostTCO = Math.round(rV); matched.push('resiSaleMonthPostTCO'); }
    }

    // Equity
    if (label.includes('model start') && row[5]) {
      try {
        const d = new Date(row[5] as string);
        if (!isNaN(d.getTime())) { result.modelStartDate = d; matched.push('modelStartDate'); }
      } catch { /* skip */ }
    }
  }
}

// ── Parse Unit Mix sheet ───────────────────────────────────
function parseUnitMix(rows: Array<Array<unknown>>, result: Partial<ModelInputs>, matched: string[]): void {
  let studioUnits = 0, studioSF = 384;
  let br1Units = 0, br1SF = 600;
  let br2Units = 0, br2SF = 850;
  let br3Units = 0, br3SF = 1200;
  let ahBr1Units = 0, ahBr1SF = 600;
  let ahBr2Units = 0, ahBr2SF = 850;
  let parkingSpaces = 0;
  let foundAny = false;

  for (const row of rows) {
    const label = strVal(row[1]).toLowerCase();
    const units = numVal(row[2]);
    const sf = numVal(row[4]) ?? numVal(row[5]);

    if (!units || units <= 0) {
      // Check for parking spaces
      if (label.includes('parking') && label.includes('space') && units !== null) {
        parkingSpaces = Math.round(units);
        matched.push('parkingSpaces');
      }
      continue;
    }

    foundAny = true;

    if (label === 'studio' || label.includes('studio')) {
      studioUnits = Math.round(units);
      if (sf) studioSF = sf;
    } else if (label === '1' || label === '1 br' || label.includes('1br') || label.includes('1 br') || label.includes('one bed')) {
      if (label.includes('ah') || label.includes('affordable') || label.includes('60%')) {
        ahBr1Units = Math.round(units);
        if (sf) ahBr1SF = sf;
      } else {
        br1Units = Math.round(units);
        if (sf) br1SF = sf;
      }
    } else if (label === '2' || label === '2 br' || label.includes('2br') || label.includes('2 br') || label.includes('two bed')) {
      if (label.includes('ah') || label.includes('affordable') || label.includes('60%')) {
        ahBr2Units = Math.round(units);
        if (sf) ahBr2SF = sf;
      } else {
        br2Units = Math.round(units);
        if (sf) br2SF = sf;
      }
    } else if (label === '3' || label.includes('3br') || label.includes('3 br') || label.includes('three bed')) {
      br3Units = Math.round(units);
      if (sf) br3SF = sf;
    }
  }

  if (foundAny) {
    result.studioUnits = studioUnits;
    result.studioAvgSF = studioSF;
    result.br1Units = br1Units;
    result.br1AvgSF = br1SF;
    result.br2Units = br2Units;
    result.br2AvgSF = br2SF;
    result.br3Units = br3Units;
    result.br3AvgSF = br3SF;
    result.ahBr1Units = ahBr1Units;
    result.ahBr1AvgSF = ahBr1SF;
    result.ahBr2Units = ahBr2Units;
    result.ahBr2AvgSF = ahBr2SF;
    if (parkingSpaces > 0) result.parkingSpaces = parkingSpaces;
    matched.push('studioUnits', 'br1Units', 'br2Units', 'br3Units');
  }
}

// ── Parse Construction Costs sheet ────────────────────────
function parseConstructionCosts(rows: Array<Array<unknown>>, result: Partial<ModelInputs>, matched: string[]): void {
  for (const row of rows) {
    const label = strVal(row[1]).toLowerCase();
    const v = numVal(row[4]) ?? numVal(row[5]);
    if (v === null) continue;

    if (label.includes('land') && (label.includes('price') || label.includes('cost')) && v > 100000) {
      result.landPrice = v; matched.push('landPrice');
    }
    if (label.includes('hard cost') && label.includes('apartment') && v > 100000) {
      result.hardCostsApartments = v; matched.push('hardCostsApartments');
    }
    if (label.includes('hard cost') && label.includes('podium') && v > 100000) {
      result.hardCostsPodium = v; matched.push('hardCostsPodium');
    }
    if ((label.includes('ff&e') || label.includes('furniture')) && v > 0) {
      result.ffAndE = v; matched.push('ffAndE');
    }
    if (label.includes('contingency') && label.includes('hc') && numVal(row[2]) !== null) {
      const pct = numVal(row[2])!;
      result.hardContingencyPct = pct > 1 ? pct / 100 : pct; matched.push('hardContingencyPct');
    }
    if (label.includes('architect') || label.includes('engineer')) {
      result.archEngineers = v; matched.push('archEngineers');
    }
    if (label.includes('impact fee')) {
      result.impactFees = v; matched.push('impactFees');
    }
    if (label.includes('permit')) {
      result.permitsExpediting = v; matched.push('permitsExpediting');
    }
    if (label.includes('supervision') || label.includes('local partner')) {
      result.supervisionExpenses = v; matched.push('supervisionExpenses');
    }
    if (label.includes("owner's rep") || label.includes('owners rep')) {
      result.ownersRep = v; matched.push('ownersRep');
    }
    if (label.includes('developer fee') && numVal(row[2]) !== null) {
      const pct = numVal(row[2])!;
      result.developerFeePct = pct > 1 ? pct / 100 : pct; matched.push('developerFeePct');
    }
    if (label.includes('contingency') && label.includes('sc') && numVal(row[2]) !== null) {
      const pct = numVal(row[2])!;
      result.softContingencyPct = pct > 1 ? pct / 100 : pct; matched.push('softContingencyPct');
    }
    if ((label.includes('retail') || label.includes('tenant')) && label.includes('improvement') && v > 0) {
      result.retailTIPerNSF = v < 200 ? v : v / 4400; matched.push('retailTIPerNSF');
    }
    if (label.includes('working capital') && v > 0) {
      result.workingCapitalPerGSF = v < 10 ? v : v / 106000; matched.push('workingCapitalPerGSF');
    }
  }
}

// ── Parse Size Metrics from Assumptions ──────────────────
function parseSizeMetrics(rows: Array<Array<unknown>>, result: Partial<ModelInputs>, matched: string[]): void {
  for (const row of rows) {
    const label = strVal(row[1]).toLowerCase();

    if (label === 'retail') {
      const gsf = numVal(row[3]) ?? numVal(row[4]);
      if (gsf !== null && gsf > 0) { result.retailGSF = gsf; matched.push('retailGSF'); }
    }
    if (label === 'residential') {
      const gsf = numVal(row[3]) ?? numVal(row[4]);
      const eff = numVal(row[4]) ?? numVal(row[5]);
      if (gsf !== null && gsf > 1000) { result.residentialGSF = gsf; matched.push('residentialGSF'); }
      if (eff !== null && eff > 0 && eff <= 1) { result.residentialEfficiency = eff; matched.push('residentialEfficiency'); }
    }
    if (label.includes('structured parking') || label.includes('parking')) {
      const gsf = numVal(row[3]) ?? numVal(row[4]);
      if (gsf !== null && gsf > 1000) { result.parkingGSF = gsf; matched.push('parkingGSF'); }
    }
    if (label.includes('amenity') || label.includes('circ')) {
      const gsf = numVal(row[3]) ?? numVal(row[4]);
      if (gsf !== null && gsf > 0) { result.amenityGSF = gsf; matched.push('amenityGSF'); }
    }
    if (label.includes('residential parking') && label.includes('space')) {
      const sp = numVal(row[5]) ?? numVal(row[6]);
      if (sp !== null && sp > 0) { result.parkingSpaces = Math.round(sp); matched.push('parkingSpaces'); }
    }
  }
}

// ── Main parse function ────────────────────────────────────
export async function parseXLSX(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const warnings: string[] = [];
  const matchedFields: string[] = [];
  const result: Partial<ModelInputs> = {};

  // Collect raw data for debugging
  const rawData: Record<string, Record<string, unknown>> = {};
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    rawData[name] = {};
    for (const [cell, val] of Object.entries(ws)) {
      if (!cell.startsWith('!')) {
        rawData[name][cell] = (val as XLSX.CellObject).v;
      }
    }
  }

  // Try to find each sheet
  const assumptionsSheet = findSheetByKeyword(wb, ['assumption', 'input', 'assumptions']);
  const unitMixSheet = findSheetByKeyword(wb, ['unit mix', 'unitmix', 'units']);
  const constSheet = findSheetByKeyword(wb, ['construction', 'cost', 'budget']);

  if (assumptionsSheet) {
    const rows = readSheet(wb, assumptionsSheet);
    parseAssumptions(rows, result, matchedFields);
    parseSizeMetrics(rows, result, matchedFields);
  } else {
    // Try first 2 sheets
    for (const name of wb.SheetNames.slice(0, 2)) {
      const rows = readSheet(wb, name);
      parseAssumptions(rows, result, matchedFields);
    }
    warnings.push('No "Assumptions" sheet found — scanned first sheets');
  }

  if (unitMixSheet) {
    const rows = readSheet(wb, unitMixSheet);
    parseUnitMix(rows, result, matchedFields);
  } else {
    warnings.push('No "Unit Mix" sheet found');
  }

  if (constSheet && constSheet !== assumptionsSheet) {
    const rows = readSheet(wb, constSheet);
    parseConstructionCosts(rows, result, matchedFields);
  }

  // Merge with defaults for any missing fields
  const inputs: ModelInputs = {
    ...DEFAULT_INPUTS,
    ...result,
    // Ensure deal name is set
    dealName: result.dealName || result.address?.split(',')[0] || file.name.replace(/\.xlsx?$/, ''),
  };

  // Calculate confidence
  const totalFields = 30;
  const uniqueMatched = [...new Set(matchedFields)];
  const confidence = Math.min(1, uniqueMatched.length / totalFields);

  if (confidence < 0.3) {
    warnings.push('Low confidence — model format may differ from expected. Review all inputs carefully.');
  }

  return {
    inputs,
    confidence,
    matchedFields: uniqueMatched,
    warnings,
    sheetNames: wb.SheetNames,
    rawData,
  };
}

// ── Format bytes ───────────────────────────────────────────
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
