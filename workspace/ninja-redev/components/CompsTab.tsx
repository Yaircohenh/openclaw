'use client';
import { fmt } from '@/lib/model';

// Data from Excel - Opex Comps and Project Comps sheets
const OPEX_COMPS = [
  { category: 'Utilities', aare: 800, greystar: 734, lincoln: 1000, rkw: 775 },
  { category: 'Repairs & Maintenance', aare: 500, greystar: 400, lincoln: 350, rkw: 127 },
  { category: 'Labor', aare: 900, greystar: 1800, lincoln: 2700, rkw: 1774 },
  { category: 'Insurance', aare: 350, greystar: 1200, lincoln: 1100, rkw: 1080 },
  { category: 'G&A / Service Contracts', aare: 350, greystar: 1500, lincoln: 900, rkw: 1550 },
  { category: 'Marketing/Leasing', aare: 300, greystar: 500, lincoln: 360, rkw: 455 },
  { category: 'Turnover', aare: 0, greystar: 200, lincoln: 225, rkw: 250 },
  { category: 'CapEx Reserves', aare: 100, greystar: 200, lincoln: 150, rkw: 0 },
];

const PROJECT_COMPS = [
  { name: 'Midtown Highline', address: '604 E Highland Mall Blvd', units: 163, year: 2024, price: 31800000, perUnit: 195092, perSF: 276.75, totalSF: 114907 },
  { name: 'Burnet Flats', address: '5453 Burnet Road', units: 179, year: 2014, price: 39100000, perUnit: 218436, perSF: 274.67, totalSF: 142352 },
  { name: 'Kenzie at Domain', address: '3201 Esperanza Crossing', units: 279, year: 2014, price: 83515000, perUnit: 299337, perSF: 351.90, totalSF: 237329 },
  { name: 'Revl on Lamar', address: '5629 N. Lamar Blvd', units: 279, year: 2021, price: 62400000, perUnit: 223656, perSF: 282.39, totalSF: 220968 },
  { name: 'Lotus Village', address: '300 Ferguson Drive', units: 222, year: 2012, price: 33000000, perUnit: 148649, perSF: 161.40, totalSF: 204462 },
  { name: 'Midtown Commons at Crestview', address: '810 W. Saint Johns Ave', units: 562, year: 2013, price: 135000000, perUnit: 240214, perSF: 316.32, totalSF: 426777 },
  { name: 'The Grand at Domain', address: '11009 Alterra Parkway', units: 180, year: 2019, price: 68250000, perUnit: 379167, perSF: 408.46, totalSF: 167090 },
  { name: 'The Braxton', address: '4811 Woodrow Avenue', units: 53, year: 2019, price: 17500000, perUnit: 330189, perSF: 392.57, totalSF: 44578 },
  { name: 'AMLI 5350', address: '5350 Burnet Road', units: 175, year: 2010, price: 46250000, perUnit: 264286, perSF: 318.14, totalSF: 145375 },
];

const MISC_COMPS = [
  { category: 'Parking Income $/unit/mo', aare: 0, greystar: 125, lincoln: 125, rkw: 100 },
  { category: 'Misc Income $/unit/mo', aare: 150, greystar: 92, lincoln: 100, rkw: 83 },
];

const avgProjectPerUnit = PROJECT_COMPS.reduce((s, p) => s + p.perUnit, 0) / PROJECT_COMPS.length;
const avgProjectPerSF = PROJECT_COMPS.reduce((s, p) => s + p.perSF, 0) / PROJECT_COMPS.length;

