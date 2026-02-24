'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { calculate, DEFAULT_INPUTS, ModelInputs } from '@/lib/model';
import { sanitizeInputs, validateInputs, ValidationResult, ZERO_INPUTS } from '@/lib/validation';
import Sidebar from '@/components/Sidebar';
import OverviewTab from '@/components/OverviewTab';
import UnitMixTab from '@/components/UnitMixTab';
import ConstructionTab from '@/components/ConstructionTab';
import ProFormaTab from '@/components/ProFormaTab';
import ReturnsTab from '@/components/ReturnsTab';
import CompsTab from '@/components/CompsTab';
import ModelManager from '@/components/ModelManager';
import UploadModal from '@/components/UploadModal';
import ValidationBanner from '@/components/ValidationBanner';

const TABS = [
  { id: 'overview', label: '📊 Overview' },
  { id: 'unitmix', label: '🏠 Unit Mix' },
  { id: 'construction', label: '🔨 Construction' },
  { id: 'proforma', label: '📈 Pro Forma' },
  { id: 'returns', label: '💰 Returns' },
  { id: 'comps', label: '📋 Comps' },
];

export default function Home() {
  const [inputs, setInputs] = useState<ModelInputs>(DEFAULT_INPUTS);
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModelManager, setShowModelManager] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showResetMenu, setShowResetMenu] = useState(false);
  const [toast, setToast] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  // Sanitize inputs before calculation (guards NaN, ranges, etc.)
  const safeInputs = useMemo(() => sanitizeInputs(inputs), [inputs]);

  // Validate (runs on every input change)
  const validation: ValidationResult = useMemo(() => validateInputs(safeInputs), [safeInputs]);

  // Calculate only if valid enough (at least no critical NaN errors)
  const outputs = useMemo(() => {
    try {
      return calculate(safeInputs);
    } catch {
      return null;
    }
  }, [safeInputs]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleChange = useCallback((key: keyof ModelInputs, value: unknown) => {
    setInputs(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const handleAutoFix = useCallback((fixed: ModelInputs) => {
    setInputs(fixed);
    showToast('⚡ Auto-fixed validation issues');
  }, []);

  const handleLoadModel = useCallback((loadedInputs: ModelInputs) => {
    setInputs(loadedInputs);
    setIsDirty(false);
    showToast(`✓ Loaded "${loadedInputs.dealName}"`);
  }, []);

  const handleUploadApply = useCallback((parsedInputs: ModelInputs) => {
    setInputs(parsedInputs);
    setIsDirty(true);
    showToast(`✓ Loaded from file: ${parsedInputs.dealName || 'Untitled'}`);
  }, []);

  const handleResetToZero = () => {
    setInputs({ ...ZERO_INPUTS, modelStartDate: new Date() });
    setIsDirty(false);
    setShowResetMenu(false);
    showToast('🔄 Reset to blank model');
  };

  const handleResetToDefaults = () => {
    setInputs(DEFAULT_INPUTS);
    setIsDirty(false);
    setShowResetMenu(false);
    showToast('🔄 Reset to Lamar defaults');
  };

  const handlePrint = () => window.print();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); setShowModelManager(true); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'o') { e.preventDefault(); setShowUpload(true); }
      if (e.key === 'Escape') { setShowResetMenu(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Color-coded return pills
  const irrVal = outputs ? outputs.returns.irr * 100 : 0;
  const emVal = outputs ? outputs.returns.equityMultiple : 0;

  const irrColor = irrVal >= 12 ? 'text-green-600 bg-green-50'
    : irrVal >= 8 ? 'text-blue-600 bg-blue-50'
    : irrVal >= 5 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50';

  const emColor = emVal >= 2 ? 'text-green-600 bg-green-50'
    : emVal >= 1.5 ? 'text-blue-600 bg-blue-50'
    : emVal >= 1.2 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50';

  const totalErrors = validation.errors.length;
  const totalWarnings = validation.warnings.length;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <div className="flex flex-col w-72 min-h-screen bg-gray-50 border-r border-gray-200 flex-shrink-0">
          {/* Sidebar header */}
          <div className="p-3 bg-gray-900 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <h1 className="font-bold text-sm">🥷 Ninja RE Model</h1>
              <span className="text-xs text-gray-400">{inputs.dealName.slice(0, 20)}</span>
            </div>
          </div>

          {/* Validation banner in sidebar */}
          <div className="px-3 pt-3 pb-1">
            <ValidationBanner
              validation={validation}
              inputs={safeInputs}
              onAutoFix={handleAutoFix}
              compact={!validation.errors.length && validation.warnings.length <= 1}
            />
          </div>

          {/* Sidebar inputs */}
          <div className="flex-1 overflow-y-auto">
            <Sidebar inputs={inputs} onChange={handleChange} validation={validation} />
          </div>

          <div className="p-3 border-t border-gray-200 text-xs text-gray-400 text-center">
            🥷 Ninja RE Model v1.1
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3 sticky top-0 z-20 no-print">
          {/* Hamburger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-500 hover:text-gray-800 p-1.5 rounded hover:bg-gray-100 flex-shrink-0"
            title="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Deal name (inline editable) */}
          <div className="flex items-center gap-1.5 min-w-0">
            <input
              type="text"
              value={inputs.dealName}
              onChange={e => handleChange('dealName', e.target.value)}
              placeholder="Deal Name"
              className="font-bold text-gray-900 text-sm bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 focus:rounded min-w-0 max-w-48 truncate"
            />
            {isDirty && <span className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" title="Unsaved changes" />}
          </div>

          {/* Validation indicator in header */}
          {(totalErrors > 0 || totalWarnings > 0) && (
            <div
              className={`hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full cursor-pointer ${
                totalErrors > 0 ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}
              onClick={() => setSidebarOpen(true)}
              title="Click to open sidebar and fix issues"
            >
              {totalErrors > 0 ? `⛔ ${totalErrors} error${totalErrors > 1 ? 's' : ''}` : `⚠️ ${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}`}
            </div>
          )}

          {/* Live Returns Pills */}
          {outputs && (
            <div className="hidden md:flex items-center gap-2 ml-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${irrColor}`}>
                {irrVal.toFixed(1)}% IRR
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${emColor}`}>
                {emVal.toFixed(2)}x EM
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full text-teal-700 bg-teal-50">
                {(outputs.returns.stabilizedYieldOnCost * 100).toFixed(2)}% YoC
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${outputs.returns.netProfit > 0 ? 'text-purple-700 bg-purple-50' : 'text-red-600 bg-red-50'}`}>
                ${(outputs.returns.netProfit / 1_000_000).toFixed(2)}M
              </span>
            </div>
          )}
          {!outputs && (
            <span className="hidden md:inline text-xs text-red-500 bg-red-50 px-2.5 py-1 rounded-full">
              ⛔ Fix errors to calculate
            </span>
          )}

          {/* Toast */}
          {toast && (
            <div className="hidden md:block text-xs text-green-700 bg-green-50 px-3 py-1 rounded-full border border-green-200 flex-shrink-0">
              {toast}
            </div>
          )}

          {/* Actions */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowUpload(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Upload Excel or PDF (⌘O)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </button>

            <button
              onClick={() => setShowModelManager(true)}
              className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              title="Save/Load models (⌘S)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Models
            </button>

            {/* Reset menu */}
            <div className="relative">
              <button
                onClick={() => setShowResetMenu(!showResetMenu)}
                className="text-xs px-2.5 py-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center gap-1"
              >
                Reset
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showResetMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-52 overflow-hidden">
                  <button
                    onClick={handleResetToZero}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-start gap-3"
                  >
                    <span className="text-lg mt-0.5">⬜</span>
                    <div>
                      <div className="font-medium text-gray-800">Reset to Zero</div>
                      <div className="text-xs text-gray-400">Blank model — all fields empty</div>
                    </div>
                  </button>
                  <hr className="border-gray-100" />
                  <button
                    onClick={handleResetToDefaults}
                    className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 flex items-start gap-3"
                  >
                    <span className="text-lg mt-0.5">🏢</span>
                    <div>
                      <div className="font-medium text-gray-800">Reset to Lamar Defaults</div>
                      <div className="text-xs text-gray-400">6719 N Lamar reference deal</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Print */}
            <button
              onClick={handlePrint}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              PDF
            </button>
          </div>
        </header>

        {/* Tab Bar */}
        <nav className="bg-white border-b border-gray-200 px-4 flex gap-1 overflow-x-auto no-print">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <main className="flex-1 p-6 overflow-auto">
          {/* Error wall — show when outputs couldn't be computed */}
          {!outputs && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center mb-6">
              <div className="text-4xl mb-3">⛔</div>
              <h3 className="font-bold text-red-800 text-lg mb-2">Model Cannot Calculate</h3>
              <p className="text-red-600 text-sm mb-4">Fix the required fields in the sidebar to see results.</p>
              <div className="inline-block text-left bg-white border border-red-200 rounded-xl p-4 text-sm max-w-sm">
                {validation.errors.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex gap-2 py-1 text-red-700">
                    <span>⛔</span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {outputs && (
            <>
              {activeTab === 'overview' && <OverviewTab outputs={outputs} inputs={safeInputs} />}
              {activeTab === 'unitmix' && <UnitMixTab outputs={outputs} inputs={safeInputs} />}
              {activeTab === 'construction' && <ConstructionTab outputs={outputs} inputs={safeInputs} />}
              {activeTab === 'proforma' && <ProFormaTab outputs={outputs} inputs={safeInputs} />}
              {activeTab === 'returns' && <ReturnsTab outputs={outputs} inputs={safeInputs} />}
              {activeTab === 'comps' && <CompsTab />}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 px-6 py-2.5 text-xs text-gray-400 flex items-center justify-between no-print">
          <span>🥷 Ninja RE Model · {inputs.dealName || 'Untitled'}</span>
          <span className="hidden sm:block">⌘S Save · ⌘O Upload · All calcs are estimates</span>
        </footer>
      </div>

      {/* Modals */}
      {showModelManager && (
        <ModelManager
          currentInputs={inputs}
          onLoad={handleLoadModel}
          onClose={() => setShowModelManager(false)}
        />
      )}
      {showUpload && (
        <UploadModal
          onApply={handleUploadApply}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Click-outside to close reset menu */}
      {showResetMenu && (
        <div className="fixed inset-0 z-10" onClick={() => setShowResetMenu(false)} />
      )}
    </div>
  );
}
