'use client';
import { ModelOutputs, ModelInputs, fmt } from '@/lib/model';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props { outputs: ModelOutputs; inputs: ModelInputs; }

export default function ProFormaTab({ outputs, inputs }: Props) {
  const { annualCFs, sizeMetrics } = outputs;
  const { totalUnits } = sizeMetrics;

  const noiChart = annualCFs.map(cf => ({
    name: `Yr${cf.yearPostTCO}`,
    NOI: Math.round(cf.noi),
    Revenue: Math.round(cf.netEffectiveRevenue),
    Expenses: Math.round(Math.abs(cf.totalExpenses)),
  }));

  const occChart = annualCFs.map(cf => ({
    name: `Yr${cf.yearPostTCO}`,
    Resi: Math.round(cf.resiOccupancy * 100),
    Retail: Math.round(cf.retailOccupancy * 100),
  }));

  const formatDollar = (v: number) => v !== 0 ? fmt.dollar(Math.abs(v), 0) : '-';

  return (
    <div className="space-y-6">
      {/* Occupancy Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Occupancy by Year (Post-TCO)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={occChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 105]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => `${(v as number) ?? 0}%`} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Resi" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="Retail" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pro Forma Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h3 className="font-bold text-gray-800">Annual Operating Pro Forma</h3>
          <p className="text-xs text-gray-500 mt-0.5">All values in USD | Post-TCO years</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="text-left py-3 px-4 font-semibold sticky left-0 bg-gray-900 z-10 min-w-48">Line Item</th>
                {annualCFs.slice(0, 8).map(cf => (
                  <th key={cf.yearPostTCO} className="text-right py-3 px-3 font-semibold min-w-28">
                    Yr {cf.yearPostTCO}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Revenue Section */}
              <tr className="bg-blue-50">
                <td className="py-2 px-4 text-xs font-bold text-blue-800 uppercase" colSpan={9}>Revenue</td>
              </tr>
              {[
                { label: 'Gross Potential Resi Income', key: 'grossPotentialResi' as const, color: '' },
                { label: 'Gross Potential Retail Income', key: 'grossPotentialRetail' as const },
                { label: 'Gross Potential Misc Income', key: 'grossPotentialMisc' as const },
                { label: 'Gross Potential Parking Income', key: 'grossPotentialParking' as const },
                { label: 'Vacancy Loss', key: 'vacancyLoss' as const },
                { label: 'Resi Concessions', key: 'resiConcessions' as const },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className={`py-1.5 px-4 sticky left-0 bg-white ${row.key === 'vacancyLoss' || row.key === 'resiConcessions' ? 'text-red-600' : 'text-gray-700'}`}>
                    {row.label}
                  </td>
                  {annualCFs.slice(0, 8).map(cf => (
                    <td key={cf.yearPostTCO} className={`text-right py-1.5 px-3 ${cf[row.key] < 0 ? 'text-red-600' : cf[row.key] > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                      {cf[row.key] !== 0 ? fmt.dollar(cf[row.key], 0) : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold">
                <td className="py-2 px-4 text-blue-900 sticky left-0 bg-blue-50">Net Effective Revenue</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-2 px-3 text-blue-900">{fmt.dollar(cf.netEffectiveRevenue, 0)}</td>
                ))}
              </tr>

              {/* Expenses Section */}
              <tr className="bg-red-50">
                <td className="py-2 px-4 text-xs font-bold text-red-800 uppercase" colSpan={9}>Operating Expenses</td>
              </tr>
              {[
                { label: 'Utilities', key: 'utilities' as const },
                { label: 'Repairs & Maintenance', key: 'repairsMaintenance' as const },
                { label: 'Labor', key: 'labor' as const },
                { label: 'Insurance', key: 'insurance' as const },
                { label: 'G&A / Service Contracts', key: 'ga' as const },
                { label: 'Marketing/Leasing', key: 'marketing' as const },
                { label: 'Turnover', key: 'turnover' as const },
                { label: 'Management Fee', key: 'mgmtFee' as const },
                { label: 'Opex Contingency', key: 'opexContingency' as const },
                { label: 'Real Estate Taxes', key: 'reTaxes' as const },
                { label: 'CapEx / Reserves', key: 'capex' as const },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-1.5 px-4 text-gray-700 sticky left-0 bg-white">{row.label}</td>
                  {annualCFs.slice(0, 8).map(cf => (
                    <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-red-600">
                      {cf[row.key] !== 0 ? `(${fmt.dollar(Math.abs(cf[row.key]), 0)})` : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-red-50 font-bold">
                <td className="py-2 px-4 text-red-900 sticky left-0 bg-red-50">Total Expenses</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-2 px-3 text-red-900">({fmt.dollar(Math.abs(cf.totalExpenses), 0)})</td>
                ))}
              </tr>

              {/* NOI */}
              <tr className="bg-green-100 font-bold">
                <td className="py-3 px-4 text-green-900 text-sm sticky left-0 bg-green-100">Net Operating Income</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className={`text-right py-3 px-3 text-sm font-bold ${cf.noi >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                    {fmt.dollar(cf.noi, 0)}
                  </td>
                ))}
              </tr>

              {/* Below NOI */}
              <tr className="bg-purple-50">
                <td className="py-2 px-4 text-xs font-bold text-purple-800 uppercase" colSpan={9}>Below-the-Line</td>
              </tr>
              {[
                { label: 'Ground Lease Rent', key: 'groundLeaseRent' as const },
                { label: 'Asset Mgmt Fee', key: 'assetMgmtFee' as const },
              ].map(row => (
                <tr key={row.label} className="border-b border-gray-50">
                  <td className="py-1.5 px-4 text-gray-700 sticky left-0 bg-white">{row.label}</td>
                  {annualCFs.slice(0, 8).map(cf => (
                    <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-orange-600">
                      {cf[row.key] !== 0 ? `(${fmt.dollar(Math.abs(cf[row.key]), 0)})` : '-'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-gray-100 font-medium">
                <td className="py-2 px-4 text-gray-800 sticky left-0 bg-white">Net CF Before Debt Service</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-2 px-3 text-gray-800">{fmt.dollar(cf.netCFBeforeDS, 0)}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-1.5 px-4 text-gray-700 sticky left-0 bg-white">Debt Service</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-red-600">
                    {cf.debtService !== 0 ? `(${fmt.dollar(Math.abs(cf.debtService), 0)})` : '-'}
                  </td>
                ))}
              </tr>
              <tr className="bg-gray-900 font-bold">
                <td className="py-3 px-4 text-white text-sm sticky left-0 bg-gray-900">Net Cash Flow</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className={`text-right py-3 px-3 text-sm font-bold ${cf.netCF >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fmt.dollar(cf.netCF, 0)}
                  </td>
                ))}
              </tr>

              {/* Metrics */}
              <tr className="bg-gray-50">
                <td className="py-2 px-4 text-xs font-bold text-gray-500 uppercase" colSpan={9}>Key Metrics</td>
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 px-4 text-gray-600 sticky left-0 bg-white">Resi Occupancy</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-1.5 px-3">{fmt.pct(cf.resiOccupancy)}</td>
                ))}
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 px-4 text-gray-600 sticky left-0 bg-white">Expense Ratio</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-gray-600">
                    {cf.netEffectiveRevenue > 0 ? fmt.pct(Math.abs(cf.totalExpenses) / cf.netEffectiveRevenue) : '-'}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-gray-50">
                <td className="py-1.5 px-4 text-gray-600 sticky left-0 bg-white">Yield on Cost</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-teal-700 font-medium">
                    {fmt.pct(cf.noi / outputs.returns.totalCost)}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 px-4 text-gray-600 sticky left-0 bg-white">OpEx $/Unit</td>
                {annualCFs.slice(0, 8).map(cf => (
                  <td key={cf.yearPostTCO} className="text-right py-1.5 px-3 text-gray-600">
                    {fmt.dollar(Math.abs(cf.totalExpenses) / totalUnits, 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* NOI Growth Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">NOI Growth Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={noiChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => fmt.dollar((v as number) ?? 0, 0)} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="Revenue" stroke="#93c5fd" strokeWidth={2} dot={{ r: 3 }} name="Eff. Revenue" />
            <Line type="monotone" dataKey="Expenses" stroke="#fca5a5" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 3" name="Expenses" />
            <Line type="monotone" dataKey="NOI" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} name="NOI" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
