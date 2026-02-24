// ============================================================
// PDF Parser — Offering Memorandum intelligent extractor
// v2: line-by-line table scanning + context-aware heuristics
// ============================================================

export interface PDFExtractedInfo {
  // Identity
  dealName?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;

  // Unit mix
  totalUnits?: number;
  studioUnits?: number;
  studioAvgSF?: number;
  br1Units?: number;
  br1AvgSF?: number;
  br2Units?: number;
  br2AvgSF?: number;
  br3Units?: number;
  br3AvgSF?: number;
  ahUnits?: number;
  parkingSpaces?: number;

  // Floor areas
  totalGSF?: number;
  residentialGSF?: number;
  retailGSF?: number;
  parkingGSF?: number;
  amenityGSF?: number;

  // Financials
  landPrice?: number;
  landAcres?: number;
  totalCost?: number;
  hardCostsPSF?: number;
  hardCostsTotal?: number;

  // Rents
  resiRentPSF?: number;    // $/NSF/month
  retailRentPSF?: number;

  // Timing
  preconstructionMonths?: number;
  constructionMonths?: number;
  totalMonths?: number;

  // Meta
  description?: string;
  rawText: string;
  confidence: number;
  matchedFields: string[];
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────
// TEXT EXTRACTION
// ─────────────────────────────────────────────────────────────
async function extractTextFromPDF(file: File): Promise<{ pages: string[]; full: string }> {
  const pdfjsLib = await import('pdfjs-dist');
  // Use local worker copy (copied from node_modules to public/)
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= Math.min(pdf.numPages, 30); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Reconstruct text preserving line breaks via Y-position grouping
    const items = content.items as Array<{ str: string; transform: number[] }>;
    items.sort((a, b) => {
      const yDiff = b.transform[5] - a.transform[5]; // descending y (top→bottom)
      return Math.abs(yDiff) > 3 ? yDiff : a.transform[4] - b.transform[4]; // then x
    });

    let pageText = '';
    let lastY = -1;
    for (const item of items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== -1 && Math.abs(y - lastY) > 3) pageText += '\n';
      else if (lastY !== -1) pageText += ' ';
      pageText += item.str;
      lastY = y;
    }
    pages.push(pageText);
  }

  return { pages, full: pages.join('\n\n=== PAGE BREAK ===\n\n') };
}

// ─────────────────────────────────────────────────────────────
// TEXT NORMALIZATION
// ─────────────────────────────────────────────────────────────
function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix split numbers like "105 ,000" or "105, 000"
    .replace(/(\d)\s*,\s*(\d{3})/g, '$1,$2')
    // Fix "S F" → "SF", "Sq Ft" → "sqft"
    .replace(/\bS\s+F\b/g, 'SF')
    .replace(/\bsq\.?\s+ft\.?\b/gi, 'sqft')
    // Normalize unit type formats
    .replace(/\b1\s*-\s*bed(?:room)?\b/gi, '1BR')
    .replace(/\b2\s*-\s*bed(?:room)?\b/gi, '2BR')
    .replace(/\b3\s*-\s*bed(?:room)?\b/gi, '3BR')
    .replace(/\bone[\s-]bed(?:room)?\b/gi, '1BR')
    .replace(/\btwo[\s-]bed(?:room)?\b/gi, '2BR')
    .replace(/\bthree[\s-]bed(?:room)?\b/gi, '3BR')
    .replace(/\b1\s*b\/1\s*ba?\b/gi, '1BR')
    .replace(/\b2\s*b\/2\s*ba?\b/gi, '2BR')
    .replace(/\b3\s*b\/2\s*ba?\b/gi, '3BR')
    // Collapse excessive whitespace on a line but keep newlines
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n');
}

// ─────────────────────────────────────────────────────────────
// NUMBER HELPERS
// ─────────────────────────────────────────────────────────────
function parseNum(s: string): number {
  return parseFloat(s.replace(/[$,\s]/g, ''));
}

function numbersInLine(line: string): number[] {
  const matches = line.match(/[\d,]+(?:\.\d+)?/g) ?? [];
  return matches.map(m => parseNum(m)).filter(n => !isNaN(n) && n > 0);
}

function firstNumInRange(line: string, min: number, max: number): number | undefined {
  for (const n of numbersInLine(line)) {
    if (n >= min && n <= max) return n;
  }
  return undefined;
}

function findInText(text: string, patterns: RegExp[]): number | undefined {
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const raw = (m[1] ?? m[0]).replace(/[$,\s]/g, '');
      const n = parseFloat(raw);
      if (!isNaN(n) && n > 0) {
        const full = m[0].toLowerCase();
        if (/\bmillion\b|\bm\b/.test(full) && n < 10000) return n * 1_000_000;
        if (/\bthousand\b|\bk\b/.test(full) && n < 100000) return n * 1_000;
        return n;
      }
    }
  }
  return undefined;
}

