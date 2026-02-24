'use client';
import { ModelOutputs, ModelInputs, fmt } from '@/lib/model';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

interface Props { outputs: ModelOutputs; inputs: ModelInputs; }

export default function ReturnsTab({ outputs, inputs }: Props) {
  const { returns, promoteReturns, leveredCFs, saleProceeds, sizeMetrics } = outputs;

  const leveredChart = leveredCFs.map(cf => ({
    name: `Yr${cf.year}`,
    CF: Math.round(cf.totalLeveredCF),
    label: cf.label,
  }));

  const ReturnCard = ({ label, gp, lp, overall }: { label: string; gp: string; lp: string; overall: string }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs font-bold text-gray-500 uppercase mb-3">{label}</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-gray-400">Overall</div>
          <div className="font-bold text-gray-900">{overall}</div>
        </div>
        <div className="border-l border-gray-200">
          <div className="text-xs text-blue-400">GP ({fmt.pct(inputs.gpEquitySplit)})</div>
          <div className="font-bold text-blue-700">{gp}</div>
        </div>
        <div className="border-l border-gray-200">
          <div className="text-xs text-purple-400">LP ({fmt.pct(inputs.lpEquitySplit)})</div>
          <div className="font-bold text-purple-700">{lp}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Returns Banner */}
      <div className="bg-gradient-to-r from-green-900 to-teal-900 rounded-xl p-6 text-white">
        <h2 className="font-bold text-lg mb-4">Project Returns Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Net Profit', value: fmt.mDollar(returns.netProfit) },
            { label: 'Equity Multiple', value: `${returns.equityMultiple.toFixed(2)}x` },
            { label: 'IRR', value: fmt.pct(returns.irr) },
            { label: 'Yield on Cost', value: fmt.pct(returns.stabilizedYieldOnCost) },
          ].map(c => (
            <div key={c.label} className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-gray-300 text-xs uppercase">{c.label}</div>
              <div className="text-2xl font-bold mt-1">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* GP/LP Returns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReturnCard
          label="Net Profit"
          overall={fmt.mDollar(returns.netProfit)}
          gp={fmt.mDollar(promoteReturns.gpProfit)}
          lp={fmt.mDollar(promoteReturns.lpProfit)}
        />
        <ReturnCard
          label="Equity Multiple"
          overall={`${returns.equityMultiple.toFixed(2)}x`}
          gp={`${promoteReturns.gpEM.toFixed(2)}x`}
          lp={`${promoteReturns.lpEM.toFixed(2)}x`}
        />
        <ReturnCard
          label="IRR"
          overall={fmt.pct(returns.irr)}
          gp={fmt.pct(promoteReturns.gpIRR)}
          lp={fmt.pct(promoteReturns.lpIRR)}
        />
      </div>

      {/* Equity Structure */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Equity Waterfall Structure</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'GP Equity Split', value: fmt.pct(inputs.gpEquitySplit) },
            { label: 'LP Equity Split', value: fmt.pct(inputs.lpEquitySplit) },
            { label: 'Preferred Return', value: fmt.pct(inputs.prefReturn) },
            { label: 'GP Carry (Tier 2)', value: fmt.pct(inputs.tier2Split) },
          ].map(c => (
            <div key={c.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500">{c.label}</div>
              <div className="font-bold text-lg mt-1">{c.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {[
            { label: 'Total Equity', value: fmt.mDollar(returns.totalEquity) },
            { label: 'GP Equity', value: fmt.mDollar(returns.totalEquity * inputs.gpEquitySplit) },
            { label: 'LP Equity', value: fmt.mDollar(returns.totalEquity * inputs.lpEquitySplit) },
          ].map(c => (
            <div key={c.label} className="bg-blue-50 rounded-lg p-3">
              <div className="text-xs text-blue-600">{c.label}</div>
              <div className="font-bold text-blue-900 mt-1">{c.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sale Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Sale Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Residential</h4>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'Cap Rate at Sale', value: fmt.pct(inputs.resiCapRate) },
                  { label: 'Gross Sale Proceeds', value: fmt.mDollar(saleProceeds.resiGrossSaleProceeds) },
                  { label: 'Sale Costs', value: `(${fmt.mDollar(saleProceeds.resiSaleCosts)})` },
                  { label: 'Net Sale Proceeds', value: fmt.mDollar(saleProceeds.resiNetSaleProceeds) },
                ].map(r => (
                  <tr key={r.label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{r.label}</td>
                    <td className="text-right font-medium">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Retail</h4>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'Cap Rate at Sale', value: fmt.pct(inputs.retailCapRate) },
                  { label: 'Gross Sale Proceeds', value: fmt.mDollar(saleProceeds.retailGrossSaleProceeds) },
                  { label: 'Sale Costs', value: `(${fmt.mDollar(saleProceeds.retailSaleCosts)})` },
                  { label: 'Net Sale Proceeds', value: fmt.mDollar(saleProceeds.retailNetSaleProceeds) },
                ].map(r => (
                  <tr key={r.label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-600">{r.label}</td>
                    <td className="text-right font-medium">{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 bg-green-50 rounded-lg p-3 flex justify-between items-center">
          <span className="font-bold text-green-900">Total Net Sale Proceeds</span>
          <span className="font-bold text-green-900 text-xl">{fmt.mDollar(saleProceeds.totalNetSaleProceeds)}</span>
        </div>
        <div className="mt-2 text-xs text-gray-500 text-right">
          Sale at Month {inputs.resiSaleMonthPostTCO} Post-TCO | {fmt.dollar(saleProceeds.totalNetSaleProceeds / sizeMetrics.totalUnits, 0)}/unit
        </div>
      </div>

      {/* Levered Cash Flow Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Levered Cash Flow by Year</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={leveredChart} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt.mDollar(v)} />
            <Tooltip
              formatter={(v) => fmt.dollar((v as number) ?? 0, 0)}
              labelFormatter={(l, p) => p?.[0]?.payload?.label || l}
            />
            <ReferenceLine y={0} stroke="#666" />
            <Bar dataKey="CF" name="Levered CF" fill="#2563eb"
              label={false}
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Levered CF Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Levered Cash Flow Detail</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Year</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Phase</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Equity Deployed</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">NOI</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Sale Proceeds</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600">Loan Paydown</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-600 bg-gray-200">Total Levered CF</th>
              </tr>
            </thead>
            <tbody>
              {leveredCFs.map((cf, i) => (
                <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 ${cf.totalLeveredCF >= 0 ? '' : 'bg-red-50/30'}`}>
                  <td className="py-2 px-3 font-medium">{cf.year}</td>
                  <td className="py-2 px-3 text-gray-600 text-xs">{cf.label.replace(`Year ${cf.year} `, '')}</td>
                  <td className="text-right py-2 px-3 text-red-600">
                    {cf.equityDeployment < 0 ? `(${fmt.mDollar(Math.abs(cf.equityDeployment))})` : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-blue-700">
                    {cf.resiNOI + cf.retailNOI !== 0 ? fmt.mDollar(cf.resiNOI + cf.retailNOI) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-green-700">
                    {cf.resiSaleProceeds + cf.retailSaleProceeds > 0 ? fmt.mDollar(cf.resiSaleProceeds + cf.retailSaleProceeds) : '-'}
                  </td>
                  <td className="text-right py-2 px-3 text-red-600">
                    {cf.constLoanPaydown < 0 ? `(${fmt.mDollar(Math.abs(cf.constLoanPaydown))})` : '-'}
                  </td>
                  <td className={`text-right py-2 px-3 font-bold bg-gray-50 ${cf.totalLeveredCF >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {fmt.mDollar(cf.totalLeveredCF)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
