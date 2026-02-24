// ============================================================
// 6719 N Lamar Real Estate Financial Model
// All calculations mirror the Excel workbook
// ============================================================

export interface ModelInputs {
  // Deal Info
  dealName: string;
  address: string;
  cityStateZip: string;

  // Size Metrics
  retailGSF: number;
  residentialGSF: number;
  parkingGSF: number;
  amenityGSF: number;
  residentialEfficiency: number; // 0.90

  // Unit Mix
  studioUnits: number;
  studioAvgSF: number;
  br1Units: number;
  br1AvgSF: number;
  br2Units: number;
  br2AvgSF: number;
  br3Units: number;
  br3AvgSF: number;
  ahBr1Units: number;
  ahBr1AvgSF: number;
  ahBr2Units: number;
  ahBr2AvgSF: number;
  parkingSpaces: number;

  // Rent Assumptions
  resiRentPerNSF: number; // $/NSF/mo
  retailRentPerNSF: number; // $/NSF/mo
  parkingRentPerSpace: number; // $/space/mo
  miscIncomePerUnit: number; // $/unit/mo
  rentGrowth: number; // annual
  trended: boolean;

  // Lease-up
  resiOccAtTCO: number;
  resiLeaseUpPerMonth: number;
  resiStabilizedOcc: number;
  retailOccAtTCO: number;
  retailLeaseUpPerMonth: number;
  retailStabilizedOcc: number;

  // Concessions
  resiMonthsFree: number;
  retailMonthsFree: number;

  // Operating Expenses (per unit per year)
  utilities: number;
  repairsMaintenance: number;
  labor: number;
  insurance: number;
  gaServiceContracts: number;
  marketingLeasing: number;
  turnover: number;
  capexReserves: number;
  managementFeePercent: number; // % of GI
  opexContingencyPercent: number; // % of OE
  annualExpenseIncrease: number;
  assetMgmtFee: number; // % of NOI

  // RE Taxes
  assessmentPctOfCost: number;
  taxRate: number;
  earlyPaymentDiscount: number;

  // Construction Costs
  hardCostMode: 'lump' | 'psf'; // toggle lump-sum vs $/SF input mode
  hardCostsApartments: number;  // lump sum mode
  hardCostsPodium: number;      // lump sum mode
  ffAndE: number;               // always lump sum
  hardContingencyPct: number;
  // $/SF mode equivalents (used when hardCostMode === 'psf')
  hardCostsApartmentsPSF: number; // $/residentialGSF
  hardCostsPodiumPSF: number;     // $/non-resiGSF (parking+amenity+retail)

  // Soft Costs
  archEngineers: number;
  impactFees: number;
  permitsExpediting: number;
  supervisionExpenses: number;
  inspectionsTesting: number;
  professionalLegal: number;
  ownersRep: number;
  auditReporting: number;
  marketingModelUnit: number;
  constructionInsurance: number;
  reTaxesDuringConst: number;
  reTaxesDuringConstYears: number;
  retailLCCommissionRate: number;
  retailLCTerm: number;
  retailTIPerNSF: number;
  workingCapitalPerGSF: number;
  softContingencyPct: number;
  developerFeePct: number; // % of HC + SC before dev fee

  // Land
  landPrice: number;

  // Financing - Acquisition Loan
  acqLoanLTC: number;
  acqLoanInterestRate: number;
  acqLoanIntroMonth: number;

  // Financing - Construction Loan
  constLoanLTC: number;
  constLoanInterestRate: number;
  constLoanIntroMonth: number;
  constLoanTakeoutMonth: number;

  // Mezz (optional)
  mezzLoanProceeds: number;
  mezzInterestRate: number;

  // Ground Lease
  groundLease: boolean;
  groundLeaseRent: number; // annual %
  groundLeaseCapRateIncrease: number;

  // Refi
  refi: boolean;

  // Timing
  modelStartDate: Date;
  preconstructionMonths: number;
  constructionMonths: number;

  // Sale Assumptions
  resiSaleMonthPostTCO: number;
  resiCapRate: number;
  resiSaleCostPct: number;
  retailSaleMonthPostTCO: number;
  retailCapRate: number;
  retailSaleCostPct: number;

  // Equity Structure
  gpEquitySplit: number; // 0.15
  lpEquitySplit: number; // 0.85
  prefReturn: number; // 0.08
  tier2Split: number; // GP 0.30
  catchUp: boolean;
}

