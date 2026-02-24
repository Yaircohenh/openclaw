'use client';
import { ModelOutputs, ModelInputs, fmt } from '@/lib/model';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props { outputs: ModelOutputs; inputs: ModelInputs; }

const Row = ({ label, value, sub, bold, indent }: { label: string; value?: number; sub?: string; bold?: boolean; indent?: boolean }) => (
  <tr className={`border-b border-gray-50 ${bold ? 'font-bold bg-gray-50' : 'hover:bg-gray-50'}`}>
    <td className={`py-2 ${indent ? 'pl-6' : ''} ${bold ? '' : 'text-gray-700'}`}>{label}</td>
    <td className="text-right py-2">{value !== undefined ? fmt.mDollar(value) : ''}</td>
    <td className="text-right py-2 text-gray-500 text-xs">{sub}</td>
  </tr>
);

export default function ConstructionTab({ outputs, inputs }: Props) {
  const { constructionCosts, sizeMetrics, taxCalc, closingCosts } = outputs;
  const { totalGSF, totalNSF, totalUnits } = sizeMetrics;

  const psf = (v: number) => fmt.dollar(v / totalGSF, 2);
  const pnsf = (v: number) => fmt.dollar(v / totalNSF, 2);
  const punit = (v: number) => fmt.dollar(v / totalUnits, 0);

  const hardCostsChart = [
    { name: 'Apts', value: inputs.hardCostsApartments },
    { name: 'Podium', value: inputs.hardCostsPodium },
    { name: 'FF&E', value: inputs.ffAndE },
    { name: 'Contingency', value: constructionCosts.hardContingency },
  ];

  const softCostsChart = [
    { name: 'Arch/Eng', value: inputs.archEngineers },
    { name: 'Impact Fees', value: inputs.impactFees },
    { name: 'Permits', value: inputs.permitsExpediting },
    { name: 'Supervision', value: inputs.supervisionExpenses },
    { name: "Owner's Rep", value: inputs.ownersRep },
    { name: 'Retail LC+TI', value: constructionCosts.retailLC + constructionCosts.retailTI },
    { name: 'Closing', value: closingCosts.totalClosingCosts },
    { name: 'Contingency', value: constructionCosts.softContingency },
    { name: 'Dev Fee', value: constructionCosts.developerFee },
    { name: 'Cap Interest', value: constructionCosts.capInterest },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Cost', value: fmt.mDollar(constructionCosts.totalCosts), sub: `${psf(constructionCosts.totalCosts)}/GSF` },
          { label: 'Hard Costs', value: fmt.mDollar(constructionCosts.totalHardCosts), sub: `${psf(constructionCosts.totalHardCosts)}/GSF` },
          { label: 'Soft Costs', value: fmt.mDollar(constructionCosts.totalSoftCosts), sub: `${psf(constructionCosts.totalSoftCosts)}/GSF` },
          { label: 'Stabilized Tax', value: fmt.dollar(taxCalc.stabilizedTaxExpense, 0), sub: 'Annual property tax' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase">{c.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{c.value}</div>
            <div className="text-xs text-gray-400">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hard Costs Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Hard Costs</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2 text-gray-400">$/GSF</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Apartments" value={inputs.hardCostsApartments} sub={psf(inputs.hardCostsApartments)} />
              <Row label="Podium" value={inputs.hardCostsPodium} sub={psf(inputs.hardCostsPodium)} />
              <Row label="FF&E" value={inputs.ffAndE} sub={psf(inputs.ffAndE)} />
              <Row label={`Contingency (${fmt.pct(inputs.hardContingencyPct)})`} value={constructionCosts.hardContingency} sub={psf(constructionCosts.hardContingency)} />
              <Row label="TOTAL HARD COSTS" value={constructionCosts.totalHardCosts} sub={`${psf(constructionCosts.totalHardCosts)} | ${punit(constructionCosts.totalHardCosts)}/unit`} bold />
            </tbody>
          </table>

          <h3 className="font-bold text-gray-800 mt-6 mb-4">Land Costs</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Land Price" value={inputs.landPrice} sub={punit(inputs.landPrice)} />
              <Row label="TOTAL LAND" value={inputs.landPrice} sub={punit(inputs.landPrice)} bold />
            </tbody>
          </table>

          <h3 className="font-bold text-gray-800 mt-6 mb-4">Closing Costs</h3>
          <table className="w-full text-sm">
            <tbody>
              <Row label="Land Closing" value={closingCosts.landClosing} indent />
              <Row label="Construction Loan Closing" value={closingCosts.constLoanClosing} indent />
              <Row label="TOTAL CLOSING" value={closingCosts.totalClosingCosts} bold />
            </tbody>
          </table>
        </div>

        {/* Soft Costs Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Soft Costs</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-2">Item</th>
                <th className="text-right py-2">Total</th>
                <th className="text-right py-2 text-gray-400">$/GSF</th>
              </tr>
            </thead>
            <tbody>
              <Row label="Arch/Engineers" value={inputs.archEngineers} sub={psf(inputs.archEngineers)} indent />
              <Row label="Impact Fees" value={inputs.impactFees} sub={psf(inputs.impactFees)} indent />
              <Row label="Permits & Expediting" value={inputs.permitsExpediting} sub={psf(inputs.permitsExpediting)} indent />
              <Row label="Supervision" value={inputs.supervisionExpenses} sub={psf(inputs.supervisionExpenses)} indent />
              <Row label="Inspections & Testing" value={inputs.inspectionsTesting} sub={psf(inputs.inspectionsTesting)} indent />
              <Row label="Prof/Legal Fees" value={inputs.professionalLegal} sub={psf(inputs.professionalLegal)} indent />
              <Row label="Owner's Rep" value={inputs.ownersRep} sub={psf(inputs.ownersRep)} indent />
              <Row label="Audit & Reporting" value={inputs.auditReporting} sub={psf(inputs.auditReporting)} indent />
              <Row label="Marketing / Model Unit" value={inputs.marketingModelUnit} sub={psf(inputs.marketingModelUnit)} indent />
              <Row label="Insurance" value={inputs.constructionInsurance} sub={psf(inputs.constructionInsurance)} indent />
              <Row label="RE Taxes During Const." value={constructionCosts.reTaxesDuringConst} sub={psf(constructionCosts.reTaxesDuringConst)} indent />
              <Row label="Retail LC Commission" value={constructionCosts.retailLC} sub={psf(constructionCosts.retailLC)} indent />
              <Row label="Retail TI" value={constructionCosts.retailTI} sub={psf(constructionCosts.retailTI)} indent />
              <Row label="Working Capital" value={constructionCosts.workingCapital} sub={psf(constructionCosts.workingCapital)} indent />
              <Row label="Closing Costs" value={closingCosts.totalClosingCosts} sub={psf(closingCosts.totalClosingCosts)} indent />
              <Row label={`SC Contingency (${fmt.pct(inputs.softContingencyPct)})`} value={constructionCosts.softContingency} sub={psf(constructionCosts.softContingency)} indent />
              <Row label="Capitalized Interest" value={constructionCosts.capInterest} sub={psf(constructionCosts.capInterest)} indent />
              <Row label="Sub-Total (Before Dev Fee)" value={constructionCosts.totalSoftBeforeDevFee} sub={psf(constructionCosts.totalSoftBeforeDevFee)} />
              <Row label={`Developer Fee (${fmt.pct(inputs.developerFeePct)})`} value={constructionCosts.developerFee} sub={psf(constructionCosts.developerFee)} indent />
              <Row label="TOTAL SOFT COSTS" value={constructionCosts.totalSoftCosts} sub={`${psf(constructionCosts.totalSoftCosts)} | ${punit(constructionCosts.totalSoftCosts)}/unit`} bold />
            </tbody>
          </table>

          {/* Tax Section */}
          <h3 className="font-bold text-gray-800 mt-6 mb-3">RE Tax Calculation</h3>
          <div className="text-sm space-y-1.5 bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Cost (basis)</span>
              <span className="font-medium">{fmt.mDollar(constructionCosts.totalCosts)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Assessment % ({fmt.pct(inputs.assessmentPctOfCost)})</span>
              <span className="font-medium">{fmt.mDollar(taxCalc.assessedValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax Rate ({fmt.pct(inputs.taxRate, 4)})</span>
              <span className="font-medium">{fmt.pct(inputs.taxRate, 4)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-bold">
              <span>Annual Tax Expense</span>
              <span className="text-red-700">{fmt.dollar(taxCalc.stabilizedTaxExpense, 0)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Soft Cost Breakdown</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={softCostsChart} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v) => fmt.mDollar(v)} tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: number | undefined) => fmt.dollar(v ?? 0, 0)} />
            <Bar dataKey="value" fill="#7c3aed" name="Cost" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total Summary */}
      <div className="bg-gray-900 text-white rounded-xl p-5">
        <h3 className="font-bold mb-4">Total Project Cost Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Land', v: constructionCosts.landCosts },
            { label: 'Hard Costs', v: constructionCosts.totalHardCosts },
            { label: 'Soft Costs', v: constructionCosts.totalSoftCosts },
            { label: 'TOTAL', v: constructionCosts.totalCosts },
          ].map(c => (
            <div key={c.label} className="bg-gray-800 rounded-lg p-3">
              <div className="text-gray-400 text-xs">{c.label}</div>
              <div className="font-bold text-lg mt-1">{fmt.mDollar(c.v)}</div>
              <div className="text-gray-400 text-xs mt-0.5">{psf(c.v)}/GSF | {punit(c.v)}/unit</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
