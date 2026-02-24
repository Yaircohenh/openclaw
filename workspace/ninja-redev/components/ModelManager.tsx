'use client';
import { useState, useEffect, useRef } from 'react';
import {
  SavedModel, listFolders, listAllModels, saveModel,
  loadModel, deleteModel, duplicateModel, exportModelJSON,
  importModelJSON, MODEL_TEMPLATES, applyTemplate, ModelFolder
} from '@/lib/storage';
import { ModelInputs } from '@/lib/model';

interface Props {
  currentInputs: ModelInputs;
  onLoad: (inputs: ModelInputs) => void;
  onClose: () => void;
}

type View = 'browse' | 'save' | 'templates';

export default function ModelManager({ currentInputs, onLoad, onClose }: Props) {
  const [view, setView] = useState<View>('browse');
  const [folders, setFolders] = useState<ModelFolder[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [saveName, setSaveName] = useState('');
  const [saveNotes, setSaveNotes] = useState('');
  const [saveTags, setSaveTags] = useState('');
  const [savedFeedback, setSavedFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    const f = listFolders();
    setFolders(f);
    // Auto-expand all folders with few models
    const expanded = new Set<string>();
    f.forEach(folder => {
      if (folder.models.length <= 5) expanded.add(folder.slug);
    });
    setExpandedFolders(expanded);
  };

  useEffect(() => {
    refresh();
    setSaveName(`${currentInputs.dealName || 'Deal'} — ${new Date().toLocaleDateString()}`);
  }, [currentInputs.dealName]);

  const handleSave = () => {
    if (!saveName.trim()) return;
    const tags = saveTags.split(',').map(t => t.trim()).filter(Boolean);
    saveModel(currentInputs, saveName.trim(), saveNotes.trim() || undefined, tags.length ? tags : undefined);
    setSavedFeedback('✓ Saved!');
    setTimeout(() => setSavedFeedback(''), 2000);
    refresh();
    setView('browse');
  };

  const handleLoad = (id: string) => {
    const model = loadModel(id);
    if (!model) return;
    onLoad(model.inputs);
    onClose();
  };

  const handleDelete = (id: string) => {
    deleteModel(id);
    setConfirmDelete(null);
    refresh();
  };

  const handleDuplicate = (id: string) => {
    const original = loadModel(id);
    if (!original) return;
    duplicateModel(id, original.name + ' (copy)');
    refresh();
  };

  const handleExport = (id: string) => {
    const model = loadModel(id);
    if (model) exportModelJSON(model);
  };

  const handleImport = () => {
    importRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const model = importModelJSON(text);
    if (model) {
      refresh();
      alert(`✓ Imported "${model.name}"`);
    } else {
      alert('Import failed — invalid JSON file');
    }
    e.target.value = '';
  };

  const handleTemplateApply = (templateId: string) => {
    const inputs = applyTemplate(templateId);
    onLoad(inputs);
    onClose();
  };

  const allModels = listAllModels();
  const filteredModels = searchQuery
    ? allModels.filter(m =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.dealName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : null;

  const toggleFolder = (slug: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const ModelCard = ({ model }: { model: SavedModel }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 text-sm truncate">{model.name}</span>
            {model.tags?.map(t => (
              <span key={t} className="bg-blue-50 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
          {model.notes && (
            <p className="text-xs text-gray-500 mt-0.5 truncate">{model.notes}</p>
          )}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>💾 {formatDate(model.savedAt)}</span>
            <span>🏗️ {model.inputs.preconstructionMonths + model.inputs.constructionMonths}mo build</span>
            <span>🏠 {(model.inputs.br1Units + model.inputs.br2Units + model.inputs.br3Units + model.inputs.studioUnits + model.inputs.ahBr1Units + model.inputs.ahBr2Units)} units</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => handleLoad(model.id)}
            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
          >
            Load
          </button>
          <div className="relative group">
            <button className="px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50">
              ···
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 hidden group-hover:block min-w-36">
              <button onClick={() => handleDuplicate(model.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">📋 Duplicate</button>
              <button onClick={() => handleExport(model.id)} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">📤 Export JSON</button>
              <hr className="border-gray-100" />
              {confirmDelete === model.id ? (
                <div className="px-3 py-2">
                  <p className="text-xs text-red-600 mb-1">Confirm delete?</p>
                  <div className="flex gap-1">
                    <button onClick={() => handleDelete(model.id)} className="px-2 py-0.5 text-xs bg-red-600 text-white rounded">Delete</button>
                    <button onClick={() => setConfirmDelete(null)} className="px-2 py-0.5 text-xs border border-gray-200 rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(model.id)} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">🗑️ Delete</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
          <span className="text-lg">🥷</span>
          <div>
            <h2 className="font-bold text-sm">Model Manager</h2>
            <p className="text-xs text-gray-400">{allModels.length} saved model{allModels.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <input
              type="file"
              ref={importRef}
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
            <button onClick={handleImport} className="text-xs px-3 py-1.5 bg-gray-700 rounded hover:bg-gray-600 text-gray-200">
              📥 Import JSON
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-white border-b border-gray-200 px-4">
          {([
            { id: 'browse', label: '📁 Saved Models' },
            { id: 'save', label: '💾 Save Current' },
            { id: 'templates', label: '📝 Templates' },
          ] as { id: View; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── Browse ── */}
          {view === 'browse' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search models..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>

              {allModels.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <div className="text-4xl mb-3">📂</div>
                  <p className="font-medium">No saved models yet</p>
                  <p className="text-sm mt-1">Save your current model to get started</p>
                  <button
                    onClick={() => setView('save')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    Save Current Model
                  </button>
                </div>
              ) : filteredModels ? (
                // Search results
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">{filteredModels.length} result{filteredModels.length !== 1 ? 's' : ''}</p>
                  {filteredModels.map(m => <ModelCard key={m.id} model={m} />)}
                </div>
              ) : (
                // Folder tree
                <div className="space-y-3">
                  {folders.map(folder => (
                    <div key={folder.slug} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      {/* Folder header */}
                      <button
                        onClick={() => toggleFolder(folder.slug)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-lg">
                          {expandedFolders.has(folder.slug) ? '📂' : '📁'}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 text-sm">{folder.displayName}</div>
                          <div className="text-xs text-gray-400">{folder.models.length} model{folder.models.length !== 1 ? 's' : ''}</div>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedFolders.has(folder.slug) ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {/* Folder contents */}
                      {expandedFolders.has(folder.slug) && (
                        <div className="px-4 pb-3 space-y-2 border-t border-gray-100">
                          <div className="pt-3 space-y-2">
                            {folder.models
                              .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime())
                              .map(m => <ModelCard key={m.id} model={m} />)
                            }
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Save ── */}
          {view === 'save' && (
            <div className="space-y-5 max-w-md">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-medium">💾 Save current model state</p>
                <p className="text-xs mt-1 text-blue-600">All inputs will be saved. You can load this model later.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Name *</label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={e => setSaveName(e.target.value)}
                    placeholder={`e.g., "${currentInputs.dealName} V1"`}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deal / Folder
                    <span className="text-xs text-gray-400 ml-2">(auto-grouped by deal name)</span>
                  </label>
                  <input
                    type="text"
                    value={currentInputs.dealName}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={saveNotes}
                    onChange={e => setSaveNotes(e.target.value)}
                    placeholder="e.g., Base case scenario, adjusted rent growth..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={saveTags}
                    onChange={e => setSaveTags(e.target.value)}
                    placeholder="e.g., base-case, optimistic, v1 (comma-separated)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  💾 Save Model
                </button>
                {savedFeedback && (
                  <span className="text-green-600 text-sm font-medium">{savedFeedback}</span>
                )}
              </div>

              {/* Quick save variants hint */}
              <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">💡 Naming tips</p>
                <p>• Include version: "Lamar V1", "Lamar V2 — Higher Rents"</p>
                <p>• Include scenario: "Base Case", "Optimistic", "Stressed"</p>
                <p>• Include date for snapshots: "Lamar 2026-02-24"</p>
              </div>
            </div>
          )}

          {/* ── Templates ── */}
          {view === 'templates' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Start a new model from a template. This will replace all current inputs.</p>

              <div className="grid grid-cols-1 gap-3">
                {MODEL_TEMPLATES.map(tpl => {
                  const icons: Record<string, string> = {
                    multifamily: '🏢',
                    student: '🎓',
                    condo: '🏠',
                    retail: '🏪',
                  };
                  const colors: Record<string, string> = {
                    multifamily: 'border-blue-200 hover:border-blue-400',
                    student: 'border-purple-200 hover:border-purple-400',
                    condo: 'border-green-200 hover:border-green-400',
                    retail: 'border-orange-200 hover:border-orange-400',
                  };
                  const badges: Record<string, string> = {
                    multifamily: 'bg-blue-50 text-blue-700',
                    student: 'bg-purple-50 text-purple-700',
                    condo: 'bg-green-50 text-green-700',
                    retail: 'bg-orange-50 text-orange-700',
                  };
                  return (
                    <div
                      key={tpl.id}
                      className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all ${colors[tpl.category]}`}
                      onClick={() => {
                        if (confirm(`Load template "${tpl.name}"? This will replace all current inputs.`)) {
                          handleTemplateApply(tpl.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icons[tpl.category]}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{tpl.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${badges[tpl.category]}`}>
                              {tpl.category}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                        </div>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coming soon */}
              <div className="bg-gray-100 rounded-xl p-4 border border-dashed border-gray-300">
                <div className="flex items-center gap-3 text-gray-400">
                  <span className="text-xl">🚧</span>
                  <div>
                    <p className="text-sm font-medium text-gray-500">More templates coming</p>
                    <p className="text-xs">Student housing (by-the-bed), condos, mixed-use retail</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