export const DEFAULT_INPUTS: ModelInputs = {
  dealName: '6719 N Lamar BLVD',
  address: '6719 N Lamar BLVD',
  cityStateZip: 'Austin, TX',

  retailGSF: 4400,
  residentialGSF: 54167.78,
  parkingGSF: 34000,
  amenityGSF: 13491,
  residentialEfficiency: 0.90,

  studioUnits: 0,
  studioAvgSF: 384,
  br1Units: 21,
  br1AvgSF: 585,
  br2Units: 38,
  br2AvgSF: 825,
  br3Units: 0,
  br3AvgSF: 1200,
  ahBr1Units: 2,
  ahBr1AvgSF: 585,
  ahBr2Units: 4,
  ahBr2AvgSF: 850,
  parkingSpaces: 63,

  resiRentPerNSF: 3.2694,
  retailRentPerNSF: 2.70,
  parkingRentPerSpace: 0,
  miscIncomePerUnit: 150,
  rentGrowth: 0.03,
  trended: true,

  resiOccAtTCO: 0.35,
  resiLeaseUpPerMonth: 0.10,
  resiStabilizedOcc: 0.95,
  retailOccAtTCO: 0.50,
  retailLeaseUpPerMonth: 0.15,
  retailStabilizedOcc: 1.00,

  resiMonthsFree: 1,
  retailMonthsFree: 2,

  utilities: 800,
  repairsMaintenance: 500,
  labor: 900,
  insurance: 350,
  gaServiceContracts: 350,
  marketingLeasing: 300,
  turnover: 0,
  capexReserves: 100,
  managementFeePercent: 0.02,
  opexContingencyPercent: 0.025,
  annualExpenseIncrease: 0.03,
  assetMgmtFee: 0.01,

  assessmentPctOfCost: 0.70,
  taxRate: 0.02046485,
  earlyPaymentDiscount: 0.04,

  hardCostMode: 'lump',
  hardCostsApartments: 16500000,
  hardCostsPodium: 1890000,
  ffAndE: 200000,
  hardContingencyPct: 0.05,
  hardCostsApartmentsPSF: 305,   // ~$16.5M ÷ ~54k resiGSF
  hardCostsPodiumPSF: 36,        // ~$1.89M ÷ ~51.9k non-resiGSF

  archEngineers: 950000,
  impactFees: 350200,
  permitsExpediting: 150000,
  supervisionExpenses: 350000,
  inspectionsTesting: 100000,
  professionalLegal: 75000,
  ownersRep: 250000,
  auditReporting: 50000,
  marketingModelUnit: 70000,
  constructionInsurance: 100000,
  reTaxesDuringConst: 53000,
  reTaxesDuringConstYears: 2,
  retailLCCommissionRate: 0.06,
  retailLCTerm: 5,
  retailTIPerNSF: 20,
  workingCapitalPerGSF: 1.5,
  softContingencyPct: 0.05,
  developerFeePct: 0.05,

  landPrice: 3500000,

  acqLoanLTC: 0.50,
  acqLoanInterestRate: 0.06,
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

  modelStartDate: new Date('2026-01-01'),
  preconstructionMonths: 15,
  constructionMonths: 20,

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

// ============================================================
// DERIVED CALCULATIONS
// ============================================================

export interface SizeMetrics {
  totalGSF: number;
  retailNSF: number;
  residentialNSF: number;
  totalNSF: number;
  totalUnits: number;
  marketUnits: number;
  ahUnits: number;
  efficiency: number;
}

export interface UnitMixRow {
  type: string;
  units: number;
  pct: number;
  avgSF: number;
  totalSF: number;
  avgRent: number;
  rentPerSF: number;
  monthlyIncome: number;
  yearlyIncome: number;
  miscIncome: number;
}

export interface ConstructionCosts {
  // Hard
  hardCostsApts: number;
  hardCostsPodium: number;
  ffAndE: number;
  hardContingency: number;
  totalHardCosts: number;

  // Soft
  archEngineers: number;
  impactFees: number;
  permitsExpediting: number;
  supervisionExpenses: number;
  inspectionsTesting: number;
  professionalLegal: number;
  ownersRep: number;
  auditReporting: number;
  marketingModelUnit: number;
  constructionInsurance: number;
  reTaxesDuringConst: number;
  retailLC: number;
  retailTI: number;
  workingCapital: number;
  closingCosts: number;
  softContingency: number;
  capInterest: number;
  totalSoftBeforeDevFee: number;
  developerFee: number;
  totalSoftCosts: number;

  // Land
  landCosts: number;

  totalCosts: number;
}

export interface ClosingCosts {
  landClosing: number;
  acqLoanClosing: number;
  constLoanClosing: number;
  mezzClosing: number;
  totalClosingCosts: number;
}

export interface TaxCalc {
  assessedValue: number;
  stabilizedTaxExpense: number;
}

export interface FinancingCalc {
  acqLoanProceeds: number;
  constLoanProceeds: number;
  mezzLoanProceeds: number;
  totalDebt: number;
  equityRequired: number;
  capInterest: number;
}

export interface SourcesUses {
  // Uses
  landAcquisition: number;
  hardCosts: number;
  softCosts: number;
  dsGlReserve: number;
  noiShortfall: number;
  totalUses: number;

  // Sources
  equity: number;
  acqLoan: number;
  constLoan: number;
  mezzLoan: number;
  groundLease: number;
  totalSources: number;

  // Per unit / PSF
  perGSF: (val: number) => number;
  perNSF: (val: number) => number;
  perUnit: (val: number) => number;
}

export interface AnnualCF {
  year: number;
  yearPostTCO: number;
  label: string;
  grossPotentialResi: number;
  grossPotentialParking: number;
  grossPotentialMisc: number;
  grossPotentialRetail: number;
  vacancyLoss: number;
  resiConcessions: number;
  netEffectiveRevenue: number;
  utilities: number;
  repairsMaintenance: number;
  labor: number;
  insurance: number;
  ga: number;
  marketing: number;
  turnover: number;
  mgmtFee: number;
  opexContingency: number;
  reTaxes: number;
  capex: number;
  totalExpenses: number;
  noi: number;
  groundLeaseRent: number;
  noiAfterGL: number;
  assetMgmtFee: number;
  netCFBeforeDS: number;
  debtService: number;
  netCF: number;
  resiOccupancy: number;
  retailOccupancy: number;
}

export interface SaleProceeds {
  resiGrossSaleProceeds: number;
  resiSaleCosts: number;
  resiNetSaleProceeds: number;
  retailGrossSaleProceeds: number;
  retailSaleCosts: number;
  retailNetSaleProceeds: number;
  totalNetSaleProceeds: number;
}

export interface LeveredCF {
  year: number;
  label: string;
  equityDeployment: number;
  resiNOI: number;
  retailNOI: number;
  resiSaleProceeds: number;
  retailSaleProceeds: number;
  resiSaleCosts: number;
  retailSaleCosts: number;
  constLoanInterest: number;
  constLoanPaydown: number;
  permLoanProceeds: number;
  permLoanDS: number;
  permLoanPayoff: number;
  totalLeveredCF: number;
}

export interface Returns {
  netProfit: number;
  equityMultiple: number;
  irr: number;
  stabilizedYieldOnCost: number;
  totalCost: number;
  totalEquity: number;
}

export interface PromoteReturns {
  gpProfit: number;
  gpEM: number;
  gpIRR: number;
  lpProfit: number;
  lpEM: number;
  lpIRR: number;
}

export interface ModelOutputs {
  sizeMetrics: SizeMetrics;
  unitMix: UnitMixRow[];
  constructionCosts: ConstructionCosts;
  closingCosts: ClosingCosts;
  taxCalc: TaxCalc;
  financing: FinancingCalc;
  sourcesUses: SourcesUses;
  annualCFs: AnnualCF[];
  saleProceeds: SaleProceeds;
  leveredCFs: LeveredCF[];
  returns: Returns;
  promoteReturns: PromoteReturns;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function npv(rate: number, cashflows: number[]): number {
  return cashflows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + rate, i + 1), 0);
}

