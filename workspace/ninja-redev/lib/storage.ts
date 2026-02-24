// ============================================================
// Model Storage — localStorage persistence
// Organized by: deals → models
// ============================================================

import { ModelInputs, DEFAULT_INPUTS } from './model';

export interface SavedModel {
  id: string;           // uuid
  name: string;         // e.g. "Lamar V1"
  dealName: string;     // e.g. "6719 N Lamar BLVD"
  folder: string;       // e.g. "lamar-4-over-1" (slug)
  savedAt: string;      // ISO timestamp
  updatedAt: string;
  inputs: ModelInputs;
  notes?: string;
  tags?: string[];
}

export interface ModelFolder {
  slug: string;
  displayName: string;
  models: SavedModel[];
  createdAt: string;
}

const STORAGE_KEY = 'ninja_re_models_v1';
const FOLDERS_KEY = 'ninja_re_folders_v1';

// ── Helpers ───────────────────────────────────────────────
function generateId(): string {
  return `mdl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeSetStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// ── Model CRUD ────────────────────────────────────────────

export function listAllModels(): SavedModel[] {
  return safeGetStorage<SavedModel[]>(STORAGE_KEY, []);
}

export function listFolders(): ModelFolder[] {
  const models = listAllModels();
  const folderMap = new Map<string, ModelFolder>();

  models.forEach(model => {
    if (!folderMap.has(model.folder)) {
      folderMap.set(model.folder, {
        slug: model.folder,
        displayName: model.dealName || model.folder,
        models: [],
        createdAt: model.savedAt,
      });
    }
    folderMap.get(model.folder)!.models.push(model);
  });

  // Sort folders by most recent
  return Array.from(folderMap.values()).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveModel(
  inputs: ModelInputs,
  name: string,
  notes?: string,
  tags?: string[],
  existingId?: string,
): SavedModel {
  const models = listAllModels();
  const now = new Date().toISOString();
  const folder = slugify(inputs.dealName || name || 'untitled');

  let model: SavedModel;

  if (existingId) {
    // Update existing
    const idx = models.findIndex(m => m.id === existingId);
    if (idx >= 0) {
      model = {
        ...models[idx],
        name,
        inputs,
        notes,
        tags,
        updatedAt: now,
        folder,
        dealName: inputs.dealName,
      };
      models[idx] = model;
    } else {
      // Fallback: create new
      model = {
        id: generateId(), name, dealName: inputs.dealName,
        folder, savedAt: now, updatedAt: now, inputs, notes, tags,
      };
      models.push(model);
    }
  } else {
    // Create new
    model = {
      id: generateId(), name, dealName: inputs.dealName,
      folder, savedAt: now, updatedAt: now, inputs, notes, tags,
    };
    models.push(model);
  }

  safeSetStorage(STORAGE_KEY, models);
  return model;
}

export function loadModel(id: string): SavedModel | null {
  const models = listAllModels();
  return models.find(m => m.id === id) || null;
}

export function deleteModel(id: string): void {
  const models = listAllModels().filter(m => m.id !== id);
  safeSetStorage(STORAGE_KEY, models);
}

export function duplicateModel(id: string, newName: string): SavedModel | null {
  const original = loadModel(id);
  if (!original) return null;
  return saveModel(original.inputs, newName, original.notes, original.tags);
}

export function exportModelJSON(model: SavedModel): void {
  const json = JSON.stringify(model, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(model.name)}_${model.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importModelJSON(json: string): SavedModel | null {
  try {
    const model = JSON.parse(json) as SavedModel;
    if (!model.inputs || !model.name) return null;
    // Re-save with new ID
    return saveModel(model.inputs, model.name + ' (imported)', model.notes, model.tags);
  } catch {
    return null;
  }
}

// ── Built-in templates ────────────────────────────────────

export const MODEL_TEMPLATES: Array<{
  id: string;
  name: string;
  description: string;
  category: 'multifamily' | 'student' | 'condo' | 'retail';
  inputs: Partial<ModelInputs>;
}> = [
  {
    id: 'tpl_multifamily_standard',
    name: 'Multifamily — Standard',
    description: '4-over-1 podium, market rate + affordable mix, Austin-style',
    category: 'multifamily',
    inputs: {
      // Uses DEFAULT_INPUTS as base — pre-filled
    },
  },
  {
    id: 'tpl_student_housing',
    name: 'Student Housing',
    description: 'By-the-bed model, high density, near-campus',
    category: 'student',
    inputs: {
      dealName: 'Student Housing Deal',
      studioUnits: 0,
      br1Units: 20,
      br1AvgSF: 500,
      br2Units: 30,
      br2AvgSF: 700,
      br3Units: 20,
      br3AvgSF: 900,
      ahBr1Units: 0,
      ahBr2Units: 0,
      resiRentPerNSF: 2.5,
      miscIncomePerUnit: 50,
      utilities: 600,
      repairsMaintenance: 400,
      labor: 700,
      insurance: 300,
      gaServiceContracts: 250,
      marketingLeasing: 200,
      resiOccAtTCO: 0.60,     // Students pre-lease
      resiStabilizedOcc: 0.97, // Very high occupancy
    },
  },
  {
    id: 'tpl_condo',
    name: 'For-Sale Condos',
    description: 'Sell-out model, no rental income, condo HOA',
    category: 'condo',
    inputs: {
      dealName: 'Condo Project',
      resiRentPerNSF: 0,          // No rent — sell-out
      resiCapRate: 0,             // Not applicable
      resiSaleMonthPostTCO: 12,   // Sell during construction/shortly after
      miscIncomePerUnit: 0,
      utilities: 0,
      repairsMaintenance: 0,
      labor: 0,
      managementFeePercent: 0,
    },
  },
];

export function applyTemplate(templateId: string): ModelInputs {
  const tpl = MODEL_TEMPLATES.find(t => t.id === templateId);
  if (!tpl) return DEFAULT_INPUTS;
  return { ...DEFAULT_INPUTS, ...tpl.inputs };
}
