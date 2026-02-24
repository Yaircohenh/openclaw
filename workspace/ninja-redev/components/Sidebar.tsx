'use client';
import { ModelInputs, fmt } from '@/lib/model';
import { ValidationResult, FIELD_REQUIREMENTS } from '@/lib/validation';

interface SidebarProps {
  inputs: ModelInputs;
  onChange: (key: keyof ModelInputs, value: unknown) => void;
  validation?: ValidationResult;
}

// ── Field definition ───────────────────────────────────────────────────────
type InputField = {
  label: string;
  key: keyof ModelInputs;
  type: 'number' | 'text' | 'pct' | 'bool';
  unit?: string;   // suffix label (e.g. "SF", "mo", "$/unit/yr")
  prefix?: string; // prefix symbol (e.g. "$")
  step?: number;
  min?: number;
};

type Section = {
  title: string;
  fields: InputField[];
};

const SECTIONS: Section[] = [
  {
    title: '🏗️ Deal Info',
    fields: [
      { label: 'Land Price',           key: 'landPrice',              type: 'number', prefix: '$', step: 50000 },
      { label: 'Preconstruction',      key: 'preconstructionMonths',  type: 'number', unit: 'mo',  step: 1 },
      { label: 'Construction',         key: 'constructionMonths',     type: 'number', unit: 'mo',  step: 1 },
    ],
  },
  {
    title: '📐 Building Size',
    fields: [
      { label: 'Retail',       key: 'retailGSF',             type: 'number', unit: 'SF',  step: 100 },
      { label: 'Resi',         key: 'residentialGSF',        type: 'number', unit: 'SF',  step: 1000 },
      { label: 'Parking',      key: 'parkingGSF',            type: 'number', unit: 'SF',  step: 1000 },
      { label: 'Amenity',      key: 'amenityGSF',            type: 'number', unit: 'SF',  step: 500 },
      { label: 'Efficiency',   key: 'residentialEfficiency', type: 'pct',    unit: '%',   step: 0.01 },
    ],
  },
  {
    title: '🏠 Market Rate Units',
    fields: [
      { label: 'Studio Count',   key: 'studioUnits', type: 'number', unit: 'units',   step: 1 },
      { label: 'Studio Avg',     key: 'studioAvgSF', type: 'number', unit: 'SF/unit', step: 10 },
      { label: '1BR Count',      key: 'br1Units',    type: 'number', unit: 'units',   step: 1 },
      { label: '1BR Avg',        key: 'br1AvgSF',    type: 'number', unit: 'SF/unit', step: 10 },
      { label: '2BR Count',      key: 'br2Units',    type: 'number', unit: 'units',   step: 1 },
      { label: '2BR Avg',        key: 'br2AvgSF',    type: 'number', unit: 'SF/unit', step: 10 },
      { label: '3BR Count',      key: 'br3Units',    type: 'number', unit: 'units',   step: 1 },
      { label: '3BR Avg',        key: 'br3AvgSF',    type: 'number', unit: 'SF/unit', step: 10 },
      { label: 'Parking Stalls', key: 'parkingSpaces', type: 'number', unit: 'stalls', step: 1 },
    ],
  },
  {
    title: '🏠 AH Units (60% AMI)',
    fields: [
      { label: '1BR AH Count', key: 'ahBr1Units', type: 'number', unit: 'units',   step: 1 },
      { label: '1BR AH Avg',   key: 'ahBr1AvgSF', type: 'number', unit: 'SF/unit', step: 10 },
      { label: '2BR AH Count', key: 'ahBr2Units', type: 'number', unit: 'units',   step: 1 },
      { label: '2BR AH Avg',   key: 'ahBr2AvgSF', type: 'number', unit: 'SF/unit', step: 10 },
    ],
  },
  {
    title: '💰 Rent Assumptions',
    fields: [
      { label: 'Resi Rent',    key: 'resiRentPerNSF',       type: 'number', unit: '$/NSF/mo',   step: 0.05, min: 0 },
      { label: 'Retail Rent',  key: 'retailRentPerNSF',     type: 'number', unit: '$/NSF/mo',   step: 0.05, min: 0 },
      { label: 'Parking',      key: 'parkingRentPerSpace',  type: 'number', unit: '$/stall/mo', step: 10 },
      { label: 'Misc Income',  key: 'miscIncomePerUnit',    type: 'number', unit: '$/unit/mo',  step: 10 },
      { label: 'Rent Growth',  key: 'rentGrowth',           type: 'pct',    unit: '%/yr',       step: 0.005 },
    ],
  },
  {
    title: '📈 Lease-Up',
    fields: [
      { label: 'Resi Occ at TCO',  key: 'resiOccAtTCO',        type: 'pct', unit: '%',   step: 0.05 },
      { label: 'Resi Ramp',        key: 'resiLeaseUpPerMonth',  type: 'pct', unit: '%/mo', step: 0.01 },
      { label: 'Resi Stabilized',  key: 'resiStabilizedOcc',   type: 'pct', unit: '%',   step: 0.01 },
      { label: 'Retail Occ at TCO',key: 'retailOccAtTCO',      type: 'pct', unit: '%',   step: 0.05 },
      { label: 'Retail Ramp',      key: 'retailLeaseUpPerMonth',type: 'pct', unit: '%/mo', step: 0.01 },
    ],
  },
  // NOTE: Hard Costs rendered separately below (toggle section)
  {
    title: '📋 Soft Costs',
    fields: [
      { label: 'Arch/Engineers',   key: 'archEngineers',        type: 'number', prefix: '$', step: 25000 },
      { label: 'Impact Fees',      key: 'impactFees',           type: 'number', prefix: '$', step: 10000 },
      { label: 'Permits & Exp.',   key: 'permitsExpediting',    type: 'number', prefix: '$', step: 10000 },
      { label: 'Supervision',      key: 'supervisionExpenses',  type: 'number', prefix: '$', step: 10000 },
      { label: "Owner's Rep",      key: 'ownersRep',            type: 'number', prefix: '$', step: 10000 },
      { label: 'Developer Fee',    key: 'developerFeePct',      type: 'pct',    unit: '% of HC+SC', step: 0.005 },
      { label: 'SC Contingency',   key: 'softContingencyPct',   type: 'pct',    unit: '%',  step: 0.01 },
    ],
  },
  {
    title: '🏦 Financing',
    fields: [
      { label: 'Acq LTC (land)',   key: 'acqLoanLTC',           type: 'pct', unit: '% of land', step: 0.05 },
      { label: 'Acq Rate',         key: 'acqLoanInterestRate',  type: 'pct', unit: '%/yr',  step: 0.0025 },
      { label: 'Senior LTC (TDC)', key: 'constLoanLTC',         type: 'pct', unit: '% of TDC', step: 0.05 },
      { label: 'Senior Rate (I/O)',key: 'constLoanInterestRate',type: 'pct', unit: '%/yr',  step: 0.0025 },
    ],
  },
  {
    title: '📊 Operating Expenses',
    fields: [
      { label: 'Utilities',        key: 'utilities',            type: 'number', prefix: '$', unit: '/unit/yr', step: 50 },
      { label: 'R&M',              key: 'repairsMaintenance',   type: 'number', prefix: '$', unit: '/unit/yr', step: 50 },
      { label: 'Labor',            key: 'labor',                type: 'number', prefix: '$', unit: '/unit/yr', step: 50 },
      { label: 'Insurance',        key: 'insurance',            type: 'number', prefix: '$', unit: '/unit/yr', step: 25 },
      { label: 'G&A',              key: 'gaServiceContracts',   type: 'number', prefix: '$', unit: '/unit/yr', step: 25 },
      { label: 'Marketing',        key: 'marketingLeasing',     type: 'number', prefix: '$', unit: '/unit/yr', step: 25 },
      { label: 'CapEx Reserve',    key: 'capexReserves',        type: 'number', prefix: '$', unit: '/unit/yr', step: 25 },
      { label: 'Mgmt Fee',         key: 'managementFeePercent', type: 'pct',    unit: '% of GI', step: 0.005 },
      { label: 'Opex Contingency', key: 'opexContingencyPercent', type: 'pct', unit: '%',   step: 0.005 },
      { label: 'Expense Growth',   key: 'annualExpenseIncrease',type: 'pct',    unit: '%/yr', step: 0.005 },
    ],
  },
  {
    title: '🏛️ RE Taxes',
    fields: [
      { label: 'Assessment',       key: 'assessmentPctOfCost',  type: 'pct', unit: '% of TDC', step: 0.05 },
      { label: 'Tax Rate',         key: 'taxRate',              type: 'pct', unit: '% assessed', step: 0.0005 },
    ],
  },
  {
    title: '🏷️ Sale Assumptions',
    fields: [
      { label: 'Sale Month Post-TCO', key: 'resiSaleMonthPostTCO', type: 'number', unit: 'mo', step: 12 },
      { label: 'Resi Cap Rate',       key: 'resiCapRate',          type: 'pct',    unit: '%',  step: 0.005 },
      { label: 'Resi Sale Cost',      key: 'resiSaleCostPct',      type: 'pct',    unit: '%',  step: 0.005 },
      { label: 'Retail Cap Rate',     key: 'retailCapRate',        type: 'pct',    unit: '%',  step: 0.005 },
      { label: 'Retail Sale Cost',    key: 'retailSaleCostPct',    type: 'pct',    unit: '%',  step: 0.005 },
    ],
  },
  {
    title: '🤝 Equity Structure',
    fields: [
      { label: 'GP Equity',   key: 'gpEquitySplit', type: 'pct', unit: '%', step: 0.05 },
      { label: 'Pref Return', key: 'prefReturn',    type: 'pct', unit: '%/yr', step: 0.01 },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function formatValue(val: unknown, type: string): string {
  if (type === 'pct') return ((val as number) * 100).toFixed(2);
  if (type === 'number' || type === 'text') return String(val ?? '');
  return String(val ?? '');
}

function parseValue(raw: string, type: string, currentVal: unknown): unknown {
  if (type === 'pct') { const n = parseFloat(raw); return isNaN(n) ? currentVal : n / 100; }
  if (type === 'number') { const n = parseFloat(raw.replace(/,/g, '')); return isNaN(n) ? currentVal : n; }
  if (type === 'bool') return raw === 'true';
  return raw;
}

function fmtSF(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toFixed(0);
}

const REQUIRED_KEYS = new Set(FIELD_REQUIREMENTS.filter(r => r.required).map(r => r.field));

// ── Hard Costs Toggle Section ──────────────────────────────────────────────
function HardCostsSection({
  inputs, onChange, errorFields, warnFields, validation,
}: {
  inputs: ModelInputs;
  onChange: (key: keyof ModelInputs, value: unknown) => void;
  errorFields: Set<string>;
  warnFields: Set<string>;
  validation?: ValidationResult;
}) {
  const mode = inputs.hardCostMode ?? 'lump';
  const resiGSF   = Math.max(1, inputs.residentialGSF);
  const nonResiGSF = Math.max(1, inputs.parkingGSF + inputs.amenityGSF + inputs.retailGSF);
  const totalGSF   = Math.max(1, resiGSF + nonResiGSF);

  // Effective lump sums
  const aptsLump   = mode === 'psf' ? inputs.hardCostsApartmentsPSF * resiGSF    : inputs.hardCostsApartments;
  const podiumLump = mode === 'psf' ? inputs.hardCostsPodiumPSF     * nonResiGSF  : inputs.hardCostsPodium;
  // Effective $/SF
  const aptsPSF    = mode === 'psf' ? inputs.hardCostsApartmentsPSF : (inputs.hardCostsApartments / resiGSF);
  const podiumPSF  = mode === 'psf' ? inputs.hardCostsPodiumPSF     : (inputs.hardCostsPodium / nonResiGSF);
  const ffePSF     = inputs.ffAndE / totalGSF;

  const hasAptsErr = errorFields.has('hardCostsApartments') || errorFields.has('hardCostsApartmentsPSF');
  const hasContErr = errorFields.has('hardContingencyPct');

  const sectionErrors = (hasAptsErr ? 1 : 0) + (hasContErr ? 1 : 0);

  function numInput(
    key: keyof ModelInputs,
    value: number,
    step: number,
    onChangeFn?: (v: number) => void,
  ) {
    const hasErr = errorFields.has(key as string);
    const hasWarn = !hasErr && warnFields.has(key as string);
    return (
      <input
        type="number"
        value={value.toFixed(key.toString().includes('PSF') || key.toString().includes('Pct') ? 1 : 0)}
        step={step}
        min={0}
        onChange={e => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) {
            if (onChangeFn) onChangeFn(n);
            else onChange(key, n);
          }
        }}
        className={`w-24 px-2 py-0.5 text-right text-xs border rounded focus:outline-none focus:ring-1 ${
          hasErr  ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-400'
          : hasWarn ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
          : 'border-gray-200 bg-white focus:ring-blue-400'
        }`}
      />
    );
  }

  return (
    <div>
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-3 flex items-center gap-1.5">
        🔨 Hard Costs
        {sectionErrors > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none" style={{fontSize:'9px'}}>
            {sectionErrors}
          </span>
        )}
        {/* Toggle */}
        <div className="ml-auto flex rounded overflow-hidden border border-gray-200 text-xs">
          <button
            onClick={() => onChange('hardCostMode', 'lump')}
            className={`px-2 py-0.5 leading-tight transition-colors ${mode === 'lump' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >Lump $</button>
          <button
            onClick={() => onChange('hardCostMode', 'psf')}
            className={`px-2 py-0.5 leading-tight transition-colors ${mode === 'psf' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
          >$/SF</button>
        </div>
      </h3>

      <div className="space-y-1">
        {/* HC Apartments */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label className={`text-xs flex-1 leading-tight ${hasAptsErr ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
              HC Apartments
              <span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="flex items-center gap-0.5">
              {mode === 'lump' ? (
                <>
                  <span className="text-xs text-gray-400">$</span>
                  {numInput('hardCostsApartments', inputs.hardCostsApartments, 100000)}
                </>
              ) : (
                <>
                  {numInput('hardCostsApartmentsPSF', aptsPSF, 5,
                    v => onChange('hardCostsApartmentsPSF', v)
                  )}
                  <span className="text-xs text-gray-400 whitespace-nowrap">$/resi SF</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right text-gray-400" style={{fontSize:'10px'}}>
            {mode === 'lump'
              ? `→ $${aptsPSF.toFixed(0)}/resi SF (${fmtSF(resiGSF)} SF)`
              : `→ ${fmt.dollar(aptsLump, 0)} total`}
          </div>
        </div>

        {/* HC Podium / Parking / Retail */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label className="text-xs flex-1 leading-tight text-gray-600">HC Podium/Pkg</label>
            <div className="flex items-center gap-0.5">
              {mode === 'lump' ? (
                <>
                  <span className="text-xs text-gray-400">$</span>
                  {numInput('hardCostsPodium', inputs.hardCostsPodium, 100000)}
                </>
              ) : (
                <>
                  {numInput('hardCostsPodiumPSF', podiumPSF, 5,
                    v => onChange('hardCostsPodiumPSF', v)
                  )}
                  <span className="text-xs text-gray-400 whitespace-nowrap">$/non-resi SF</span>
                </>
              )}
            </div>
          </div>
          <div className="text-right text-gray-400" style={{fontSize:'10px'}}>
            {mode === 'lump'
              ? `→ $${podiumPSF.toFixed(0)}/SF (${fmtSF(nonResiGSF)} SF pkg+retail+amenity)`
              : `→ ${fmt.dollar(podiumLump, 0)} total`}
          </div>
        </div>

        {/* FF&E — always lump */}
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <label className="text-xs flex-1 leading-tight text-gray-600">FF&amp;E</label>
            <div className="flex items-center gap-0.5">
              <span className="text-xs text-gray-400">$</span>
              {numInput('ffAndE', inputs.ffAndE, 10000)}
            </div>
          </div>
          <div className="text-right text-gray-400" style={{fontSize:'10px'}}>
            → ${ffePSF.toFixed(1)}/total SF ({fmtSF(totalGSF)} SF)
          </div>
        </div>

        {/* HC Contingency */}
        <div className="flex items-center gap-2">
          <label className={`text-xs flex-1 leading-tight ${hasContErr ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            HC Contingency
            <span className="text-red-400 ml-0.5">*</span>
          </label>
          <div className="flex items-center gap-0.5">
            <input
              type="number"
              value={((inputs.hardContingencyPct ?? 0) * 100).toFixed(2)}
              step={1}
              min={0}
              max={30}
              onChange={e => {
                const n = parseFloat(e.target.value);
                if (!isNaN(n)) onChange('hardContingencyPct', n / 100);
              }}
              className={`w-24 px-2 py-0.5 text-right text-xs border rounded focus:outline-none focus:ring-1 ${
                hasContErr ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-400'
                : 'border-gray-200 bg-white focus:ring-blue-400'
              }`}
            />
            <span className="text-xs text-gray-400">%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────
export default function Sidebar({ inputs, onChange, validation }: SidebarProps) {
  const errorFields = new Set(validation?.errors.map(e => e.field) ?? []);
  const warnFields  = new Set(validation?.warnings.map(w => w.field) ?? []);

  function renderField(field: InputField) {
    const val = inputs[field.key];
    const displayVal = formatValue(val, field.type);
    const hasError = errorFields.has(field.key);
    const hasWarn  = !hasError && warnFields.has(field.key);
    const isRequired = REQUIRED_KEYS.has(field.key);
    const errMsg  = validation?.errors.find(e => e.field === field.key)?.message;
    const warnMsg = !hasError ? validation?.warnings.find(w => w.field === field.key)?.message : undefined;

    return (
      <div key={field.key} className="flex items-center gap-2 group relative">
        <label className={`text-xs flex-1 leading-tight ${
          hasError ? 'text-red-600 font-medium' : hasWarn ? 'text-amber-600' : 'text-gray-600'
        }`}>
          {field.label}
          {isRequired && <span className="text-red-400 ml-0.5">*</span>}
        </label>

        <div className="flex items-center gap-0.5 relative">
          {field.prefix && <span className="text-xs text-gray-400">{field.prefix}</span>}
          <input
            type="number"
            value={displayVal}
            step={field.step}
            min={field.min}
            onChange={e => onChange(field.key, parseValue(e.target.value, field.type, val))}
            className={`w-24 px-2 py-0.5 text-right text-xs border rounded focus:outline-none focus:ring-1 ${
              hasError
                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-400'
                : hasWarn
                ? 'border-amber-300 bg-amber-50 focus:ring-amber-400'
                : 'border-gray-200 bg-white focus:ring-blue-400'
            }`}
          />
          {field.unit && (
            <span className="text-xs text-gray-400 whitespace-nowrap ml-0.5">{field.unit}</span>
          )}
          {hasError && <span className="text-red-500 text-xs">⛔</span>}
          {hasWarn  && <span className="text-amber-500 text-xs">⚠</span>}
        </div>

        {(errMsg || warnMsg) && (
          <div className="absolute right-0 top-full mt-1 z-30 pointer-events-none hidden group-hover:block">
            <div className={`text-xs px-2 py-1 rounded shadow-lg max-w-52 whitespace-normal ${
              hasError ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
            }`}>
              {errMsg || warnMsg}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sidebar no-print">
      <div className="px-3 py-2 space-y-4">
        {SECTIONS.map((section) => {
          const sectionErrors = section.fields.filter(f => errorFields.has(f.key)).length;
          return (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-3 flex items-center gap-1.5">
                {section.title}
                {sectionErrors > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none" style={{fontSize:'9px'}}>
                    {sectionErrors}
                  </span>
                )}
              </h3>
              <div className="space-y-1">
                {section.fields.map(f => renderField(f))}
              </div>

              {/* Insert Hard Costs section after Lease-Up */}
              {section.title === '📈 Lease-Up' && (
                <div className="mt-3">
                  <HardCostsSection
                    inputs={inputs}
                    onChange={onChange}
                    errorFields={errorFields}
                    warnFields={warnFields}
                    validation={validation}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
