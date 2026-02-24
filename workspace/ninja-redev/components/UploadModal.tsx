'use client';
import { useState, useRef, useCallback } from 'react';
import { parseXLSX, ParseResult, formatBytes } from '@/lib/xlsxParser';
import { parsePDF, pdfInfoToModelInputs, mergeWithDefaults, PDFExtractedInfo } from '@/lib/pdfParser';
import { ModelInputs, DEFAULT_INPUTS, fmt } from '@/lib/model';
import { ZERO_INPUTS } from '@/lib/validation';

interface Props {
  onApply: (inputs: ModelInputs) => void;
  onClose: () => void;
}

type Mode = 'pick' | 'parsing' | 'xlsx-result' | 'pdf-result' | 'pdf-fill' | 'error';

const FIELD_LABELS: Partial<Record<keyof ModelInputs, string>> = {
  dealName: 'Deal Name', landPrice: 'Land Price', preconstructionMonths: 'Pre-construction (mo)',
  constructionMonths: 'Construction (mo)', br1Units: '1BR Units', br2Units: '2BR Units',
  br3Units: '3BR Units', studioUnits: 'Studio Units', ahBr1Units: 'AH 1BR', ahBr2Units: 'AH 2BR',
  resiRentPerNSF: 'Resi Rent $/NSF', retailRentPerNSF: 'Retail Rent $/NSF',
  rentGrowth: 'Rent Growth', hardCostsApartments: 'HC Apartments', developerFeePct: 'Dev Fee %',
  constLoanLTC: 'Const Loan LTC', constLoanInterestRate: 'Const Loan Rate',
  acqLoanLTC: 'Acq Loan LTC', resiCapRate: 'Exit Cap Rate', taxRate: 'Tax Rate',
};

const PCT_FIELDS = ['rentGrowth', 'developerFeePct', 'constLoanLTC', 'constLoanInterestRate',
  'acqLoanLTC', 'acqLoanInterestRate', 'resiCapRate', 'retailCapRate', 'managementFeePercent',
  'assessmentPctOfCost', 'taxRate', 'hardContingencyPct', 'resiOccAtTCO', 'resiStabilizedOcc'];

function fmtField(key: keyof ModelInputs, val: unknown): string {
  if (typeof val === 'number') {
    if (PCT_FIELDS.includes(key)) return `${(val * 100).toFixed(2)}%`;
    if (['landPrice','hardCostsApartments','hardCostsPodium'].includes(key)) return fmt.mDollar(val);
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  }
  if (val instanceof Date) return val.toLocaleDateString();
  return String(val ?? '');
}

