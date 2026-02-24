'use client';
import { ModelOutputs, ModelInputs, fmt } from '@/lib/model';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props { outputs: ModelOutputs; inputs: ModelInputs; }

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#0891b2', '#dc2626'];

export default function UnitMixTab({ outputs, inputs }: Props) {
  const { unitMix, sizeMetrics } = outputs;

  const totalMthIncome = unitMix.reduce((s, r) => s + r.monthlyIncome, 0);
  const totalAnnIncome = totalMthIncome * 12;
  const totalUnits = unitMix.reduce((s, r) => s + r.units, 0);
  const totalSF = unitMix.reduce((s, r) => s + r.totalSF, 0);
  const avgRent = totalUnits > 0 ? totalMthIncome / totalUnits : 0;
  const avgSF = totalUnits > 0 ? totalSF / totalUnits : 0;
  const avgRentPSF = avgSF > 0 ? avgRent / avgSF : 0;

  // Retail
  const retailMthIncome = inputs.retailRentPerNSF * inputs.retailGSF;
  const retailAnnIncome = retailMthIncome * 12;
  const miscMthIncome = inputs.miscIncomePerUnit * sizeMetrics.totalUnits;
  const parkingMthIncome = inputs.parkingRentPerSpace * inputs.parkingSpaces;

  const incomeChartData = unitMix.map(r => ({
    type: r.type,
    Monthly: r.monthlyIncome,
    Annual: r.yearlyIncome,
  }));

  const pieData = unitMix.map(r => ({ name: r.type, value: r.units }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Units', value: fmt.num(sizeMetrics.totalUnits), sub: `${sizeMetrics.marketUnits} market + ${sizeMetrics.ahUnits} AH` },
          { label: 'Avg Unit Size', value: `${fmt.num(avgSF, 0)} SF`, sub: 'Weighted average' },
          { label: 'Gross Annual Income', value: fmt.mDollar(totalAnnIncome), sub: 'Residential only' },
          { label: 'Avg Rent', value: fmt.dollar(avgRent, 0), sub: `${fmt.num(avgRentPSF, 2)} $/SF/mo` },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wider">{card.label}</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{card.value}</div>
            <div className="text-xs text-gray-400">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unit Mix Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Unit Mix Detail</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-2">Type</th>
                <th className="text-right py-2">Units</th>
                <th className="text-right py-2">%</th>
                <th className="text-right py-2">Avg SF</th>
                <th className="text-right py-2">Avg Rent</th>
                <th className="text-right py-2">$/SF</th>
                <th className="text-right py-2">Mo. Inc.</th>
              </tr>
            </thead>
            <tbody>
              {unitMix.map((row, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 font-medium">{row.type}</td>
                  <td className="text-right">{row.units}</td>
                  <td className="text-right text-gray-500">{fmt.pct(row.pct)}</td>
                  <td className="text-right">{fmt.num(row.avgSF, 0)}</td>
                  <td className="text-right text-blue-700 font-medium">{fmt.dollar(row.avgRent, 0)}</td>
                  <td className="text-right text-gray-500">{row.rentPerSF.toFixed(2)}</td>
                  <td className="text-right text-green-700">{fmt.dollar(row.monthlyIncome, 0)}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <td className="py-2">Total / Avg</td>
                <td className="text-right">{totalUnits}</td>
                <td className="text-right">100%</td>
                <td className="text-right">{fmt.num(avgSF, 0)}</td>
                <td className="text-right text-blue-700">{fmt.dollar(avgRent, 0)}</td>
                <td className="text-right">{avgRentPSF.toFixed(2)}</td>
                <td className="text-right text-green-700">{fmt.dollar(totalMthIncome, 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Unit Mix Pie + Income Breakdown */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">Unit Distribution</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" label={({ name, value }) => `${name} (${value})`} fontSize={10}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Income Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-3">Gross Income Summary</h3>
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: 'Residential', mth: totalMthIncome, ann: totalAnnIncome },
                  { label: 'Retail', mth: retailMthIncome, ann: retailAnnIncome },
                  { label: 'Misc Income', mth: miscMthIncome, ann: miscMthIncome * 12 },
                  { label: 'Parking', mth: parkingMthIncome, ann: parkingMthIncome * 12 },
                ].map(r => (
                  <tr key={r.label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-700">{r.label}</td>
                    <td className="text-right">{fmt.dollar(r.mth, 0)}/mo</td>
                    <td className="text-right font-medium text-green-700">{fmt.mDollar(r.ann)}/yr</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                  <td className="py-2">Total Gross</td>
                  <td className="text-right">{fmt.dollar(totalMthIncome + retailMthIncome + miscMthIncome + parkingMthIncome, 0)}/mo</td>
                  <td className="text-right text-green-700">{fmt.mDollar((totalMthIncome + retailMthIncome + miscMthIncome + parkingMthIncome) * 12)}/yr</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Monthly Income Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Monthly Income by Unit Type</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={incomeChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt.kDollar(v)} />
            <Tooltip formatter={(v) => fmt.dollar((v as number) ?? 0, 0)} />
            <Bar dataKey="Monthly" fill="#2563eb" name="Monthly Income" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AFF Housing Note */}
      {sizeMetrics.ahUnits > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
          <p className="font-bold text-blue-800 mb-1">🏠 Affordable Housing (60% AMI)</p>
          <p className="text-blue-700">
            {sizeMetrics.ahUnits} units ({fmt.pct(sizeMetrics.ahUnits / sizeMetrics.totalUnits)} of total) are restricted at 60% AMI rents.
            Current AH rents: 1BR at $1,244/mo, 2BR at $1,450/mo vs. market {fmt.dollar(inputs.br1AvgSF * inputs.resiRentPerNSF, 0)} / {fmt.dollar(inputs.br2AvgSF * inputs.resiRentPerNSF, 0)}.
            Discount from market: ~{fmt.pct(1 - 1244 / (inputs.br1AvgSF * inputs.resiRentPerNSF))}.
          </p>
        </div>
      )}
    </div>
  );
}