export default function CompsTab() {
  return (
    <div className="space-y-6">
      {/* Project Comps */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-2">Austin Multifamily Sale Comps</h3>
        <p className="text-xs text-gray-500 mb-4">Recent transactions in Austin market | Source: Excel model</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-2 px-2">Property</th>
                <th className="text-left py-2 px-2">Address</th>
                <th className="text-right py-2 px-2">Units</th>
                <th className="text-right py-2 px-2">Year</th>
                <th className="text-right py-2 px-2">Sale Price</th>
                <th className="text-right py-2 px-2">$/Unit</th>
                <th className="text-right py-2 px-2">$/SF</th>
              </tr>
            </thead>
            <tbody>
              {PROJECT_COMPS.map((comp, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 px-2 font-medium text-gray-800">{comp.name}</td>
                  <td className="py-2 px-2 text-gray-500 text-xs">{comp.address}</td>
                  <td className="text-right py-2 px-2">{comp.units}</td>
                  <td className="text-right py-2 px-2 text-gray-500">{comp.year}</td>
                  <td className="text-right py-2 px-2 font-medium text-blue-700">{fmt.mDollar(comp.price)}</td>
                  <td className="text-right py-2 px-2">{fmt.dollar(comp.perUnit, 0)}</td>
                  <td className="text-right py-2 px-2">{fmt.dollar(comp.perSF, 2)}</td>
                </tr>
              ))}
              <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                <td className="py-2 px-2 text-blue-900" colSpan={5}>Average (Comps)</td>
                <td className="text-right py-2 px-2 text-blue-900">{fmt.dollar(avgProjectPerUnit, 0)}</td>
                <td className="text-right py-2 px-2 text-blue-900">{fmt.dollar(avgProjectPerSF, 2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* OpEx Comps */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-2">Operating Expense Comps ($/Unit/Year)</h3>
        <p className="text-xs text-gray-500 mb-4">Comparison with third-party property managers</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs border-b border-gray-200">
                <th className="text-left py-2 px-3 text-gray-500 uppercase">Category</th>
                <th className="text-right py-2 px-3 text-blue-700 font-bold">AARE (UW)</th>
                <th className="text-right py-2 px-3 text-gray-500">Greystar</th>
                <th className="text-right py-2 px-3 text-gray-500">Lincoln</th>
                <th className="text-right py-2 px-3 text-gray-500">RKW</th>
                <th className="text-right py-2 px-3 text-gray-400">Avg Comps</th>
              </tr>
            </thead>
            <tbody>
              {OPEX_COMPS.map((row, i) => {
                const avgComps = (row.greystar + row.lincoln + row.rkw) / 3;
                const isLow = row.aare < avgComps;
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700">{row.category}</td>
                    <td className={`text-right py-2 px-3 font-bold ${isLow ? 'text-green-700' : 'text-orange-600'}`}>
                      {fmt.dollar(row.aare, 0)}
                      <span className="text-xs ml-1">{isLow ? '✓' : '↑'}</span>
                    </td>
                    <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.greystar, 0)}</td>
                    <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.lincoln, 0)}</td>
                    <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.rkw, 0)}</td>
                    <td className="text-right py-2 px-3 text-gray-400">{fmt.dollar(avgComps, 0)}</td>
                  </tr>
                );
              })}
              {/* Totals */}
              <tr className="bg-gray-50 font-bold border-t-2 border-gray-300">
                <td className="py-2 px-3">Total (ex-taxes, mgmt, conting)</td>
                {(['aare', 'greystar', 'lincoln', 'rkw'] as const).map(key => (
                  <td key={key} className="text-right py-2 px-3">
                    {fmt.dollar(OPEX_COMPS.reduce((s, r) => s + r[key], 0), 0)}
                  </td>
                ))}
                <td className="text-right py-2 px-3 text-gray-400">
                  {fmt.dollar(OPEX_COMPS.reduce((s, r) => s + (r.greystar + r.lincoln + r.rkw) / 3, 0), 0)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          <span className="text-green-600 font-medium">✓ = Below comp average</span>
          <span className="ml-4 text-orange-500 font-medium">↑ = Above comp average</span>
        </div>
      </div>

      {/* Misc Income Comps */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Ancillary Income Comps ($/Unit/Month)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs border-b border-gray-200">
              <th className="text-left py-2 px-3 text-gray-500 uppercase">Category</th>
              <th className="text-right py-2 px-3 text-blue-700 font-bold">AARE (UW)</th>
              <th className="text-right py-2 px-3 text-gray-500">Greystar</th>
              <th className="text-right py-2 px-3 text-gray-500">Lincoln</th>
              <th className="text-right py-2 px-3 text-gray-500">RKW</th>
            </tr>
          </thead>
          <tbody>
            {MISC_COMPS.map((row, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="py-2 px-3 text-gray-700">{row.category}</td>
                <td className="text-right py-2 px-3 font-bold text-blue-700">{fmt.dollar(row.aare, 0)}</td>
                <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.greystar, 0)}</td>
                <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.lincoln, 0)}</td>
                <td className="text-right py-2 px-3 text-gray-600">{fmt.dollar(row.rkw, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Key Observations */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="font-bold text-amber-900 mb-3">📊 Key Observations from Comps</h3>
        <ul className="space-y-2 text-sm text-amber-800">
          <li>• <strong>Labor underwritten conservatively:</strong> AARE at $900/unit vs. Greystar $1,800, Lincoln $2,700 — reflects smaller building economics</li>
          <li>• <strong>Insurance well below market:</strong> $350/unit vs. $1,080–1,200 for larger operators — may need revisiting post-close</li>
          <li>• <strong>No parking income:</strong> Unlike comps ($100–125/unit/mo) — potential upside if structured parking is monetized</li>
          <li>• <strong>Sale comps range:</strong> ${fmt.dollar(Math.min(...PROJECT_COMPS.map(p => p.perUnit)), 0)}–${fmt.dollar(Math.max(...PROJECT_COMPS.map(p => p.perUnit)), 0)}/unit | Avg {fmt.dollar(avgProjectPerUnit, 0)}/unit</li>
          <li>• <strong>Nearest comp:</strong> Revl on Lamar at 5629 N. Lamar (same corridor) — sold for $223K/unit ($282/SF)</li>
        </ul>
      </div>
    </div>
  );
}