export default function UploadModal({ onApply, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('pick');
  const [fileType, setFileType] = useState<'xlsx' | 'pdf' | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [xlsxResult, setXlsxResult] = useState<ParseResult | null>(null);
  const [pdfResult, setPdfResult] = useState<PDFExtractedInfo | null>(null);
  const [pdfInputs, setPdfInputs] = useState<ModelInputs>(ZERO_INPUTS);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (f: File) => {
    setFile(f);
    setError(null);

    if (f.name.match(/\.xlsx?$/i)) {
      setFileType('xlsx');
      setMode('parsing');
      try {
        const res = await parseXLSX(f);
        setXlsxResult(res);
        setMode('xlsx-result');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Parse failed');
        setMode('error');
      }
    } else if (f.name.match(/\.pdf$/i)) {
      setFileType('pdf');
      setMode('parsing');
      try {
        const info = await parsePDF(f);
        setPdfResult(info);
        // Build starting inputs from extracted info.
        // mergeWithDefaults keeps all model params (financing, cap rates, OpEx, tax)
        // from DEFAULT_INPUTS — only deal-specific fields come from the PDF.
        const partial = pdfInfoToModelInputs(info);
        const merged = mergeWithDefaults(partial);
        setPdfInputs(merged);
        setMode('pdf-result');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'PDF parse failed');
        setMode('error');
      }
    } else {
      setError('Unsupported file type. Please upload .xlsx, .xls, or .pdf');
      setMode('error');
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = '';
  };

  const handleApplyXLSX = () => { if (xlsxResult) { onApply(xlsxResult.inputs); onClose(); } };
  const handleApplyPDF = () => { onApply(pdfInputs); onClose(); };
  const handleReset = () => {
    setMode('pick'); setFile(null); setXlsxResult(null);
    setPdfResult(null); setError(null);
  };

  // PDF field updater
  const updatePdf = (key: keyof ModelInputs, raw: string) => {
    const current = pdfInputs[key];
    let val: unknown = raw;
    if (typeof current === 'number') {
      const n = parseFloat(raw);
      val = isNaN(n) ? 0 : (PCT_FIELDS.includes(key) ? n / 100 : n);
    }
    setPdfInputs(prev => ({ ...prev, [key]: val }));
  };

  const confidenceBadge = (c: number) => {
    if (c >= 0.7) return 'bg-green-100 text-green-800 border-green-200';
    if (c >= 0.4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <span className="text-2xl">{fileType === 'pdf' ? '📄' : '📊'}</span>
          <div>
            <h2 className="font-bold">
              {mode === 'pick' ? 'Upload Deal Document' :
               mode === 'parsing' ? 'Parsing…' :
               mode === 'xlsx-result' ? 'Excel Model Imported' :
               mode === 'pdf-result' ? 'PDF Parsed — Fill Remaining Fields' :
               mode === 'error' ? 'Upload Error' : 'Uploading'}
            </h2>
            <p className="text-xs text-blue-200">
              {mode === 'pick' ? 'Excel model (.xlsx) or deal OM/info sheet (.pdf)' :
               mode === 'parsing' ? `Reading ${file?.name}…` :
               mode === 'pdf-result' ? 'Auto-filled from PDF · Complete missing inputs below' :
               ''}
            </p>
          </div>
          <button onClick={onClose} className="ml-auto text-blue-200 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* ── Pick / Drop Zone ── */}
          {mode === 'pick' && (
            <div className="p-6 space-y-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.pdf" className="hidden" onChange={onFileChange} />
                <div className="text-5xl mb-4">📎</div>
                <p className="font-semibold text-gray-700 text-lg">Drop file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
                <div className="flex justify-center gap-3 mt-4">
                  {[
                    { ext: '.xlsx / .xls', icon: '📊', desc: 'Full model import' },
                    { ext: '.pdf', icon: '📄', desc: 'OM / deal info extract' },
                  ].map(f => (
                    <div key={f.ext} className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-xs text-center">
                      <div className="text-xl mb-1">{f.icon}</div>
                      <div className="font-medium text-gray-700">{f.ext}</div>
                      <div className="text-gray-400">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
                <p className="font-medium">💡 What gets extracted?</p>
                <p><strong>Excel:</strong> All assumptions, unit mix, costs, financing, rent, OpEx, sale assumptions</p>
                <p><strong>PDF:</strong> Address, unit counts, GSF, land price, deal name — you fill the rest</p>
              </div>
            </div>
          )}

          {/* ── Parsing ── */}
          {mode === 'parsing' && (
            <div className="p-12 text-center space-y-6">
              <div className="text-5xl animate-bounce">
                {fileType === 'pdf' ? '📄' : '📊'}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">Parsing {file?.name}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {fileType === 'pdf' ? 'Extracting text from all pages…' : 'Reading all sheets and formulas…'}
                </p>
              </div>
              <div className="max-w-xs mx-auto">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '70%' }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {fileType === 'pdf' ? 'pdfjs processing pages…' : 'SheetJS reading workbook…'}
                </p>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {mode === 'error' && (
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                <div className="text-4xl mb-3">⚠️</div>
                <p className="font-semibold text-red-800">Parse Failed</p>
                <p className="text-sm text-red-600 mt-2">{error}</p>
              </div>
              <div className="text-xs text-gray-500 bg-gray-50 rounded-xl p-4 space-y-1">
                <p className="font-medium text-gray-700">Troubleshooting tips:</p>
                <p>• Excel: file must be .xlsx or .xls (not .csv or .ods)</p>
                <p>• PDF: must be text-based, not scanned/image</p>
                <p>• Try re-saving the file and uploading again</p>
              </div>
              <button onClick={handleReset} className="w-full py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50">
                Try Again
              </button>
            </div>
          )}

          {/* ── XLSX Result ── */}
          {mode === 'xlsx-result' && xlsxResult && (
            <div className="p-5 space-y-4">
              {/* Summary bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 text-sm">
                  <span>📄</span>
                  <span className="font-medium text-gray-800">{file?.name}</span>
                  <span className="text-gray-400 text-xs">({formatBytes(file?.size || 0)})</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confidenceBadge(xlsxResult.confidence)}`}>
                  {Math.round(xlsxResult.confidence * 100)}% match · {xlsxResult.confidence > 0.7 ? '✓ High' : xlsxResult.confidence > 0.4 ? '~ Medium' : '! Low'} confidence
                </span>
                <button onClick={handleReset} className="ml-auto text-xs text-gray-400 hover:text-gray-600">✕ Re-upload</button>
              </div>

              {/* Sheet tags */}
              <div className="flex flex-wrap gap-1.5">
                {xlsxResult.sheetNames.map(n => (
                  <span key={n} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{n}</span>
                ))}
              </div>

              {/* Warnings */}
              {xlsxResult.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-0.5">
                  {xlsxResult.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                </div>
              )}

              {/* Extracted fields grid */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-600 mb-3">
                  {xlsxResult.matchedFields.length} fields extracted
                  <span className="font-normal text-gray-400 ml-2">· highlighted = differs from defaults</span>
                </p>
                <div className="grid grid-cols-2 gap-1 max-h-48 overflow-y-auto">
                  {xlsxResult.matchedFields
                    .filter(f => f in FIELD_LABELS)
                    .map(fk => {
                      const key = fk as keyof ModelInputs;
                      const changed = JSON.stringify(xlsxResult.inputs[key]) !== JSON.stringify(DEFAULT_INPUTS[key]);
                      return (
                        <div key={key} className={`flex justify-between px-2 py-1 rounded text-xs ${changed ? 'bg-blue-50' : 'bg-white'}`}>
                          <span className="text-gray-500">{FIELD_LABELS[key]}</span>
                          <span className={`font-medium ${changed ? 'text-blue-700' : 'text-gray-500'}`}>
                            {fmtField(key, xlsxResult.inputs[key])}
                          </span>
                        </div>
                      );
                    })
                  }
                </div>
              </div>

              {/* Preview */}
              <div className="border border-gray-200 rounded-xl p-4 grid grid-cols-3 gap-3 text-sm">
                {[
                  { label: 'Deal', value: xlsxResult.inputs.dealName || '—' },
                  { label: 'Land', value: fmt.mDollar(xlsxResult.inputs.landPrice) },
                  { label: 'Units', value: String(xlsxResult.inputs.br1Units + xlsxResult.inputs.br2Units + xlsxResult.inputs.br3Units + xlsxResult.inputs.studioUnits + xlsxResult.inputs.ahBr1Units + xlsxResult.inputs.ahBr2Units) },
                  { label: 'Rent/NSF', value: `$${xlsxResult.inputs.resiRentPerNSF.toFixed(2)}` },
                  { label: 'Build', value: `${xlsxResult.inputs.preconstructionMonths + xlsxResult.inputs.constructionMonths}mo` },
                  { label: 'LTC', value: `${(xlsxResult.inputs.constLoanLTC * 100).toFixed(0)}%` },
                ].map(c => (
                  <div key={c.label} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">{c.label}</div>
                    <div className="font-semibold text-gray-900">{c.value}</div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                📝 Review all sidebar inputs after loading — some fields may need manual adjustment.
              </div>
            </div>
          )}

          {/* ── PDF Result + Fill-in Form ── */}
          {(mode === 'pdf-result') && pdfResult && (
            <div className="p-5 space-y-4">
              {/* Summary */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${confidenceBadge(pdfResult.confidence)}`}>
                  {Math.round(pdfResult.confidence * 100)}% extracted · {pdfResult.matchedFields.length} fields found
                </span>
                <button onClick={handleReset} className="ml-auto text-xs text-gray-400 hover:text-gray-600">✕ Re-upload</button>
              </div>

              {pdfResult.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-0.5">
                  {pdfResult.warnings.map((w, i) => <p key={i}>⚠ {w}</p>)}
                </div>
              )}

              {/* What was found */}
              {pdfResult.matchedFields.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-800">
                  <p className="font-medium mb-1">✓ Extracted from PDF</p>
                  <div className="flex flex-wrap gap-1.5">
                    {pdfResult.matchedFields.map(f => (
                      <span key={f} className="bg-green-100 border border-green-200 px-2 py-0.5 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description snippet */}
              {pdfResult.description && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 italic">
                  "{pdfResult.description.slice(0, 200)}{pdfResult.description.length > 200 ? '…' : ''}"
                </div>
              )}

              {/* Fill-in form for key fields */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-800 mb-4">📝 Complete the Model</p>
                <p className="text-xs text-gray-500 mb-4">
                  Pre-filled from PDF where possible. Fill in the rest — remaining assumptions use defaults and can be edited in the sidebar.
                </p>

                <div className="space-y-3">
                  {/* Deal Info */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Deal Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'dealName' as const, label: 'Deal Name', type: 'text', placeholder: '6719 N Lamar BLVD' },
                      { key: 'address' as const, label: 'Address', type: 'text', placeholder: '123 Main St' },
                      { key: 'cityStateZip' as const, label: 'City, State ZIP', type: 'text', placeholder: 'Austin, TX 78752' },
                      { key: 'landPrice' as const, label: 'Land Price ($)', type: 'number', placeholder: '3500000' },
                      { key: 'preconstructionMonths' as const, label: 'Pre-Const (mo)', type: 'number', placeholder: '15' },
                      { key: 'constructionMonths' as const, label: 'Construction (mo)', type: 'number', placeholder: '20' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input
                          type={f.type}
                          value={f.type === 'text'
                            ? String(pdfInputs[f.key] ?? '')
                            : (pdfInputs[f.key] as number) > 0 ? String(pdfInputs[f.key]) : ''}
                          onChange={e => {
                            if (f.type === 'text') {
                              setPdfInputs(prev => ({ ...prev, [f.key]: e.target.value }));
                            } else {
                              updatePdf(f.key, e.target.value);
                            }
                          }}
                          placeholder={f.placeholder}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            f.type === 'text'
                              ? (pdfInputs[f.key] ? 'border-green-200 bg-green-50' : 'border-gray-200')
                              : ((pdfInputs[f.key] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-amber-50/30')
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Units */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Unit Mix (count + avg SF)</p>
                  {/* Header row */}
                  <div className="grid grid-cols-3 gap-x-2 gap-y-3">
                    {[
                      { countKey: 'studioUnits' as const, sfKey: 'studioAvgSF' as const, label: 'Studio' },
                      { countKey: 'br1Units'    as const, sfKey: 'br1AvgSF'    as const, label: '1BR (MR)' },
                      { countKey: 'br2Units'    as const, sfKey: 'br2AvgSF'    as const, label: '2BR (MR)' },
                      { countKey: 'br3Units'    as const, sfKey: 'br3AvgSF'    as const, label: '3BR (MR)' },
                      { countKey: 'ahBr1Units'  as const, sfKey: 'ahBr1AvgSF'  as const, label: '1BR AH' },
                      { countKey: 'ahBr2Units'  as const, sfKey: 'ahBr2AvgSF'  as const, label: '2BR AH' },
                    ].map(f => (
                      <div key={f.countKey} className="space-y-1">
                        <label className="block text-xs text-gray-500">{f.label}</label>
                        <div className="flex gap-1">
                          <input
                            type="number"
                            value={(pdfInputs[f.countKey] as number) || ''}
                            onChange={e => updatePdf(f.countKey, e.target.value)}
                            placeholder="units"
                            min="0"
                            className={`w-14 px-1.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-right ${
                              (pdfInputs[f.countKey] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
                            }`}
                          />
                          <input
                            type="number"
                            value={(pdfInputs[f.sfKey] as number) || ''}
                            onChange={e => updatePdf(f.sfKey, e.target.value)}
                            placeholder="SF"
                            min="0"
                            className={`w-16 px-1.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 text-right ${
                              (pdfInputs[f.sfKey] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
                            }`}
                          />
                        </div>
                        <div className="text-gray-300 text-xs text-right">units | avg SF</div>
                      </div>
                    ))}
                  </div>

                  {/* Parking */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Parking Stalls</label>
                      <input
                        type="number"
                        value={(pdfInputs['parkingSpaces'] as number) || ''}
                        onChange={e => updatePdf('parkingSpaces', e.target.value)}
                        placeholder="0"
                        min="0"
                        className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                          (pdfInputs['parkingSpaces'] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Building Size */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Building Size (GSF)</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'residentialGSF' as const, label: 'Resi GSF', placeholder: '54000' },
                      { key: 'retailGSF'      as const, label: 'Retail GSF', placeholder: '4400' },
                      { key: 'parkingGSF'     as const, label: 'Parking GSF', placeholder: '34000' },
                      { key: 'amenityGSF'     as const, label: 'Amenity GSF', placeholder: '13000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                        <input
                          type="number"
                          value={(pdfInputs[f.key] as number) || ''}
                          onChange={e => updatePdf(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            (pdfInputs[f.key] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-gray-200'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Rents (critical — always required) */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Rents</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'resiRentPerNSF' as const, label: 'Resi Rent $/NSF/mo', placeholder: '3.00' },
                      { key: 'retailRentPerNSF' as const, label: 'Retail Rent $/NSF/mo', placeholder: '2.50' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label} <span className="text-red-400">*</span></label>
                        <input
                          type="number"
                          step="0.05"
                          value={(pdfInputs[f.key] as number) > 0 ? String(pdfInputs[f.key]) : ''}
                          onChange={e => updatePdf(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            (pdfInputs[f.key] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50/30'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Hard Costs */}
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pt-2">Hard Costs</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: 'hardCostsApartments' as const, label: 'HC Apartments ($)', placeholder: '16500000' },
                      { key: 'hardCostsPodium' as const, label: 'HC Podium ($)', placeholder: '1890000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block text-xs text-gray-500 mb-1">{f.label} <span className="text-red-400">*</span></label>
                        <input
                          type="number"
                          value={(pdfInputs[f.key] as number) > 0 ? String(pdfInputs[f.key]) : ''}
                          onChange={e => updatePdf(f.key, e.target.value)}
                          placeholder={f.placeholder}
                          className={`w-full px-2.5 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                            (pdfInputs[f.key] as number) > 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50/30'
                          }`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    All other assumptions (financing, OpEx, taxes, sale) use sensible defaults — edit them in the sidebar after loading.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center gap-3 bg-white flex-shrink-0">
          {mode === 'xlsx-result' && (
            <>
              <button onClick={handleApplyXLSX} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                ✓ Apply to Model
              </button>
              <button onClick={handleReset} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Re-upload
              </button>
            </>
          )}
          {mode === 'pdf-result' && (
            <>
              <button
                onClick={handleApplyPDF}
                className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                ✓ Apply to Model
              </button>
              <button onClick={handleReset} className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50">
                Re-upload
              </button>
            </>
          )}
          {mode === 'pick' && (
            <button onClick={() => fileRef.current?.click()} className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              Browse File
            </button>
          )}
          {mode === 'error' && (
            <button onClick={handleReset} className="px-5 py-2.5 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700">
              Try Again
            </button>
          )}
          <button onClick={onClose} className="ml-auto text-sm text-gray-500 hover:text-gray-700 px-3 py-2.5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