// ─────────────────────────────────────────────────────────────
// LINE-LEVEL UNIT MIX TABLE SCANNER
// ─────────────────────────────────────────────────────────────
interface UnitMixScan {
  studioUnits?: number; studioAvgSF?: number;
  br1Units?: number;    br1AvgSF?: number;
  br2Units?: number;    br2AvgSF?: number;
  br3Units?: number;    br3AvgSF?: number;
  ahUnits?: number;
  totalUnits?: number;  totalAvgSF?: number;
  parkingSpaces?: number;
}

// Given a line, try to classify it as a unit type row and extract count + avg SF
function scanUnitLine(line: string, nextLines: string[]): { type: string; count?: number; avgSF?: number } | null {
  const l = line.toLowerCase().trim();

  const typeMap: [RegExp, string][] = [
    [/\bstudio\b/,                           'studio'],
    [/\bjunior\s+1/,                         'studio'],  // Jr 1BR → studio
    [/\b1\s*br\b|\bone\s*bed|\b1\s*bed/,     '1BR'],
    [/\b2\s*br\b|\btwo\s*bed|\b2\s*bed/,     '2BR'],
    [/\b3\s*br\b|\bthree\s*bed|\b3\s*bed/,   '3BR'],
    [/\b4\s*br\b|\bfour\s*bed|\b4\s*bed/,    '3BR'],  // lump 4BR into 3BR
    [/\btownhome|townhouse|town\s*home/,      '3BR'],
    [/\baffordable|income.?restrict|ami\b|at\s+60%|at\s+80%|at\s+50%/, 'AH'],
    [/\bparking\s+space|stall|garage\s+space/, 'parking'],
    [/\btotal\b/,                             'total'],
  ];

  let matchedType: string | null = null;
  for (const [re, type] of typeMap) {
    if (re.test(l)) { matchedType = type; break; }
  }
  if (!matchedType) return null;

  // Collect numbers from this line + up to 2 next lines (handles multi-line table cells)
  const context = [line, ...nextLines.slice(0, 2)].join(' ');
  const nums = numbersInLine(context);

  // Heuristics: count ∈ [1, 400], avgSF ∈ [200, 2500]
  const count  = nums.find(n => n >= 1   && n <= 400  && Number.isInteger(n));
  const avgSF  = nums.find(n => n >= 200 && n <= 2500 && n !== count);

  return { type: matchedType, count, avgSF };
}

