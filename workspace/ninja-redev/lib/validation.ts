// ============================================================
// Validation & Guards — Required fields, NaN prevention,
// circular error protection
// ============================================================

import { ModelInputs } from './model';

export type Severity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  field: keyof ModelInputs;
  message: string;
  severity: Severity;
  autoFixable: boolean;
  suggestedValue?: unknown;
}

export interface ValidationResult {
  valid: boolean;       // no errors (warnings OK)
  issues: ValidationIssue[];
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

// ── Zero / Blank Inputs ─────────────────────────────────────
// Used as "fresh start" instead of resetting to Lamar defaults
export const ZERO_INPUTS: ModelInputs = {
  dealName: '',
  address: '',
  cityStateZip: '',

  retailGSF: 0,
  residentialGSF: 0,
  parkingGSF: 0,
  amenityGSF: 0,
  residentialEfficiency: 0.90,

  studioUnits: 0,
  studioAvgSF: 0,
  br1Units: 0,
  br1AvgSF: 0,
  br2Units: 0,
  br2AvgSF: 0,
  br3Units: 0,
  br3AvgSF: 0,
  ahBr1Units: 0,
  ahBr1AvgSF: 0,
  ahBr2Units: 0,
  ahBr2AvgSF: 0,
  parkingSpaces: 0,

  resiRentPerNSF: 0,
  retailRentPerNSF: 0,
  parkingRentPerSpace: 0,
  miscIncomePerUnit: 0,
  rentGrowth: 0.03,
  trended: true,

  resiOccAtTCO: 0,
  resiLeaseUpPerMonth: 0,
  resiStabilizedOcc: 0.95,
  retailOccAtTCO: 0,
  retailLeaseUpPerMonth: 0,
  retailStabilizedOcc: 1.00,

  resiMonthsFree: 0,
  retailMonthsFree: 0,

  utilities: 0,
  repairsMaintenance: 0,
  labor: 0,
  insurance: 0,
  gaServiceContracts: 0,
  marketingLeasing: 0,
  turnover: 0,
  capexReserves: 0,
  managementFeePercent: 0.02,
  opexContingencyPercent: 0.025,
  annualExpenseIncrease: 0.03,
  assetMgmtFee: 0.01,

  assessmentPctOfCost: 0.70,
  taxRate: 0,
  earlyPaymentDiscount: 0.04,

  hardCostMode: 'lump' as const,
  hardCostsApartments: 0,
  hardCostsPodium: 0,
  ffAndE: 0,
  hardContingencyPct: 0.05,
  hardCostsApartmentsPSF: 0,
  hardCostsPodiumPSF: 0,

  archEngineers: 0,
  impactFees: 0,
  permitsExpediting: 0,
  supervisionExpenses: 0,
  inspectionsTesting: 0,
  professionalLegal: 0,
  ownersRep: 0,
  auditReporting: 0,
  marketingModelUnit: 0,
  constructionInsurance: 0,
  reTaxesDuringConst: 0,
  reTaxesDuringConstYears: 2,
  retailLCCommissionRate: 0.06,
  retailLCTerm: 5,
  retailTIPerNSF: 0,
  workingCapitalPerGSF: 0,
  softContingencyPct: 0.05,
  developerFeePct: 0.05,

  landPrice: 0,

  acqLoanLTC: 0.50,
  acqLoanInterestRate: 0.065,
  acqLoanIntroMonth: 0,

  constLoanLTC: 0.75,
  constLoanInterestRate: 0.075,
  constLoanIntroMonth: 18,
  constLoanTakeoutMonth: 20,

  mezzLoanProceeds: 0,
  mezzInterestRate: 0.12,

  groundLease: false,
  groundLeaseRent: 0.048,
  groundLeaseCapRateIncrease: 0.0025,

  refi: false,

  modelStartDate: new Date(),
  preconstructionMonths: 0,
  constructionMonths: 0,

  resiSaleMonthPostTCO: 48,
  resiCapRate: 0.05,
  resiSaleCostPct: 0.01,
  retailSaleMonthPostTCO: 48,
  retailCapRate: 0.055,
  retailSaleCostPct: 0.035,

  gpEquitySplit: 0.15,
  lpEquitySplit: 0.85,
  prefReturn: 0.08,
  tier2Split: 0.30,
  catchUp: true,
};

// ── Required fields definition ─────────────────────────────
export interface FieldRequirement {
  field: keyof ModelInputs;
  label: string;
  required: boolean;
  minValue?: number;
  maxValue?: number;
  nonZero?: boolean;        // must be > 0
  autoFix?: () => unknown;  // returns suggested value
  group: string;
}

export const FIELD_REQUIREMENTS: FieldRequirement[] = [
  // Deal
  { field: 'dealName',              label: 'Deal Name',                 required: true, group: 'Deal Info' },
  { field: 'landPrice',             label: 'Land Price',                required: true, nonZero: true, minValue: 1, group: 'Deal Info' },
  { field: 'preconstructionMonths', label: 'Preconstruction (months)',  required: true, nonZero: true, minValue: 1, maxValue: 60, group: 'Deal Info' },
  { field: 'constructionMonths',    label: 'Construction (months)',     required: true, nonZero: true, minValue: 1, maxValue: 72, group: 'Deal Info' },

  // Size
  { field: 'residentialGSF',        label: 'Residential GSF',          required: true, nonZero: true, minValue: 1000, group: 'Building Size' },
  { field: 'residentialEfficiency', label: 'Resi Efficiency',          required: true, minValue: 0.50, maxValue: 1.0, group: 'Building Size' },

  // Units — need at least one type
  { field: 'br1Units',              label: '1BR Units',                 required: false, minValue: 0, group: 'Unit Mix' },
  { field: 'br2Units',              label: '2BR Units',                 required: false, minValue: 0, group: 'Unit Mix' },

  // Rents
  { field: 'resiRentPerNSF',        label: 'Resi Rent $/NSF/mo',       required: true, nonZero: true, minValue: 0.5, maxValue: 15, group: 'Rents' },
  { field: 'rentGrowth',            label: 'Rent Growth (annual)',      required: true, minValue: -0.1, maxValue: 0.20, group: 'Rents' },

  // Lease-Up
  { field: 'resiOccAtTCO',          label: 'Resi Occ at TCO',          required: true, minValue: 0, maxValue: 1.0, group: 'Lease-Up' },
  { field: 'resiStabilizedOcc',     label: 'Stabilized Occupancy',     required: true, minValue: 0.70, maxValue: 1.0, group: 'Lease-Up' },

  // Hard Costs
  { field: 'hardCostsApartments',   label: 'Hard Costs (Apts)',        required: true, nonZero: true, minValue: 100000, group: 'Hard Costs' },
  { field: 'hardContingencyPct',    label: 'HC Contingency %',         required: true, minValue: 0, maxValue: 0.30, group: 'Hard Costs' },

  // Financing
  { field: 'constLoanLTC',          label: 'Const Loan LTC',           required: true, minValue: 0.30, maxValue: 0.95, group: 'Financing' },
  { field: 'constLoanInterestRate', label: 'Const Loan Rate',          required: true, nonZero: true, minValue: 0.02, maxValue: 0.20, group: 'Financing' },
  { field: 'acqLoanInterestRate',   label: 'Acq Loan Rate',            required: true, nonZero: true, minValue: 0.02, maxValue: 0.20, group: 'Financing' },

  // Taxes
  { field: 'taxRate',               label: 'Property Tax Rate',        required: true, nonZero: true, minValue: 0.001, maxValue: 0.05, group: 'Taxes' },

  // Sale
  { field: 'resiCapRate',           label: 'Resi Exit Cap Rate',       required: true, nonZero: true, minValue: 0.02, maxValue: 0.15, group: 'Sale' },
  { field: 'resiSaleMonthPostTCO',  label: 'Sale Month Post-TCO',      required: true, nonZero: true, minValue: 1, maxValue: 240, group: 'Sale' },
];

// Fields that must be > 0 to avoid NaN / divide-by-zero
const REQUIRED_NONZERO: (keyof ModelInputs)[] = [
  'residentialGSF', 'landPrice', 'resiRentPerNSF', 'hardCostsApartments',
  'preconstructionMonths', 'constructionMonths', 'constLoanInterestRate',
  'acqLoanInterestRate', 'taxRate', 'resiCapRate', 'resiSaleMonthPostTCO',
  'residentialEfficiency',
];

// ── Sanitize inputs (apply guards) ─────────────────────────
export function sanitizeInputs(inp: ModelInputs): ModelInputs {
  const safe = { ...inp };

  // String fields
  if (!safe.dealName) safe.dealName = 'Untitled Deal';
  if (!safe.address) safe.address = safe.dealName;

  // Clamp rates to avoid blow-up
  safe.constLoanInterestRate = clamp(safe.constLoanInterestRate, 0.001, 0.30);
  safe.acqLoanInterestRate = clamp(safe.acqLoanInterestRate, 0.001, 0.30);
  safe.mezzInterestRate = clamp(safe.mezzInterestRate, 0.001, 0.50);
  safe.rentGrowth = clamp(safe.rentGrowth, -0.20, 0.25);
  safe.annualExpenseIncrease = clamp(safe.annualExpenseIncrease, -0.10, 0.25);

  // LTC must be 0–0.95
  safe.constLoanLTC = clamp(safe.constLoanLTC, 0, 0.95);
  safe.acqLoanLTC = clamp(safe.acqLoanLTC, 0, 0.95);

  // Occupancy 0–1
  safe.resiOccAtTCO = clamp(safe.resiOccAtTCO, 0, 1);
  safe.resiStabilizedOcc = clamp(safe.resiStabilizedOcc, 0, 1);
  safe.retailOccAtTCO = clamp(safe.retailOccAtTCO, 0, 1);
  safe.retailStabilizedOcc = clamp(safe.retailStabilizedOcc, 0, 1);

  // Efficiency 0.5–1
  safe.residentialEfficiency = clamp(safe.residentialEfficiency, 0.50, 1.0);

  // Cap rates 1%–20%
  safe.resiCapRate = clamp(safe.resiCapRate, 0.01, 0.20);
  safe.retailCapRate = clamp(safe.retailCapRate, 0.01, 0.20);

  // LP split = 1 - GP
  safe.lpEquitySplit = Math.max(0, Math.min(1, 1 - safe.gpEquitySplit));

  // Month fields positive ints
  safe.preconstructionMonths = Math.max(0, Math.round(safe.preconstructionMonths || 0));
  safe.constructionMonths = Math.max(1, Math.round(safe.constructionMonths || 1));
  safe.resiSaleMonthPostTCO = Math.max(1, Math.round(safe.resiSaleMonthPostTCO || 48));

  // Unit counts — non-negative integers
  for (const k of ['studioUnits', 'br1Units', 'br2Units', 'br3Units', 'ahBr1Units', 'ahBr2Units', 'parkingSpaces'] as const) {
    safe[k] = Math.max(0, Math.round(safe[k] || 0));
  }

  // Avg SFs — if units > 0 but SF = 0, set a reasonable default
  if (safe.studioUnits > 0 && !safe.studioAvgSF) safe.studioAvgSF = 400;
  if (safe.br1Units > 0 && !safe.br1AvgSF) safe.br1AvgSF = 600;
  if (safe.br2Units > 0 && !safe.br2AvgSF) safe.br2AvgSF = 850;
  if (safe.br3Units > 0 && !safe.br3AvgSF) safe.br3AvgSF = 1200;
  if (safe.ahBr1Units > 0 && !safe.ahBr1AvgSF) safe.ahBr1AvgSF = safe.br1AvgSF || 600;
  if (safe.ahBr2Units > 0 && !safe.ahBr2AvgSF) safe.ahBr2AvgSF = safe.br2AvgSF || 850;

  // NaN → 0 for all numeric fields
  for (const key of Object.keys(safe) as (keyof ModelInputs)[]) {
    const val = safe[key];
    if (typeof val === 'number' && isNaN(val)) {
      (safe as Record<string, unknown>)[key] = 0;
    }
  }

  return safe;
}

// ── Validate ───────────────────────────────────────────────
export function validateInputs(inp: ModelInputs): ValidationResult {
  const issues: ValidationIssue[] = [];

  // Required string fields
  if (!inp.dealName?.trim()) {
    issues.push({
      field: 'dealName',
      message: 'Deal name is required',
      severity: 'error',
      autoFixable: true,
      suggestedValue: 'Untitled Deal',
    });
  }

  // Required number fields from FIELD_REQUIREMENTS
  for (const req of FIELD_REQUIREMENTS) {
    if (!req.required) continue;
    // Skip hardCostsApartments nonZero check when in PSF mode (PSF fields drive the value)
    if (req.field === 'hardCostsApartments' && inp.hardCostMode === 'psf') continue;
    const val = inp[req.field];
    if (typeof val !== 'number') continue;

    if (isNaN(val) || !isFinite(val)) {
      issues.push({
        field: req.field,
        message: `${req.label}: invalid number (NaN/Infinity)`,
        severity: 'error',
        autoFixable: true,
        suggestedValue: 0,
      });
      continue;
    }

    if (req.nonZero && val <= 0) {
      issues.push({
        field: req.field,
        message: `${req.label} must be greater than 0`,
        severity: 'error',
        autoFixable: false,
      });
    }

    if (req.minValue !== undefined && val < req.minValue) {
      issues.push({
        field: req.field,
        message: `${req.label} is below minimum (${req.minValue})`,
        severity: val === 0 && req.nonZero ? 'error' : 'warning',
        autoFixable: true,
        suggestedValue: req.minValue,
      });
    }

    if (req.maxValue !== undefined && val > req.maxValue) {
      issues.push({
        field: req.field,
        message: `${req.label} exceeds maximum (${req.maxValue})`,
        severity: 'warning',
        autoFixable: true,
        suggestedValue: req.maxValue,
      });
    }
  }

  // At least one unit type
  const totalUnits = inp.studioUnits + inp.br1Units + inp.br2Units + inp.br3Units +
    inp.ahBr1Units + inp.ahBr2Units;
  if (totalUnits === 0) {
    issues.push({
      field: 'br1Units',
      message: 'No units defined — add at least one unit type',
      severity: 'error',
      autoFixable: false,
    });
  }

  // Unit avg SF warnings
  if (inp.br1Units > 0 && inp.br1AvgSF <= 0) {
    issues.push({
      field: 'br1AvgSF' as keyof ModelInputs,
      message: '1BR units have 0 avg SF — will auto-default to 600SF',
      severity: 'warning',
      autoFixable: true,
      suggestedValue: 600,
    });
  }
  if (inp.br2Units > 0 && inp.br2AvgSF <= 0) {
    issues.push({
      field: 'br2AvgSF' as keyof ModelInputs,
      message: '2BR units have 0 avg SF — will auto-default to 850SF',
      severity: 'warning',
      autoFixable: true,
      suggestedValue: 850,
    });
  }

  // Residual GSF check
  if (inp.residentialGSF <= 0 && totalUnits > 0) {
    issues.push({
      field: 'residentialGSF',
      message: 'Residential GSF is 0 — calculate from unit mix',
      severity: 'warning',
      autoFixable: true,
      suggestedValue: totalUnits * 750,
    });
  }

  // Lease-up math
  if (inp.resiOccAtTCO > inp.resiStabilizedOcc) {
    issues.push({
      field: 'resiOccAtTCO',
      message: 'Occ at TCO exceeds stabilized occupancy — check values',
      severity: 'warning',
      autoFixable: false,
    });
  }

  // Financing — constLoanLTC is the BLENDED LTC on total project cost (single senior loan)
  // acqLoanLTC is just the first-tranche sizing (land only), NOT added to constLoanLTC
  if (inp.constLoanLTC > 0.85) {
    issues.push({
      field: 'constLoanLTC',
      message: `Senior loan LTC ${(inp.constLoanLTC * 100).toFixed(0)}% is aggressive — typical max ~80% on TDC`,
      severity: 'warning',
      autoFixable: false,
    });
  }

  // Hard costs sanity (respect hardCostMode)
  const _resiGSF_v = Math.max(1, inp.residentialGSF);
  const _nonResiGSF_v = Math.max(1, inp.parkingGSF + inp.amenityGSF + inp.retailGSF);
  const effectiveHardApts = inp.hardCostMode === 'psf'
    ? inp.hardCostsApartmentsPSF * _resiGSF_v : inp.hardCostsApartments;

  if (effectiveHardApts > 0 && inp.residentialGSF > 0) {
    const psf = effectiveHardApts / inp.residentialGSF;
    if (psf < 50) {
      issues.push({
        field: 'hardCostsApartments',
        message: `Hard costs very low ($${psf.toFixed(0)}/GSF) — check units`,
        severity: 'warning',
        autoFixable: false,
      });
    }
    if (psf > 800) {
      issues.push({
        field: 'hardCostsApartments',
        message: `Hard costs very high ($${psf.toFixed(0)}/GSF) — check units`,
        severity: 'warning',
        autoFixable: false,
      });
    }
  }

  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return {
    valid: errors.length === 0,
    issues,
    errors,
    warnings,
  };
}

// ── Auto-fix all auto-fixable errors ──────────────────────
export function autoFixInputs(inp: ModelInputs, validation: ValidationResult): ModelInputs {
  const fixed = { ...inp };
  for (const issue of validation.issues) {
    if (issue.autoFixable && issue.suggestedValue !== undefined) {
      (fixed as Record<string, unknown>)[issue.field] = issue.suggestedValue;
    }
  }
  return sanitizeInputs(fixed);
}

// ── Helpers ────────────────────────────────────────────────
function clamp(val: number, min: number, max: number): number {
  if (isNaN(val) || !isFinite(val)) return min;
  return Math.min(max, Math.max(min, val));
}

// ── Completeness score (for UX progress bar) ──────────────
export function completenessScore(inp: ModelInputs): number {
  let filled = 0;
  let total = 0;
  for (const req of FIELD_REQUIREMENTS) {
    if (!req.required) continue;
    total++;
    const val = inp[req.field];
    if (typeof val === 'string') { if (val.trim()) filled++; }
    else if (typeof val === 'number') { if (!isNaN(val) && val > 0) filled++; }
    else if (val) filled++;
  }
  return total > 0 ? filled / total : 0;
}

// ── Which required fields are empty ──────────────────────
export function getEmptyRequiredFields(inp: ModelInputs): FieldRequirement[] {
  return FIELD_REQUIREMENTS.filter(req => {
    if (!req.required) return false;
    const val = inp[req.field];
    if (typeof val === 'string') return !val.trim();
    if (typeof val === 'number') return isNaN(val) || (req.nonZero && val <= 0);
    return !val;
  });
}
