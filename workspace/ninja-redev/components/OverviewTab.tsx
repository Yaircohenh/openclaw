'use client';
import { ModelOutputs, ModelInputs, fmt } from '@/lib/model';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import AIAnalysisPanel from '@/components/AIAnalysisPanel';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
const COST_COLORS = ['#1e40af', '#7c3aed', '#0f766e'];

interface Props { outputs: ModelOutputs; inputs: ModelInputs; }

const MetricCard = ({ label, value, sub, color = 'blue' }: { label: string; value: string; sub?: string; color?: string }) => {
  const colors: Record<string, string> = {
    blue: 'text-blue-700',
    green: 'text-green-700',
    purple: 'text-purple-700',
    orange: 'text-orange-600',
    red: 'text-red-600',
    teal: 'text-teal-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col gap-1">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold ${colors[color] || 'text-gray-900'}`}>{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}

    </div>
  );
};

export default function OverviewTab({ outputs, inputs }: Props) {
  const { returns, sourcesUses, annualCFs, sizeMetrics } = outputs;

  // Sources & Uses data
  const usesData = [
    { name: 'Land', value: sourcesUses.landAcquisition },
    { name: 'Hard Costs', value: sourcesUses.hardCosts },
    { name: 'Soft Costs', value: sourcesUses.softCosts },
    { name: 'Cap Interest', value: sourcesUses.dsGlReserve },
  ].filter(d => d.value > 0);

  const sourcesData = [
    { name: 'Equity', value: sourcesUses.equity },
    { name: 'Acq Loan', value: sourcesUses.acqLoan },
    { name: 'Const Loan', value: sourcesUses.constLoan },
    { name: 'Mezz', value: sourcesUses.mezzLoan },
  ].filter(d => d.value > 0);

  // NOI trend chart
  const noiData = annualCFs.slice(0, 8).map(cf => ({
    name: cf.label.replace('Year ', 'Yr ').replace(' Post-TCO', ''),
    NOI: Math.round(cf.noi),
    Revenue: Math.round(cf.netEffectiveRevenue),
    Expenses: Math.round(Math.abs(cf.totalExpenses)),
  }));

  // TCO date
  const tcoDate = new Date(inputs.modelStartDate);
  tcoDate.setMonth(tcoDate.getMonth() + inputs.preconstructionMonths + inputs.constructionMonths);
  const saleDate = new Date(tcoDate);
  saleDate.setMonth(saleDate.getMonth() + inputs.resiSaleMonthPostTCO);

  const CustomTooltipDollar = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded shadow-lg p-3 text-xs">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p) => (
            <p key={p.name} style={{ color: p.color }}>
              {p.name}: {fmt.mDollar(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Deal Header */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-xl p-6 text-white print-section">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold">{inputs.dealName}</h2>
            <p className="text-gray-300 text-sm mt-0.5">{inputs.address}</p>
            <p className="text-gray-300 text-sm">{inputs.cityStateZip}</p>
          </div>
          <div className="text-right text-sm text-gray-300 space-y-1">
            <div>{sizeMetrics.totalUnits} Units | {fmt.num(sizeMetrics.totalGSF)} GSF</div>
            <div>TCO: {tcoDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
            <div>Sale: {saleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* Key Returns */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 print-section">
        <MetricCard
          label="Net Profit"
          value={fmt.mDollar(returns.netProfit)}
          sub="Total levered"
          color="green"
        />
        <MetricCard
          label="Equity Multiple"
          value={`${returns.equityMultiple.toFixed(2)}x`}
          sub="MOIC"
          color="blue"
        />
        <MetricCard
          label="Project IRR"
          value={fmt.pct(returns.irr)}
          sub="Levered"
          color="purple"
        />
        <MetricCard
          label="Yield on Cost"
          value={fmt.pct(returns.stabilizedYieldOnCost)}
          sub="Stabilized"
          color="teal"
        />
        <MetricCard
          label="Total Cost"
          value={fmt.mDollar(returns.totalCost)}
          sub={`${fmt.dollar(returns.totalCost / sizeMetrics.totalUnits, 0)}/unit`}
          color="orange"
        />
        <MetricCard
          label="Total Equity"
          value={fmt.mDollar(returns.totalEquity)}
          sub={`${fmt.pct(returns.totalEquity / returns.totalCost)} of cost`}
          color="red"
        />
      </div>

      {/* Sources & Uses + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-section">
        {/* Sources & Uses Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Sources & Uses</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-1">Category</th>
                <th className="text-right py-1">Total</th>
                <th className="text-right py-1">%</th>
                <th className="text-right py-1">$/Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={4} className="pt-3 pb-1 text-xs font-bold text-gray-500 uppercase">Uses</td></tr>
              {[
                { label: 'Land Acquisition', v: sourcesUses.landAcquisition },
                { label: 'Hard Costs', v: sourcesUses.hardCosts },
                { label: 'Soft Costs', v: sourcesUses.softCosts },
                { label: 'DS/GL Reserve', v: sourcesUses.dsGlReserve },
              ].map(r => (
                <tr key={r.label} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700">{r.label}</td>
                  <td className="text-right">{fmt.mDollar(r.v)}</td>
                  <td className="text-right text-gray-500">{fmt.pct(r.v / sourcesUses.totalUses)}</td>
                  <td className="text-right text-gray-500">{fmt.dollar(r.v / sizeMetrics.totalUnits, 0)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="py-2">Total Uses</td>
                <td className="text-right">{fmt.mDollar(sourcesUses.totalUses)}</td>
                <td className="text-right">100%</td>
                <td className="text-right">{fmt.dollar(sourcesUses.totalUses / sizeMetrics.totalUnits, 0)}</td>
              </tr>
              <tr><td colSpan={4} className="pt-4 pb-1 text-xs font-bold text-gray-500 uppercase">Sources</td></tr>
              {[
                { label: 'Equity', v: sourcesUses.equity },
                { label: 'Acq Loan', v: sourcesUses.acqLoan },
                { label: 'Construction Loan', v: sourcesUses.constLoan },
                ...(sourcesUses.mezzLoan > 0 ? [{ label: 'Mezz Loan', v: sourcesUses.mezzLoan }] : []),
              ].map(r => (
                <tr key={r.label} className="border-b border-gray-50">
                  <td className="py-1.5 text-gray-700">{r.label}</td>
                  <td className="text-right">{fmt.mDollar(r.v)}</td>
                  <td className="text-right text-gray-500">{fmt.pct(r.v / sourcesUses.totalSources)}</td>
                  <td className="text-right text-gray-500">{fmt.dollar(r.v / sizeMetrics.totalUnits, 0)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold">
                <td className="py-2">Total Sources</td>
                <td className="text-right">{fmt.mDollar(sourcesUses.totalSources)}</td>
                <td className="text-right">100%</td>
                <td className="text-right">{fmt.dollar(sourcesUses.totalSources / sizeMetrics.totalUnits, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pie Chart */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-2">Cost Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={usesData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={11}>
                {usesData.map((_, i) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt.mDollar((v as number) ?? 0)} />
            </PieChart>
          </ResponsiveContainer>
          <h3 className="font-bold text-gray-800 mb-2 mt-2">Capital Stack</h3>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={[{ ...sourcesData.reduce((acc, d) => ({ ...acc, [d.name]: d.value }), {}) }]} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" hide />
              {sourcesData.map((d, i) => (
                <Bar key={d.name} dataKey={d.name} stackId="a" fill={COLORS[i]} label={false} />
              ))}
              <Tooltip formatter={(v) => fmt.mDollar((v as number) ?? 0)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NOI Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 print-section">
        <h3 className="font-bold text-gray-800 mb-4">Annual Revenue & NOI (Post-TCO)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={noiData} margin={{ left: 20, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltipDollar />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Revenue" fill="#93c5fd" name="Eff. Revenue" />
            <Bar dataKey="Expenses" fill="#fca5a5" name="Expenses" />
            <Bar dataKey="NOI" fill="#2563eb" name="NOI" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Project Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 print-section">
        <h3 className="font-bold text-gray-800 mb-4">Project Timeline</h3>
        <div className="flex items-center gap-0 overflow-x-auto">
          {[
            { label: 'Preconstruction', months: inputs.preconstructionMonths, color: 'bg-orange-400' },
            { label: 'Construction', months: inputs.constructionMonths, color: 'bg-blue-500' },
            { label: 'Lease-Up', months: 12, color: 'bg-purple-500' },
            { label: 'Operating', months: Math.max(0, inputs.resiSaleMonthPostTCO - 12), color: 'bg-teal-500' },
            { label: 'Sale', months: 1, color: 'bg-green-600' },
          ].map((phase, i) => {
            const total = inputs.preconstructionMonths + inputs.constructionMonths + inputs.resiSaleMonthPostTCO + 1;
            const widthPct = Math.max(6, (phase.months / total) * 100);
            return (
              <div
                key={i}
                className={`${phase.color} text-white text-xs font-medium py-3 px-2 flex flex-col items-center justify-center min-w-0 flex-shrink-0`}
                style={{ width: `${widthPct}%` }}
              >
                <span className="truncate">{phase.label}</span>
                <span className="opacity-75">{phase.months}mo</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1 px-1">
          <span>{inputs.modelStartDate instanceof Date ? inputs.modelStartDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : String(inputs.modelStartDate)}</span>
          <span className="text-center">TCO: {tcoDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          <span>{saleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── AI Deal Analysis ── */}
      <AIAnalysisPanel inputs={inputs} outputs={outputs} />

    </div>
  );
}