function irr(cashflows: number[], guess = 0.1): number {
  // Newton-Raphson
  let r = guess;
  for (let i = 0; i < 1000; i++) {
    let f = 0, df = 0;
    for (let t = 0; t < cashflows.length; t++) {
      f += cashflows[t] / Math.pow(1 + r, t);
      df -= t * cashflows[t] / Math.pow(1 + r, t + 1);
    }
    if (Math.abs(df) < 1e-12) break;
    const rNew = r - f / df;
    if (Math.abs(rNew - r) < 1e-8) { r = rNew; break; }
    r = rNew;
  }
  return r;
}

function annualDebtService(principal: number, rate: number, termYears: number): number {
  if (principal === 0) return 0;
  const mRate = rate / 12;
  const n = termYears * 12;
  return 12 * principal * mRate * Math.pow(1 + mRate, n) / (Math.pow(1 + mRate, n) - 1);
}

// ============================================================
// MAIN CALCULATE FUNCTION
// ============================================================

export function calculate(inp: ModelInputs): ModelOutputs {
  // ── Size Metrics ──────────────────────────────────────────
  const residentialNSF = Math.round(inp.residentialGSF * inp.residentialEfficiency);
  const retailNSF = inp.retailGSF;
  const totalNSF = residentialNSF + retailNSF;
  const totalGSF = inp.retailGSF + inp.residentialGSF + inp.parkingGSF + inp.amenityGSF;
  const marketUnits = inp.studioUnits + inp.br1Units + inp.br2Units + inp.br3Units;
  const ahUnits = inp.ahBr1Units + inp.ahBr2Units;
  const totalUnits = marketUnits + ahUnits;
  const efficiency = totalNSF / totalGSF;

  const sizeMetrics: SizeMetrics = {
    totalGSF,
    retailNSF,
    residentialNSF,
    totalNSF,
    totalUnits,
    marketUnits,
    ahUnits,
    efficiency,
  };

  // ── Unit Mix ──────────────────────────────────────────────
  // AH rents are at 60% AMI (approx $1,244 1BR, $1,450 2BR)
  const ahBr1Rent = 1244;
  const ahBr2Rent = 1450;

  const marketMonthlyRent = inp.resiRentPerNSF; // $/NSF/mo - we convert to unit rents

  // For market rate, use avg SF * rate/NSF
  const br1Rent = inp.br1AvgSF * inp.resiRentPerNSF;
  const br2Rent = inp.br2AvgSF * inp.resiRentPerNSF;
  const br3Rent = inp.br3AvgSF * inp.resiRentPerNSF;
  const studioRent = inp.studioAvgSF * inp.resiRentPerNSF;

  const unitMixRows: UnitMixRow[] = [];

  const addRow = (type: string, units: number, avgSF: number, rent: number, isAH: boolean) => {
    if (units === 0 && type !== 'Total') return;
    const totalSF = units * avgSF;
    const monthlyIncome = units * rent;
    const yearlyIncome = monthlyIncome * 12;
    const miscIncome = isAH ? 0 : inp.miscIncomePerUnit * units;
    unitMixRows.push({
      type, units, pct: 0, avgSF, totalSF, avgRent: rent,
      rentPerSF: avgSF > 0 ? rent / avgSF : 0,
      monthlyIncome, yearlyIncome, miscIncome,
    });
  };

  if (inp.studioUnits > 0) addRow('Studio (MR)', inp.studioUnits, inp.studioAvgSF, studioRent, false);
  if (inp.br1Units > 0) addRow('1BR (MR)', inp.br1Units, inp.br1AvgSF, br1Rent, false);
  if (inp.br2Units > 0) addRow('2BR (MR)', inp.br2Units, inp.br2AvgSF, br2Rent, false);
  if (inp.br3Units > 0) addRow('3BR (MR)', inp.br3Units, inp.br3AvgSF, br3Rent, false);
  if (inp.ahBr1Units > 0) addRow('1BR (AH 60%)', inp.ahBr1Units, inp.ahBr1AvgSF, ahBr1Rent, true);
  if (inp.ahBr2Units > 0) addRow('2BR (AH 60%)', inp.ahBr2Units, inp.ahBr2AvgSF, ahBr2Rent, true);

  const totalMthIncome = unitMixRows.reduce((s, r) => s + r.monthlyIncome, 0);
  const totalSF_ = unitMixRows.reduce((s, r) => s + r.totalSF, 0);
  const totalUnits_ = unitMixRows.reduce((s, r) => s + r.units, 0);

  // set pct
  unitMixRows.forEach(r => { r.pct = totalUnits_ > 0 ? r.units / totalUnits_ : 0; });

  // ── Closing Costs ─────────────────────────────────────────
  const landClosing = 7000 + inp.landPrice * 0.0015 + inp.landPrice * 0.02 + inp.landPrice * 0.01 + 30000;

  // Prelim hard cost estimate (for closing cost sizing, mode-aware)
  const _nonResiGSF_prelim = Math.max(1, inp.parkingGSF + inp.amenityGSF + inp.retailGSF);
  const _hardApts_prelim = inp.hardCostMode === 'psf'
    ? inp.hardCostsApartmentsPSF * Math.max(1, inp.residentialGSF) : inp.hardCostsApartments;
  const _hardPodium_prelim = inp.hardCostMode === 'psf'
    ? inp.hardCostsPodiumPSF * _nonResiGSF_prelim : inp.hardCostsPodium;
  const _hardBase_prelim = _hardApts_prelim + _hardPodium_prelim + inp.ffAndE;

  const constLoanPrelim = Math.max(0, (
    _hardBase_prelim +
    _hardBase_prelim * inp.hardContingencyPct +
    inp.archEngineers + inp.impactFees + inp.permitsExpediting + inp.supervisionExpenses +
    inp.inspectionsTesting + inp.professionalLegal + inp.ownersRep + inp.auditReporting +
    inp.marketingModelUnit + inp.constructionInsurance +
    inp.reTaxesDuringConst * inp.reTaxesDuringConstYears +
    inp.retailGSF * inp.retailLCCommissionRate * inp.retailRentPerNSF * 12 * inp.retailLCTerm +
    inp.retailTIPerNSF * inp.retailGSF +
    inp.workingCapitalPerGSF * totalGSF
  ) * inp.constLoanLTC);

  const constLoanClosing = constLoanPrelim * 0.01 + constLoanPrelim * 0.01 + constLoanPrelim * 0.0005 +
    constLoanPrelim * 0.0015 + 25000 + 25000 + 25000;

  const closingCosts: ClosingCosts = {
    landClosing,
    acqLoanClosing: 0,
    constLoanClosing,
    mezzClosing: 0,
    totalClosingCosts: landClosing + constLoanClosing,
  };

  // ── Hard Costs ────────────────────────────────────────────
  // Resolve effective values: lump sum OR $/SF depending on mode
  const nonResiGSF_hc = Math.max(1, inp.parkingGSF + inp.amenityGSF + inp.retailGSF);
  const hardCostsApts_eff = inp.hardCostMode === 'psf'
    ? inp.hardCostsApartmentsPSF * Math.max(1, inp.residentialGSF)
    : inp.hardCostsApartments;
  const hardCostsPodium_eff = inp.hardCostMode === 'psf'
    ? inp.hardCostsPodiumPSF * nonResiGSF_hc
    : inp.hardCostsPodium;

  const totalHardBeforeConting = hardCostsApts_eff + hardCostsPodium_eff + inp.ffAndE;
  const hardContingency = totalHardBeforeConting * inp.hardContingencyPct;
  const totalHardCosts = totalHardBeforeConting + hardContingency;

  // ── Soft Costs (iterative to resolve cap interest circular ref) ───────────
  const retailLC = inp.retailRentPerNSF * inp.retailGSF * 12 * inp.retailLCTerm * inp.retailLCCommissionRate;
  const retailTI = inp.retailTIPerNSF * inp.retailGSF;
  const workingCapital = inp.workingCapitalPerGSF * totalGSF;
  const reTaxesConst = inp.reTaxesDuringConst * inp.reTaxesDuringConstYears;

  // Base soft costs (before cap interest and dev fee)
  const softBeforeClose = inp.archEngineers + inp.impactFees + inp.permitsExpediting +
    inp.supervisionExpenses + inp.inspectionsTesting + inp.professionalLegal +
    inp.ownersRep + inp.auditReporting + inp.marketingModelUnit +
    inp.constructionInsurance + reTaxesConst + retailLC + retailTI + workingCapital;
  const softContingency = softBeforeClose * inp.softContingencyPct;
  const baseSoftNoCap = softBeforeClose + closingCosts.totalClosingCosts + softContingency;

  // ── Financing — Correct Excel Logic ──────────────────────
  //
  // Structure (matches Excel exactly):
  //   • ONE "Senior Loan" = totalCosts × constLoanLTC  (blended LTC on ALL costs)
  //   • Acq Tranche       = landPrice × acqLoanLTC     (first draw at land close)
  //   • Const Draws       = totalSeniorLoan - acqTranche (drawn during construction)
  //   • NOT two separate loans — acq is just the first draw on the const facility
  //   • Post-TCO: interest-only on full Senior Loan balance (I/O, not amortizing)
  //   • At sale: full Senior Loan balance repaid in one shot
  //
  // Cap Interest (capitalized during preconstruction + construction + lease-up shortfall):
  //   Phase 1: acqTranche × acqRate × preconMonths / 12
  //   Phase 2: constDraws × constRate × constMonths / 12 × 0.62  (S-curve avg ~62% drawn)
  //   Phase 3: post-TCO lease-up shortfall (NOI < full I/O during ramp-up, added to balance)
  //            estimated as leaseUpMonths × monthly_shortfall_factor
  //
  // This is circular (cap interest → totalCosts → seniorLoan → cap interest) → iterate.

  const acqTranche    = inp.landPrice * inp.acqLoanLTC;   // e.g. $1.75M (50% of land)
  const mezzLoanProceeds_ = inp.mezzLoanProceeds;
  const preconMonths   = Math.max(1, inp.preconstructionMonths);
  const constMonths_   = Math.max(1, inp.constructionMonths);
  // Lease-up months before stabilized (approx from ramp-up schedule)
  const leaseUpMonths  = inp.resiStabilizedOcc > inp.resiOccAtTCO
    ? Math.ceil((inp.resiStabilizedOcc - inp.resiOccAtTCO) / Math.max(0.01, inp.resiLeaseUpPerMonth))
    : 0;

  let capInterestEst     = 0;
  let totalCosts         = 0;
  let totalSeniorLoan    = 0;
  let constDraws         = 0;       // = totalSeniorLoan - acqTranche
  let totalSoftBeforeDevFee = 0;
  let developerFee       = 0;
  let totalSoftCosts     = 0;

  for (let iter = 0; iter < 15; iter++) {
    // Build soft cost total (including cap interest)
    totalSoftBeforeDevFee = baseSoftNoCap + capInterestEst;
    developerFee = (totalHardCosts + totalSoftBeforeDevFee) * inp.developerFeePct;
    totalSoftCosts = totalSoftBeforeDevFee + developerFee;
    totalCosts = inp.landPrice + totalHardCosts + totalSoftCosts;

    // Senior loan = totalCosts × blended LTC (exactly as Excel)
    totalSeniorLoan = Math.max(0, totalCosts * inp.constLoanLTC);
    constDraws      = Math.max(0, totalSeniorLoan - acqTranche);

    // Phase 1: Interest on acq tranche during preconstruction
    const capPhase1 = acqTranche * inp.acqLoanInterestRate * (preconMonths / 12);

    // Phase 2: Interest on construction draws (S-curve avg ~62% of constDraws drawn)
    const capPhase2 = constDraws * 0.62 * inp.constLoanInterestRate * (constMonths_ / 12);

    // Phase 3: Post-TCO lease-up shortfall — I/O on full balance minus average NOI during ramp
    // Estimate: full monthly I/O = totalSeniorLoan × rate / 12
    // During lease-up (avg occ ≈ midpoint of ramp), NOI ≈ stabilized × avgOcc / stabilizedOcc × 0.5
    const fullMonthlyIO   = totalSeniorLoan * inp.constLoanInterestRate / 12;
    const midRampOcc      = (inp.resiOccAtTCO + inp.resiStabilizedOcc) / 2;
    const estLeaseUpNOI   = fullMonthlyIO * (midRampOcc / Math.max(0.01, inp.resiStabilizedOcc)) * 0.85;
    const capPhase3       = Math.max(0, (fullMonthlyIO - estLeaseUpNOI) * leaseUpMonths);

    const newCapInt = capPhase1 + capPhase2 + capPhase3;
    if (Math.abs(newCapInt - capInterestEst) < 10) { capInterestEst = newCapInt; break; }
    capInterestEst = newCapInt * 0.7 + capInterestEst * 0.3; // dampen oscillation
  }

  // Equity = totalCosts − totalSeniorLoan (− mezz if any)
  const equityRequired = Math.max(0, totalCosts - totalSeniorLoan - mezzLoanProceeds_);

  const financing: FinancingCalc = {
    acqLoanProceeds:  acqTranche,
    constLoanProceeds: constDraws,        // just the const portion
    mezzLoanProceeds:  mezzLoanProceeds_,
    totalDebt:        totalSeniorLoan + mezzLoanProceeds_,
    equityRequired,
    capInterest:      capInterestEst,
  };

  // Update closing costs with actual const loan balance
  const constLoanClosingFinal = totalSeniorLoan * 0.025 + 75000; // origination fees + title/legal
  closingCosts.constLoanClosing = constLoanClosingFinal;
  closingCosts.totalClosingCosts = closingCosts.landClosing + constLoanClosingFinal;

  // ── Taxes ─────────────────────────────────────────────────
  const assessedValue = totalCosts * inp.assessmentPctOfCost;
  const stabilizedTaxExpense = assessedValue * inp.taxRate;

  const taxCalc: TaxCalc = { assessedValue, stabilizedTaxExpense };

  // ── Construction Costs (full) ─────────────────────────────
  const constructionCosts: ConstructionCosts = {
    hardCostsApts: hardCostsApts_eff,
    hardCostsPodium: hardCostsPodium_eff,
    ffAndE: inp.ffAndE,
    hardContingency,
    totalHardCosts,
    archEngineers: inp.archEngineers,
    impactFees: inp.impactFees,
    permitsExpediting: inp.permitsExpediting,
    supervisionExpenses: inp.supervisionExpenses,
    inspectionsTesting: inp.inspectionsTesting,
    professionalLegal: inp.professionalLegal,
    ownersRep: inp.ownersRep,
    auditReporting: inp.auditReporting,
    marketingModelUnit: inp.marketingModelUnit,
    constructionInsurance: inp.constructionInsurance,
    reTaxesDuringConst: reTaxesConst,
    retailLC,
    retailTI,
    workingCapital,
    closingCosts: closingCosts.totalClosingCosts,
    softContingency,
    capInterest: capInterestEst,
    totalSoftBeforeDevFee,
    developerFee,
    totalSoftCosts,
    landCosts: inp.landPrice,
    totalCosts,
  };

  // ── Sources & Uses ────────────────────────────────────────
  const sourcesUses: SourcesUses = {
    landAcquisition: inp.landPrice,
    hardCosts: totalHardCosts,
    softCosts: totalSoftCosts,
    dsGlReserve: capInterestEst,
    noiShortfall: 0,
    totalUses: totalCosts,
    equity: equityRequired,
    acqLoan: acqTranche,
    constLoan: constDraws,
    mezzLoan: mezzLoanProceeds_,
    groundLease: 0,
    totalSources: totalSeniorLoan + mezzLoanProceeds_ + equityRequired,
    perGSF: (v) => totalGSF > 0 ? v / totalGSF : 0,
    perNSF: (v) => totalNSF > 0 ? v / totalNSF : 0,
    perUnit: (v) => totalUnits > 0 ? v / totalUnits : 0,
  };

  // ── Pro Forma Cash Flows ──────────────────────────────────
  const TCOMonths = inp.preconstructionMonths + inp.constructionMonths;
  // We run 10 years post-TCO
  const yearsToModel = 10;
  const annualCFs: AnnualCF[] = [];

  // Gross potential residential income at stabilization (Year 1 post-TCO)
  const studioNSF = inp.studioUnits * inp.studioAvgSF;
  const br1NSF = (inp.br1Units + inp.ahBr1Units) * ((inp.br1Units * inp.br1AvgSF + inp.ahBr1Units * inp.ahBr1AvgSF) / Math.max(1, inp.br1Units + inp.ahBr1Units));
  const br2NSF = (inp.br2Units + inp.ahBr2Units) * ((inp.br2Units * inp.br2AvgSF + inp.ahBr2Units * inp.ahBr2AvgSF) / Math.max(1, inp.br2Units + inp.ahBr2Units));

  // Total residential NSF from unit mix
  const resiNSFFromUnits = unitMixRows.filter(r => !r.type.includes('AH')).reduce((s, r) => s + r.totalSF, 0);
  const ahNSFFromUnits = unitMixRows.filter(r => r.type.includes('AH')).reduce((s, r) => s + r.totalSF, 0);

  // Gross potential resi income (market rate only, before AH adjustment)
  const grossMRIncome = unitMixRows
    .filter(r => !r.type.includes('AH'))
    .reduce((s, r) => s + r.monthlyIncome * 12, 0);
  const grossAHIncome = unitMixRows
    .filter(r => r.type.includes('AH'))
    .reduce((s, r) => s + r.monthlyIncome * 12, 0);
  const grossPotentialResiBase = grossMRIncome + grossAHIncome;
  const grossPotentialMiscBase = inp.miscIncomePerUnit * totalUnits * 12;
  const grossPotentialRetailBase = inp.retailRentPerNSF * inp.retailGSF * 12;
  const grossPotentialParkingBase = inp.parkingRentPerSpace * inp.parkingSpaces * 12;

  for (let yr = 1; yr <= yearsToModel; yr++) {
    const growthFactor = inp.trended ? Math.pow(1 + inp.rentGrowth, yr - 1) : 1;
    const expGrowthFactor = Math.pow(1 + inp.annualExpenseIncrease, yr - 1);

    // Occupancy ramp
    const resiOcc = Math.min(inp.resiStabilizedOcc,
      inp.resiOccAtTCO + (yr - 1) * inp.resiLeaseUpPerMonth * 12);
    const retailOcc = Math.min(inp.retailStabilizedOcc,
      inp.retailOccAtTCO + (yr - 1) * inp.retailLeaseUpPerMonth * 12);

    const gprResi = grossPotentialResiBase * growthFactor;
    const gprParking = grossPotentialParkingBase * growthFactor;
    const gprMisc = grossPotentialMiscBase * growthFactor;
    const gprRetail = grossPotentialRetailBase * growthFactor;

    const vacancyLoss = -(gprResi * (1 - resiOcc) + gprRetail * (1 - retailOcc) + gprMisc * (1 - resiOcc));
    // Concessions – only first year during lease-up
    const resiConcessions = yr === 1 ?
      -(inp.resiMonthsFree / 12) * gprResi * Math.min(1, inp.resiLeaseUpPerMonth * 12) : 0;

    const netEffectiveRevenue = gprResi + gprParking + gprMisc + gprRetail + vacancyLoss + resiConcessions;

    // Expenses
    const util = inp.utilities * totalUnits * expGrowthFactor;
    const rm = inp.repairsMaintenance * totalUnits * expGrowthFactor;
    const lab = inp.labor * totalUnits * expGrowthFactor;
    const ins = inp.insurance * totalUnits * expGrowthFactor;
    const ga = inp.gaServiceContracts * totalUnits * expGrowthFactor;
    const mkt = inp.marketingLeasing * totalUnits * expGrowthFactor;
    const turn = inp.turnover * totalUnits * expGrowthFactor;
    const mgmt = inp.managementFeePercent * netEffectiveRevenue;
    const baseExp = util + rm + lab + ins + ga + mkt + turn + mgmt;
    const opexConting = inp.opexContingencyPercent * baseExp;
    const reTaxes = stabilizedTaxExpense;
    const capex = inp.capexReserves * totalUnits * expGrowthFactor;

    const totalExpenses = -(util + rm + lab + ins + ga + mkt + turn + mgmt + opexConting + reTaxes + capex);

    const noi = netEffectiveRevenue + totalExpenses;
    const groundLeaseRent = inp.groundLease ? noi * inp.groundLeaseRent : 0;
    const noiAfterGL = noi - groundLeaseRent;

    // Asset mgmt fee (typically for first 5 years)
    const assetMgmt = yr <= 5 ? inp.assetMgmtFee * noiAfterGL : 0;

    const netCFBeforeDS = noiAfterGL - assetMgmt;

    // Debt service on Senior Loan: INTEREST-ONLY on full balance (matches Excel)
    // The const loan does NOT amortize during the hold period — I/O through sale
    const ds = yr <= inp.resiSaleMonthPostTCO / 12
      ? totalSeniorLoan * inp.constLoanInterestRate
      : 0;

    const netCF = netCFBeforeDS - ds;

    const tcoYear = Math.ceil(TCOMonths / 12);

    annualCFs.push({
      year: tcoYear + yr,
      yearPostTCO: yr,
      label: `Year ${yr} Post-TCO`,
      grossPotentialResi: gprResi,
      grossPotentialParking: gprParking,
      grossPotentialMisc: gprMisc,
      grossPotentialRetail: gprRetail,
      vacancyLoss,
      resiConcessions,
      netEffectiveRevenue,
      utilities: -util,
      repairsMaintenance: -rm,
      labor: -lab,
      insurance: -ins,
      ga: -ga,
      marketing: -mkt,
      turnover: -turn,
      mgmtFee: -mgmt,
      opexContingency: -opexConting,
      reTaxes: -reTaxes,
      capex: -capex,
      totalExpenses,
      noi,
      groundLeaseRent: -groundLeaseRent,
      noiAfterGL,
      assetMgmtFee: -assetMgmt,
      netCFBeforeDS,
      debtService: -ds,
      netCF,
      resiOccupancy: resiOcc,
      retailOccupancy: retailOcc,
    });
  }

  // ── Sale Proceeds ─────────────────────────────────────────
  const saleYearIdx = Math.max(0, Math.round(inp.resiSaleMonthPostTCO / 12) - 1);
  const saleCF = annualCFs[saleYearIdx] || annualCFs[annualCFs.length - 1];
  const saleNOI = saleCF?.noi || 0;

  // Allocate NOI between resi and retail by revenue share
  const resiShare = grossPotentialResiBase / (grossPotentialResiBase + grossPotentialRetailBase);
  const retailShare_ = 1 - resiShare;

  const resiNOI_atSale = saleNOI * resiShare;
  const retailNOI_atSale = saleNOI * retailShare_;

  const resiCapRateAtSale = inp.resiCapRate + (saleYearIdx / 10) * 0.005;
  const retailCapRateAtSale = inp.retailCapRate + (saleYearIdx / 10) * 0.005;

  const resiGrossSaleProceeds = resiNOI_atSale / resiCapRateAtSale;
  const resiSaleCosts_ = resiGrossSaleProceeds * inp.resiSaleCostPct;
  const resiNetSaleProceeds = resiGrossSaleProceeds - resiSaleCosts_;

  const retailGrossSaleProceeds = retailNOI_atSale / retailCapRateAtSale;
  const retailSaleCosts_ = retailGrossSaleProceeds * inp.retailSaleCostPct;
  const retailNetSaleProceeds = retailGrossSaleProceeds - retailSaleCosts_;

  const saleProceeds: SaleProceeds = {
    resiGrossSaleProceeds,
    resiSaleCosts: resiSaleCosts_,
    resiNetSaleProceeds,
    retailGrossSaleProceeds,
    retailSaleCosts: retailSaleCosts_,
    retailNetSaleProceeds,
    totalNetSaleProceeds: resiNetSaleProceeds + retailNetSaleProceeds,
  };

  // ── Levered Cash Flows ────────────────────────────────────
  const totalProjectYears = Math.ceil(TCOMonths / 12) + Math.ceil(inp.resiSaleMonthPostTCO / 12);
  const leveredCFs: LeveredCF[] = [];

  // Construction phase equity
  const constPhaseYears = Math.ceil(TCOMonths / 12);
  for (let yr = 1; yr <= constPhaseYears; yr++) {
    const equityDeploy = -(equityRequired / constPhaseYears);
    leveredCFs.push({
      year: yr,
      label: `Year ${yr} (Construction)`,
      equityDeployment: equityDeploy,
      resiNOI: 0,
      retailNOI: 0,
      resiSaleProceeds: 0,
      retailSaleProceeds: 0,
      resiSaleCosts: 0,
      retailSaleCosts: 0,
      constLoanInterest: 0,
      constLoanPaydown: 0,
      permLoanProceeds: 0,
      permLoanDS: 0,
      permLoanPayoff: 0,
      totalLeveredCF: equityDeploy,
    });
  }

  // Operating + Sale phase
  const saleYear = constPhaseYears + Math.ceil(inp.resiSaleMonthPostTCO / 12);
  for (let yr = 1; yr <= Math.ceil(inp.resiSaleMonthPostTCO / 12); yr++) {
    const cf = annualCFs[yr - 1];
    const isLastYear = yr === Math.ceil(inp.resiSaleMonthPostTCO / 12);
    const resiNOI_ = cf ? cf.noi * resiShare : 0;
    const retailNOI__ = cf ? cf.noi * retailShare_ : 0;
    const constInterest = cf ? cf.debtService : 0;

    // Sale year: add net sale proceeds and repay full senior loan balance
    const totalLCF = (cf ? cf.netCF : 0) +
      (isLastYear ? saleProceeds.totalNetSaleProceeds - totalSeniorLoan : 0);

    leveredCFs.push({
      year: constPhaseYears + yr,
      label: `Year ${constPhaseYears + yr} (Post-TCO ${yr})`,
      equityDeployment: 0,
      resiNOI: resiNOI_,
      retailNOI: retailNOI__,
      resiSaleProceeds: isLastYear ? saleProceeds.resiGrossSaleProceeds : 0,
      retailSaleProceeds: isLastYear ? saleProceeds.retailGrossSaleProceeds : 0,
      resiSaleCosts: isLastYear ? -saleProceeds.resiSaleCosts : 0,
      retailSaleCosts: isLastYear ? -saleProceeds.retailSaleCosts : 0,
      constLoanInterest: constInterest,
      constLoanPaydown: isLastYear ? -totalSeniorLoan : 0,
      permLoanProceeds: 0,
      permLoanDS: 0,
      permLoanPayoff: 0,
      totalLeveredCF: totalLCF,
    });
  }

  // ── Returns ───────────────────────────────────────────────
  const cashflowsForIRR = leveredCFs.map(cf => cf.totalLeveredCF);

  // Stabilized NOI (Year 2 post-TCO - usually stabilized)
  const stabilizedNOI = annualCFs[1]?.noi || annualCFs[0]?.noi || 0;
  const stabilizedYieldOnCost = totalCosts > 0 ? stabilizedNOI / totalCosts : 0;

  const totalInflows = leveredCFs
    .filter(cf => cf.totalLeveredCF > 0)
    .reduce((s, cf) => s + cf.totalLeveredCF, 0);
  const totalOutflows = Math.abs(leveredCFs
    .filter(cf => cf.totalLeveredCF < 0)
    .reduce((s, cf) => s + cf.totalLeveredCF, 0));

  const netProfit = totalInflows - totalOutflows;
  const equityMultiple = totalOutflows > 0 ? totalInflows / totalOutflows : 0;
  const irrVal = cashflowsForIRR.length > 1 ? irr(cashflowsForIRR) : 0;

  const returns: Returns = {
    netProfit,
    equityMultiple,
    irr: irrVal,
    stabilizedYieldOnCost,
    totalCost: totalCosts,
    totalEquity: equityRequired,
  };

  // ── Promote ───────────────────────────────────────────────
  const gpEquity = equityRequired * inp.gpEquitySplit;
  const lpEquity = equityRequired * inp.lpEquitySplit;

  const gpCFs = cashflowsForIRR.map((cf, i) => {
    if (i < constPhaseYears) return cf * inp.gpEquitySplit;
    return cf * inp.gpEquitySplit; // simplified
  });
  const lpCFs = cashflowsForIRR.map((cf, i) => {
    if (i < constPhaseYears) return cf * inp.lpEquitySplit;
    return cf * inp.lpEquitySplit;
  });

  const gpTotalIn = gpCFs.filter(c => c > 0).reduce((s, c) => s + c, 0);
  const gpTotalOut = Math.abs(gpCFs.filter(c => c < 0).reduce((s, c) => s + c, 0));
  const gpProfit = gpTotalIn - gpTotalOut;
  const gpEM = gpTotalOut > 0 ? gpTotalIn / gpTotalOut : 0;
  const gpIRR = irr(gpCFs);

  const lpTotalIn = lpCFs.filter(c => c > 0).reduce((s, c) => s + c, 0);
  const lpTotalOut = Math.abs(lpCFs.filter(c => c < 0).reduce((s, c) => s + c, 0));
  const lpProfit = lpTotalIn - lpTotalOut;
  const lpEM = lpTotalOut > 0 ? lpTotalIn / lpTotalOut : 0;
  const lpIRR = irr(lpCFs);

  const promoteReturns: PromoteReturns = {
    gpProfit, gpEM, gpIRR, lpProfit, lpEM, lpIRR,
  };

  return {
    sizeMetrics,
    unitMix: unitMixRows,
    constructionCosts,
    closingCosts,
    taxCalc,
    financing,
    sourcesUses,
    annualCFs,
    saleProceeds,
    leveredCFs,
    returns,
    promoteReturns,
  };
}

// ── Formatters ────────────────────────────────────────────
export const fmt = {
  dollar: (v: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: decimals }).format(v),
  pct: (v: number, decimals = 1) => `${(v * 100).toFixed(decimals)}%`,
  num: (v: number, decimals = 0) =>
    new Intl.NumberFormat('en-US', { maximumFractionDigits: decimals }).format(v),
  kDollar: (v: number) => `$${(v / 1000).toFixed(0)}K`,
  mDollar: (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toFixed(0)}`;
  },
};