function parseUnitMixTable(text: string): UnitMixScan {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: UnitMixScan = {};

  for (let i = 0; i < lines.length; i++) {
    const parsed = scanUnitLine(lines[i], lines.slice(i + 1, i + 4));
    if (!parsed) continue;

    const { type, count, avgSF } = parsed;

    if (type === 'studio') {
      if (count && !result.studioUnits) result.studioUnits = count;
      if (avgSF  && !result.studioAvgSF) result.studioAvgSF = avgSF;
    } else if (type === '1BR') {
      if (count && !result.br1Units) result.br1Units = count;
      if (avgSF  && !result.br1AvgSF) result.br1AvgSF = avgSF;
    } else if (type === '2BR') {
      if (count && !result.br2Units) result.br2Units = count;
      if (avgSF  && !result.br2AvgSF) result.br2AvgSF = avgSF;
    } else if (type === '3BR') {
      if (count && !result.br3Units) result.br3Units = count;
      if (avgSF  && !result.br3AvgSF) result.br3AvgSF = avgSF;
    } else if (type === 'AH') {
      if (count && !result.ahUnits) result.ahUnits = count;
    } else if (type === 'parking') {
      if (count && !result.parkingSpaces) result.parkingSpaces = count;
    } else if (type === 'total') {
      if (count && count > 1 && !result.totalUnits) result.totalUnits = count;
      if (avgSF  && !result.totalAvgSF) result.totalAvgSF = avgSF;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// FLOOR AREA TABLE SCANNER
// ─────────────────────────────────────────────────────────────
interface SFScan {
  totalGSF?: number;
  residentialGSF?: number;
  retailGSF?: number;
  parkingGSF?: number;
  amenityGSF?: number;
}

function parseSFBreakdown(text: string): SFScan {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const result: SFScan = {};

  for (const line of lines) {
    const l = line.toLowerCase();
    // Extract any number >= 1000 (plausible SF value)
    const sf = firstNumInRange(line, 1_000, 2_000_000);
    if (!sf) continue;

    if (/\bsf\b|sqft|square\s*feet|sq\.\s*ft|gross/.test(l)) {
      if (/\bresidential\b|\bapartment\b|\bresi\b/.test(l) && !result.residentialGSF)
        result.residentialGSF = sf;
      else if (/\bretail\b|\bcommercial\b|\bground.floor\b/.test(l) && !result.retailGSF)
        result.retailGSF = sf;
      else if (/\bparking\b|\bgarage\b/.test(l) && !result.parkingGSF)
        result.parkingGSF = sf;
      else if (/\bamenity|amenities|common\s*area|clubhouse/.test(l) && !result.amenityGSF)
        result.amenityGSF = sf;
      else if (/\btotal\b|\bgross\b|\bgfa\b|\bgsf\b/.test(l) && !result.totalGSF)
        result.totalGSF = sf;
    } else if (/\bgsf\b|\bgfa\b/.test(l)) {
      // "105,000 GSF" or "GSF: 105,000" without "square feet"
      if (!result.totalGSF) result.totalGSF = sf;
    }
  }

  // If we have breakdown but no total, compute it
  if (!result.totalGSF) {
    const sum = (result.residentialGSF ?? 0) + (result.retailGSF ?? 0) +
                (result.parkingGSF ?? 0) + (result.amenityGSF ?? 0);
    if (sum > 1000) result.totalGSF = sum;
  }

  return result;
}

// ─────────────────────────────────────────────────────────────
// WHOLE-TEXT REGEX EXTRACTIONS
// ─────────────────────────────────────────────────────────────
function extractAddress(text: string): { address?: string; city?: string; state?: string; zip?: string } {
  const patterns = [
    /(\d{3,5}\s+[A-Z][A-Za-z0-9\s\.\-'#]+(?:Blvd|Boulevard|Ave|Avenue|St|Street|Dr|Drive|Rd|Road|Lane|Ln|Court|Ct|Way|Pkwy|Parkway|Place|Pl)\.?)\s*[,\n]?\s*([A-Za-z\s]+),\s*([A-Z]{2})\s*(\d{5})?/,
    /(\d{3,5}\s+[A-Z][A-Za-z0-9\s\.\-'#]+(?:Blvd|Boulevard|Ave|Avenue|St|Street|Dr|Drive|Rd|Road|Lane|Ln|Court|Ct|Way|Pkwy|Parkway|Place|Pl)\.?)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const result: ReturnType<typeof extractAddress> = { address: m[1].trim() };
      if (m[2]) result.city  = m[2].trim();
      if (m[3]) result.state = m[3].trim();
      if (m[4]) result.zip   = m[4].trim();
      return result;
    }
  }
  return {};
}

function extractDealName(text: string, address?: string): string | undefined {
  const patterns = [
    /(?:project|property|development)\s+(?:name|overview)\s*[:\-–—]\s*([^\n]{5,70})/i,
    /^([A-Z][A-Za-z0-9\s&''\-\.]{4,55})\s*[\n\r][\s\S]{0,200}?(?:apartments?|residences?|flats?|living|tower|district|commons?|crossing|place|project)/i,
    /(?:the\s+)?([A-Z][A-Za-z0-9\s&''\-]{3,40})\s+(?:apartments?|residences?|development|project|mixed.?use)/i,
  ];
  for (const pat of patterns) {
    const m = text.match(pat);
    if (m?.[1] && m[1].length > 3 && !/^(page|the|this|a|an)\s/i.test(m[1])) {
      return m[1].trim().replace(/[\n\r][\s\S]*/g, '').trim();
    }
  }
  if (address) return address.split(',')[0].trim();
  return undefined;
}

function extractLandPrice(text: string): number | undefined {
  return findInText(text, [
    /land\s+(?:price|cost|value|acquisition)\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /\$?([\d,.]+)\s*([Mm])\s+land\s+(?:price|cost|purchase)/i,
    /site\s+(?:price|cost|acquisition)\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /acquired?\s+(?:the\s+site\s+)?for\s+\$?([\d,.]+)\s*([MmKk])?/i,
    /purchase\s+price\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /land\s*\n?\$?([\d,.]+)/i,
  ]);
}

function extractTotalCost(text: string): number | undefined {
  return findInText(text, [
    /total\s+(?:project|development)\s+cost\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /total\s+capitalization\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /(?:total\s+)?development\s+budget\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /total\s+cost\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /project\s+budget\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
  ]);
}

function extractHardCosts(text: string): { total?: number; psf?: number } {
  const total = findInText(text, [
    /hard\s+costs?\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /construction\s+costs?\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
    /building\s+costs?\s*[:\-–]\s*\$?([\d,.]+)\s*([MmKk])?/i,
  ]);
  const psf = findInText(text, [
    /hard\s+costs?\s*[:\-–\s]+\$?([\d,.]+)\s*\/?\s*(?:gsf|sf|sqft)/i,
    /\$?([\d,.]+)\s*\/?\s*(?:gsf|sf)\s+hard\s+costs?/i,
    /construction\s+cost.*?\$?([\d,.]+)\s*\/?\s*(?:gsf|sf)/i,
  ]);
  return { total, psf };
}

function extractRents(text: string): { resiPSF?: number; retailPSF?: number } {
  const resiPSF = findInText(text, [
    /\$?([\d.]+)\s*\/\s*(?:nsf|sf|sqft)\s*\/?\s*(?:mo|month).*?(?:resi|apartment|unit)/i,
    /(?:resi|residential|apartment)\s+rent.*?\$?([\d.]+)\s*\/\s*(?:nsf|sf|sqft)/i,
    /avg.*?rent.*?\$?([\d.]+)\s*\/\s*(?:nsf|sf|sqft)/i,
  ]);
  const retailPSF = findInText(text, [
    /retail\s+rent.*?\$?([\d.]+)\s*\/\s*(?:nsf|sf|sqft|nnn)/i,
    /\$?([\d.]+)\s*\/\s*(?:sf|sqft)\s*(?:nnn|triple)/i,
    /(?:nnn|triple\s+net)\s+rent.*?\$?([\d.]+)/i,
  ]);
  return { resiPSF, retailPSF };
}

function extractTiming(text: string): { precon?: number; construction?: number; total?: number } {
  const precon = findInText(text, [
    /pre-?construction[:\s]+(\d+)\s*months?/i,
    /(\d+)\s*months?\s+pre-?construction/i,
    /entitlement[:\s]+(\d+)\s*months?/i,
    /predevelopment[:\s]+(\d+)\s*months?/i,
  ]);
  const construction = findInText(text, [
    /construction[:\s]+(\d+)\s*months?(?!\s+pre)/i,
    /(\d+)\s*months?\s+(?:of\s+)?construction/i,
    /build[:\s]+(\d+)\s*months?/i,
    /construction\s+period[:\s]+(\d+)/i,
    /(\d+)-month\s+construction/i,
  ]);
  const total = findInText(text, [
    /total\s+(?:project\s+)?duration[:\s]+(\d+)\s*months?/i,
    /(\d+)\s*months?\s+total/i,
    /(\d+)-month\s+(?:total\s+)?(?:project|development)/i,
  ]);
  return { precon, construction, total };
}

function extractLandAcres(text: string): number | undefined {
  return findInText(text, [
    /([\d.]+)\s+acres?(?:\s+site|\s+parcel|\s+lot)?/i,
    /site\s+(?:area|size)[:\s]+([\d.]+)\s*acres?/i,
    /parcel[:\s]+([\d.]+)\s*acres?/i,
    /lot\s+size[:\s]+([\d.]+)\s*acres?/i,
  ]);
}

function extractTotalUnits(text: string): number | undefined {
  return findInText(text, [
    /(\d+)\s*(?:total\s+)?(?:residential\s+)?(?:apartment\s+)?units?(?:\s+of\s+|\s+across\s+|\s+in\s+|\s+including|\s+total|$)/i,
    /total\s+units?[:\s]+(\d+)/i,
    /unit\s+count[:\s]+(\d+)/i,
    /(\d+)\s*-?\s*unit\s+(?:development|project|building|complex|community|community)/i,
    /(\d+)\s+(?:luxury|market.rate|affordable|class.?[abc])\s+(?:apartment\s+)?units?/i,
    /(?:consists?\s+of|comprising\s+of?|includes?\s+of?)\s+(\d+)\s+(?:apartment\s+)?units?/i,
    /(\d+)\s+(?:apartment\s+)?homes?/i,
  ]);
}

// ─────────────────────────────────────────────────────────────
// MAIN PARSE FUNCTION
// ─────────────────────────────────────────────────────────────
export async function parsePDF(file: File): Promise<PDFExtractedInfo> {
  const matchedFields: string[] = [];
  const warnings: string[] = [];

  let rawText = '';
  let pages: string[] = [];

  try {
    const extracted = await extractTextFromPDF(file);
    rawText = extracted.full;
    pages = extracted.pages;
  } catch (e: unknown) {
    warnings.push(`PDF extraction failed: ${e instanceof Error ? e.message : 'unknown'}`);
    return { rawText: '', confidence: 0, matchedFields: [], warnings };
  }

  // Normalize
  const text  = normalizeText(rawText);
  const textL = text.toLowerCase();

  const result: PDFExtractedInfo = {
    rawText: text.slice(0, 8000),
    confidence: 0,
    matchedFields,
    warnings,
  };

  // ── 1. ADDRESS & NAME ──────────────────────────────────────
  const addrResult = extractAddress(text);
  if (addrResult.address) {
    result.address = addrResult.address;
    result.city    = addrResult.city;
    result.state   = addrResult.state;
    result.zip     = addrResult.zip;
    matchedFields.push('address');
    if (addrResult.city)  matchedFields.push('city');
    if (addrResult.state) matchedFields.push('state');
  }

  result.dealName = extractDealName(text, result.address);
  if (result.dealName) matchedFields.push('dealName');

  // ── 2. UNIT MIX TABLE SCAN (line-by-line) ─────────────────
  // Run on each page independently (better table isolation)
  let bestUnitScan: UnitMixScan = {};
  let bestUnitFields = 0;

  for (const page of pages) {
    const scan = parseUnitMixTable(normalizeText(page));
    const fields = Object.keys(scan).filter(k => scan[k as keyof UnitMixScan] !== undefined).length;
    if (fields > bestUnitFields) {
      bestUnitScan = scan;
      bestUnitFields = fields;
    }
  }

  // Also run on full text
  const fullScan = parseUnitMixTable(text);
  const fullFields = Object.keys(fullScan).filter(k => fullScan[k as keyof UnitMixScan] !== undefined).length;
  if (fullFields > bestUnitFields) bestUnitScan = fullScan;

  if (bestUnitScan.studioUnits !== undefined) { result.studioUnits = bestUnitScan.studioUnits; matchedFields.push('studioUnits'); }
  if (bestUnitScan.studioAvgSF !== undefined) { result.studioAvgSF = bestUnitScan.studioAvgSF; matchedFields.push('studioAvgSF'); }
  if (bestUnitScan.br1Units    !== undefined) { result.br1Units    = bestUnitScan.br1Units;    matchedFields.push('br1Units'); }
  if (bestUnitScan.br1AvgSF   !== undefined) { result.br1AvgSF    = bestUnitScan.br1AvgSF;    matchedFields.push('br1AvgSF'); }
  if (bestUnitScan.br2Units    !== undefined) { result.br2Units    = bestUnitScan.br2Units;    matchedFields.push('br2Units'); }
  if (bestUnitScan.br2AvgSF   !== undefined) { result.br2AvgSF    = bestUnitScan.br2AvgSF;    matchedFields.push('br2AvgSF'); }
  if (bestUnitScan.br3Units    !== undefined) { result.br3Units    = bestUnitScan.br3Units;    matchedFields.push('br3Units'); }
  if (bestUnitScan.br3AvgSF   !== undefined) { result.br3AvgSF    = bestUnitScan.br3AvgSF;    matchedFields.push('br3AvgSF'); }
  if (bestUnitScan.ahUnits     !== undefined) { result.ahUnits     = bestUnitScan.ahUnits;     matchedFields.push('ahUnits'); }
  if (bestUnitScan.parkingSpaces !== undefined) { result.parkingSpaces = bestUnitScan.parkingSpaces; matchedFields.push('parkingSpaces'); }

  // Total units: prefer explicit scan, else sum from unit mix, else regex
  if (bestUnitScan.totalUnits) {
    result.totalUnits = bestUnitScan.totalUnits;
    matchedFields.push('totalUnits');
  } else {
    const summed = (result.studioUnits ?? 0) + (result.br1Units ?? 0) +
                   (result.br2Units ?? 0) + (result.br3Units ?? 0);
    if (summed > 0) {
      result.totalUnits = summed;
      matchedFields.push('totalUnits');
    } else {
      const fromRegex = extractTotalUnits(text);
      if (fromRegex) { result.totalUnits = fromRegex; matchedFields.push('totalUnits'); }
    }
  }

  // ── 3. UNIT-LEVEL REGEX FALLBACK ──────────────────────────
  // If table scan missed some types, try regex fallback
  if (!result.studioUnits) {
    const n = findInText(text, [/(\d+)\s+studio/i, /studio\s*[:\-–]\s*(\d+)/i, /studios?\s+\((\d+)\)/i]);
    if (n) { result.studioUnits = n; matchedFields.push('studioUnits'); }
  }
  if (!result.br1Units) {
    const n = findInText(text, [/(\d+)\s+1BR\b/i, /(\d+)\s+1[\s-]bed/i, /1BR[:\s]+(\d+)/i, /one[\s-]bed[:\s]+(\d+)/i, /1-bedroom[:\s]+(\d+)/i]);
    if (n) { result.br1Units = n; matchedFields.push('br1Units'); }
  }
  if (!result.br2Units) {
    const n = findInText(text, [/(\d+)\s+2BR\b/i, /(\d+)\s+2[\s-]bed/i, /2BR[:\s]+(\d+)/i, /two[\s-]bed[:\s]+(\d+)/i, /2-bedroom[:\s]+(\d+)/i]);
    if (n) { result.br2Units = n; matchedFields.push('br2Units'); }
  }
  if (!result.br3Units) {
    const n = findInText(text, [/(\d+)\s+3BR\b/i, /(\d+)\s+3[\s-]bed/i, /3BR[:\s]+(\d+)/i, /three[\s-]bed[:\s]+(\d+)/i, /3-bedroom[:\s]+(\d+)/i]);
    if (n) { result.br3Units = n; matchedFields.push('br3Units'); }
  }
  if (!result.ahUnits) {
    const n = findInText(text, [
      /(\d+)\s+affordable/i, /(\d+)\s+income[\s-]restrict/i,
      /(\d+)\s+(?:units?\s+)?at\s+(?:60|80|50|30)%\s+ami/i,
      /affordable\s+housing[:\s]+(\d+)/i,
    ]);
    if (n) { result.ahUnits = n; matchedFields.push('ahUnits'); }
  }

  // ── 4. FLOOR AREA TABLE SCAN ──────────────────────────────
  let bestSFScan: SFScan = {};
  let bestSFFields = 0;

  for (const page of pages) {
    const scan = parseSFBreakdown(normalizeText(page));
    const fields = Object.keys(scan).filter(k => scan[k as keyof SFScan] !== undefined).length;
    if (fields > bestSFFields) { bestSFScan = scan; bestSFFields = fields; }
  }

  // Full text fallback
  const fullSFScan = parseSFBreakdown(text);
  const fullSFFields = Object.keys(fullSFScan).filter(k => fullSFScan[k as keyof SFScan] !== undefined).length;
  if (fullSFFields > bestSFFields) bestSFScan = fullSFScan;

  if (bestSFScan.totalGSF       && bestSFScan.totalGSF       > 1000) { result.totalGSF       = bestSFScan.totalGSF;       matchedFields.push('totalGSF'); }
  if (bestSFScan.residentialGSF && bestSFScan.residentialGSF > 1000) { result.residentialGSF = bestSFScan.residentialGSF; matchedFields.push('residentialGSF'); }
  if (bestSFScan.retailGSF      && bestSFScan.retailGSF      > 100)  { result.retailGSF      = bestSFScan.retailGSF;      matchedFields.push('retailGSF'); }
  if (bestSFScan.parkingGSF     && bestSFScan.parkingGSF     > 1000) { result.parkingGSF     = bestSFScan.parkingGSF;     matchedFields.push('parkingGSF'); }
  if (bestSFScan.amenityGSF     && bestSFScan.amenityGSF     > 100)  { result.amenityGSF     = bestSFScan.amenityGSF;     matchedFields.push('amenityGSF'); }

  // GSF fallback: regex on full text
  if (!result.totalGSF) {
    const n = findInText(text, [
      /(\d[\d,]+)\s*(?:gross\s+)?square\s+feet?\s*(?:gsf|gfa)?/i,
      /(?:gsf|gfa|total\s+area)\s*[:\-–]\s*([\d,]+)/i,
      /(\d[\d,]+)\s*(?:sf|sqft)\s+(?:total|gross|building)/i,
      /building\s+size[:\s]+([\d,]+)\s*(?:sf|sqft)/i,
    ]);
    if (n && n > 1000) { result.totalGSF = n; matchedFields.push('totalGSF'); }
  }
  if (!result.retailGSF) {
    const n = findInText(text, [
      /(\d[\d,]+)\s*(?:sf|sqft)?\s*(?:of\s+)?retail/i,
      /retail[:\-–\s]+([\d,]+)\s*(?:sf|sqft)/i,
      /ground.?floor\s+retail[:\-–\s]+([\d,]+)/i,
    ]);
    if (n && n > 100) { result.retailGSF = n; matchedFields.push('retailGSF'); }
  }

  // Derive residential GSF if missing
  if (!result.residentialGSF) {
    if (result.totalGSF && result.retailGSF) {
      // Rough: total - retail - parking estimate
      result.residentialGSF = result.totalGSF - result.retailGSF - (result.parkingGSF ?? 0) - (result.amenityGSF ?? 0);
      if (result.residentialGSF > 5000) matchedFields.push('residentialGSF');
    } else if (result.totalUnits) {
      // Estimate from avg unit size × efficiency
      const avgBRSF = (
        (result.studioAvgSF ?? 0) * (result.studioUnits ?? 0) +
        (result.br1AvgSF    ?? 0) * (result.br1Units    ?? 0) +
        (result.br2AvgSF    ?? 0) * (result.br2Units    ?? 0) +
        (result.br3AvgSF    ?? 0) * (result.br3Units    ?? 0)
      );
      if (avgBRSF > 0) {
        result.residentialGSF = Math.round(avgBRSF / 0.9); // 90% efficiency
        matchedFields.push('residentialGSF');
      }
    }
  }

  // ── 5. FINANCIALS ─────────────────────────────────────────
  const lp = extractLandPrice(text);
  if (lp) { result.landPrice = lp; matchedFields.push('landPrice'); }

  const tc = extractTotalCost(text);
  if (tc) { result.totalCost = tc; matchedFields.push('totalCost'); }

  const la = extractLandAcres(text);
  if (la) { result.landAcres = la; matchedFields.push('landAcres'); }

  const hc = extractHardCosts(text);
  if (hc.total) { result.hardCostsTotal = hc.total; matchedFields.push('hardCostsTotal'); }
  if (hc.psf)   { result.hardCostsPSF   = hc.psf;   matchedFields.push('hardCostsPSF'); }

  const rents = extractRents(text);
  if (rents.resiPSF)   { result.resiRentPSF   = rents.resiPSF;   matchedFields.push('resiRentPSF'); }
  if (rents.retailPSF) { result.retailRentPSF = rents.retailPSF; matchedFields.push('retailRentPSF'); }

  // ── 6. TIMING ─────────────────────────────────────────────
  const timing = extractTiming(text);
  if (timing.precon) {
    result.preconstructionMonths = Math.round(timing.precon);
    matchedFields.push('preconstructionMonths');
  }
  if (timing.construction) {
    result.constructionMonths = Math.round(timing.construction);
    matchedFields.push('constructionMonths');
  }
  if (timing.total) {
    result.totalMonths = Math.round(timing.total);
    matchedFields.push('totalMonths');
  }

  // ── 7. DESCRIPTION ────────────────────────────────────────
  const descMatch = text.match(
    /(?:project\s+overview|executive\s+summary|investment\s+summary|description)[:\-–\s]*([^\n]{80,600})/i
  );
  if (descMatch) result.description = descMatch[1].trim().slice(0, 400);

  // ── 8. CONFIDENCE SCORING ─────────────────────────────────
  // Weighted: unit mix fields 3pts each, GSF 2pts each, financials 2pts
  const weights: Record<string, number> = {
    address: 1, dealName: 1,
    totalUnits: 3, studioUnits: 2, br1Units: 3, br2Units: 3, br3Units: 2,
    studioAvgSF: 2, br1AvgSF: 2, br2AvgSF: 2, br3AvgSF: 2,
    totalGSF: 2, residentialGSF: 2, retailGSF: 2, parkingGSF: 1, amenityGSF: 1,
    landPrice: 3, totalCost: 2, landAcres: 1,
    hardCostsTotal: 2, hardCostsPSF: 2,
    resiRentPSF: 2, retailRentPSF: 1,
    preconstructionMonths: 1, constructionMonths: 2,
  };
  const maxScore = 40;
  const score = matchedFields.reduce((s, f) => s + (weights[f] ?? 1), 0);
  result.confidence = Math.min(1, score / maxScore);
  result.matchedFields = [...new Set(matchedFields)]; // deduplicate

  // ── 9. WARNINGS ───────────────────────────────────────────
  if (matchedFields.length === 0)
    warnings.push('No data found — PDF may be image-scanned or use unusual formatting');
  if (!result.address)
    warnings.push('Address not found — enter manually');
  if (!result.totalUnits && !result.br1Units && !result.br2Units)
    warnings.push('Unit count not found — check unit mix table page');
  if (!result.totalGSF && !result.residentialGSF)
    warnings.push('Building SF not found — enter manually');
  if (!result.landPrice)
    warnings.push('Land price not found — enter manually');

  return result;
}

// ─────────────────────────────────────────────────────────────
// MAP TO MODEL INPUTS
// ─────────────────────────────────────────────────────────────
import { ModelInputs, DEFAULT_INPUTS } from './model';
import { ZERO_INPUTS } from './validation';

export function pdfInfoToModelInputs(info: PDFExtractedInfo): Partial<ModelInputs> {
  const p: Partial<ModelInputs> = {};

  // Identity
  if (info.dealName)  p.dealName = info.dealName;
  if (info.address)   { p.address = info.address; if (!p.dealName) p.dealName = info.address.split(',')[0]; }
  if (info.city || info.state)
    p.cityStateZip = [info.city, info.state, info.zip].filter(Boolean).join(', ');

  // Units
  if (info.studioUnits !== undefined) p.studioUnits = info.studioUnits;
  if (info.studioAvgSF !== undefined) p.studioAvgSF = info.studioAvgSF;
  if (info.br1Units    !== undefined) p.br1Units    = info.br1Units;
  if (info.br1AvgSF    !== undefined) p.br1AvgSF    = info.br1AvgSF;
  if (info.br2Units    !== undefined) p.br2Units    = info.br2Units;
  if (info.br2AvgSF    !== undefined) p.br2AvgSF    = info.br2AvgSF;
  if (info.br3Units    !== undefined) p.br3Units    = info.br3Units;
  if (info.br3AvgSF    !== undefined) p.br3AvgSF    = info.br3AvgSF;
  if (info.parkingSpaces !== undefined) p.parkingSpaces = info.parkingSpaces;

  // AH units — split 1BR/2BR 40/60
  if (info.ahUnits && info.ahUnits > 0) {
    p.ahBr1Units = Math.round(info.ahUnits * 0.40);
    p.ahBr2Units = info.ahUnits - p.ahBr1Units;
  }

  // Floor areas
  if (info.residentialGSF && info.residentialGSF > 1000)
    p.residentialGSF = Math.round(info.residentialGSF);
  if (info.retailGSF    && info.retailGSF    > 100)  p.retailGSF  = Math.round(info.retailGSF);
  if (info.parkingGSF   && info.parkingGSF   > 1000) p.parkingGSF = Math.round(info.parkingGSF);
  if (info.amenityGSF   && info.amenityGSF   > 100)  p.amenityGSF = Math.round(info.amenityGSF);

  // Financials
  if (info.landPrice)       p.landPrice            = Math.round(info.landPrice / 1000) * 1000;
  if (info.hardCostsPSF)    p.hardCostsApartmentsPSF = info.hardCostsPSF;
  if (info.hardCostsTotal)  { p.hardCostsApartments = Math.round(info.hardCostsTotal / 10000) * 10000; }
  if (info.resiRentPSF)     p.resiRentPerNSF  = info.resiRentPSF;
  if (info.retailRentPSF)   p.retailRentPerNSF = info.retailRentPSF;

  // Timing
  if (info.preconstructionMonths) p.preconstructionMonths = info.preconstructionMonths;
  if (info.constructionMonths)    p.constructionMonths    = info.constructionMonths;

  return p;
}

export function mergeWithZero(partial: Partial<ModelInputs>): ModelInputs {
  return { ...ZERO_INPUTS, ...partial };
}

/**
 * Merge PDF-extracted partial inputs with DEFAULT_INPUTS as the base.
 * This ensures all model parameters (financing rates, cap rates, OpEx percentages,
 * tax rate, etc.) have sensible defaults even when not extracted from the PDF.
 * Only deal-specific fields (unit mix, GSF, land price, rents) come from the PDF.
 */
export function mergeWithDefaults(partial: Partial<ModelInputs>): ModelInputs {
  // Start from DEFAULT_INPUTS (has all sensible model defaults)
  // but zero out the deal-specific unit mix / GSF / financial fields
  // so the PDF fill-in form shows blank (not the Lamar deal numbers)
  const dealSpecificZeros: Partial<ModelInputs> = {
    dealName: '',
    address: '',
    cityStateZip: '',
    // Unit mix
    studioUnits: 0, studioAvgSF: 0,
    br1Units: 0, br1AvgSF: 0,
    br2Units: 0, br2AvgSF: 0,
    br3Units: 0, br3AvgSF: 0,
    ahBr1Units: 0, ahBr1AvgSF: 0,
    ahBr2Units: 0, ahBr2AvgSF: 0,
    parkingSpaces: 0,
    // Building size
    residentialGSF: 0, retailGSF: 0, parkingGSF: 0, amenityGSF: 0,
    // Financials
    landPrice: 0, hardCostsApartments: 0, hardCostsPodium: 0, ffAndE: 0,
    hardCostsApartmentsPSF: 0, hardCostsPodiumPSF: 0,
    // Rents
    resiRentPerNSF: 0, retailRentPerNSF: 0,
    // Timing
    preconstructionMonths: 0, constructionMonths: 0,
  };
  return { ...DEFAULT_INPUTS, ...dealSpecificZeros, ...partial };
}
