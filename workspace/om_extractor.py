#!/usr/bin/env python3
"""
om_extractor.py — Reusable Real Estate OM (Offering Memorandum) Extractor
Author: Ninja 🥷 / OpenClaw
Usage:
    python3 om_extractor.py <path-to-om.pdf> [--llm] [--output-dir ./]

Modes:
    Default: PyMuPDF text extraction + regex parsing (fast, offline)
    --llm:   Sends extracted text to Claude API for structured JSON extraction (requires ANTHROPIC_API_KEY)
    --pages: Comma-separated page numbers to render as images for vision LLM

Dependencies:
    pip install pymupdf anthropic
"""

import sys
import os
import re
import json
import argparse
from pathlib import Path


# ─────────────────────────────────────────────
# 1. PDF TEXT EXTRACTION (PyMuPDF)
# ─────────────────────────────────────────────

def extract_text(pdf_path: str) -> tuple[str, dict]:
    """Extract full text and metadata from PDF using PyMuPDF."""
    try:
        import fitz  # pymupdf
    except ImportError:
        print("ERROR: PyMuPDF not installed. Run: pip install pymupdf", file=sys.stderr)
        sys.exit(1)

    doc = fitz.open(pdf_path)
    metadata = doc.metadata
    pages_text = []
    for i, page in enumerate(doc):
        text = page.get_text()
        pages_text.append(f"\n=== PAGE {i+1} ===\n{text}")
    return "".join(pages_text), metadata


def extract_page_images(pdf_path: str, pages: list[int], dpi: int = 150) -> list[bytes]:
    """Render specific PDF pages to PNG bytes for vision LLM."""
    import fitz
    doc = fitz.open(pdf_path)
    images = []
    mat = fitz.Matrix(dpi / 72, dpi / 72)
    for pg in pages:
        page = doc[pg - 1]
        pix = page.get_pixmap(matrix=mat)
        images.append(pix.tobytes("png"))
    return images


# ─────────────────────────────────────────────
# 2. REGEX-BASED FIELD EXTRACTION
# ─────────────────────────────────────────────

def _dollar(text: str, pattern: str) -> float | None:
    """Extract a dollar value using a regex pattern."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        val = m.group(1).replace(",", "").replace("$", "")
        try:
            return float(val)
        except ValueError:
            return None
    return None


def _pct(text: str, pattern: str) -> float | None:
    """Extract a percentage value."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def _int(text: str, pattern: str) -> int | None:
    """Extract an integer value."""
    m = re.search(pattern, text, re.IGNORECASE)
    if m:
        try:
            return int(m.group(1).replace(",", ""))
        except ValueError:
            return None
    return None


def regex_extract(text: str) -> dict:
    """
    Attempt to extract common OM fields via regex.
    Returns a best-effort dict — fields may be None if not found.
    """
    result = {
        "property": {},
        "financials": {},
        "rent_roll": {},
        "returns": {},
    }

    # ── Property ──
    address_m = re.search(r"(\d+\s+[A-Z][a-zA-Z0-9\s]+(?:Street|St|Ave|Avenue|Blvd|Drive|Dr|Road|Rd|Lane|Ln|Way|Court|Ct))", text)
    if address_m:
        result["property"]["address"] = address_m.group(1).strip()

    city_state_m = re.search(r"([A-Z][a-zA-Z\s]+),\s*(TX|FL|NY|CA|GA|CO|AZ|WA|IL|NC|VA|MA)\s*(\d{5})?", text)
    if city_state_m:
        result["property"]["city"] = city_state_m.group(1).strip()
        result["property"]["state"] = city_state_m.group(2)
        if city_state_m.group(3):
            result["property"]["zip"] = city_state_m.group(3)

    result["property"]["units"] = _int(text, r"Residential Units\s*[\n\r]+(\d[\d,]*)")
    result["property"]["beds"] = _int(text, r"Beds\s*[\n\r]+(\d[\d,]*)")
    result["property"]["gross_sf"] = _int(text, r"Gross Building SF\s*[\n\r]+([\d,]+)")
    result["property"]["net_sf"] = _int(text, r"Net Building SF\s*[\n\r]+([\d,]+)")
    result["property"]["stories"] = _int(text, r"Stories\s*[\n\r]+(\d+)")
    result["property"]["parking"] = _int(text, r"Parking Spaces\s*[\n\r]+(\d[\d,]*)")
    result["property"]["lot_sf"] = _int(text, r"Lot Size\s*[\n\r]+([\d,]+)")

    # ── Financials ──
    result["financials"]["total_cost"] = _dollar(text, r"Total(?:\s+Uses)?\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["project_cost"] = _dollar(text, r"Project Cost\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["site_acquisition"] = _dollar(text, r"Site Acquisition\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["hard_costs"] = _dollar(text, r"Hard Costs\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["equity"] = _dollar(text, r"Equity\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["noi_yr1"] = _dollar(text, r"Net Operating Income\s*[\n\r]+\$?([\d,]+)")
    result["financials"]["net_profit"] = _dollar(text, r"Net Profit\s*[\n\r]+\$?([\d,]+)")

    # ── Returns ──
    result["returns"]["irr"] = _pct(text, r"IRR\s*[\n\r]+([\d.]+)%")
    result["returns"]["equity_multiple"] = _pct(text, r"Equity Multiple\s*[\n\r]+([\d.]+)x")
    result["returns"]["yield_on_cost"] = _pct(text, r"(?:Stabilized\s+)?Yield on Cost\s*[\n\r]+([\d.]+)%")

    # ── Rent Roll ──
    result["rent_roll"]["avg_ppsf"] = _pct(text, r"monthly rents of \$?([\d.]+) PSF")
    result["rent_roll"]["avg_unit_rent"] = _dollar(text, r"Total\s*/\s*AVG\s*[\n\r]+\d+\s+\d+\s+\$?([\d,]+)")
    # Vacancy: look for "Vacancy Loss" and "Gross Potential"
    vacancy_m = re.search(r"Vacancy Loss\s*\(?\$?([\d,]+)\)?", text)
    if vacancy_m:
        result["rent_roll"]["vacancy_loss"] = float(vacancy_m.group(1).replace(",", ""))

    return result


# ─────────────────────────────────────────────
# 3. LLM-BASED EXTRACTION (Claude API)
# ─────────────────────────────────────────────

LLM_PROMPT = """You are a real estate analyst. Extract structured data from this Offering Memorandum (OM) text.

Return ONLY valid JSON with this schema (use null for missing fields):
{
  "property": {
    "address": str,
    "city": str,
    "state": str,
    "zip": str,
    "type": str,  // e.g. "Student Housing", "Multifamily", "Mixed-Use"
    "subtype": str,  // e.g. "High-Rise", "Podium", "Garden", "BTR"
    "stories": int,
    "residential_units": int,
    "beds": int | null,
    "gross_sf": int,
    "net_sf": int | null,
    "lot_sf": int | null,
    "parking_spaces": int | null
  },
  "rent_roll": {
    "avg_unit_rent": float | null,
    "avg_bed_rent": float | null,
    "avg_ppsf": float | null,
    "occupancy_pct": float | null,
    "vacancy_rate_pct": float | null,
    "gross_potential_income": float | null,
    "egi": float | null
  },
  "financials": {
    "total_project_cost": float | null,
    "site_acquisition": float | null,
    "hard_costs": float | null,
    "soft_costs": float | null,
    "equity": float | null,
    "debt": float | null,
    "noi_yr1": float | null,
    "noi_stabilized": float | null,
    "total_expenses_yr1": float | null,
    "cap_rate": float | null,
    "price": float | null,
    "price_per_unit": float | null,
    "price_per_sf": float | null
  },
  "returns": {
    "irr": float | null,
    "equity_multiple": float | null,
    "yield_on_cost": float | null,
    "net_profit": float | null
  },
  "timeline": {
    "investment_date": str | null,
    "construction_start": str | null,
    "completion_date": str | null,
    "sale_date": str | null,
    "hold_years": float | null
  },
  "sponsor": str | null,
  "market": str | null,
  "notes": str
}

OM TEXT:
"""


def llm_extract(text: str, api_key: str | None = None, images: list[bytes] | None = None) -> dict:
    """
    Use Anthropic Claude to extract structured data from OM text.
    Optionally pass rendered page images for vision-based extraction.
    """
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic not installed. Run: pip install anthropic", file=sys.stderr)
        sys.exit(1)

    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ERROR: Set ANTHROPIC_API_KEY environment variable.", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic(api_key=key)

    # Truncate text to ~100k chars to stay within limits
    truncated_text = text[:100000]

    content = []

    # Add images if provided (vision mode)
    if images:
        for i, img_bytes in enumerate(images[:5]):  # max 5 images
            import base64
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": base64.b64encode(img_bytes).decode()
                }
            })
        content.append({"type": "text", "text": LLM_PROMPT + "\n[See images above for key financial tables]\n" + truncated_text})
    else:
        content.append({"type": "text", "text": LLM_PROMPT + truncated_text})

    response = client.messages.create(
        model="claude-sonnet-4-5",
        max_tokens=4096,
        messages=[{"role": "user", "content": content}]
    )

    raw = response.content[0].text.strip()
    # Strip markdown code fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"WARNING: LLM returned invalid JSON: {e}", file=sys.stderr)
        return {"raw_llm_response": raw}


# ─────────────────────────────────────────────
# 4. FINANCIAL CALCULATIONS
# ─────────────────────────────────────────────

def calculate(data: dict) -> dict:
    """Add derived calculations to extracted data."""
    calcs = {}

    fin = data.get("financials", {})
    prop = data.get("property", {})
    ret = data.get("returns", {})

    # CapEx build cost check
    hard_costs = fin.get("hard_costs") or fin.get("hard_cost_per_gsf")
    gross_sf = prop.get("gross_sf") or prop.get("gross_building_sf")
    net_sf = prop.get("net_sf") or prop.get("net_building_sf")

    if hard_costs and gross_sf and hard_costs > 10000:  # full dollar amount
        hc_per_gsf = round(hard_costs / gross_sf, 2)
        hc_per_nsf = round(hard_costs / net_sf, 2) if net_sf else None
        calcs["hard_cost_per_gsf"] = hc_per_gsf
        calcs["hard_cost_per_nsf"] = hc_per_nsf
        calcs["capex_within_200_280_benchmark"] = 200 <= hc_per_gsf <= 280
        calcs["capex_benchmark_note"] = f"${hc_per_gsf}/GSF vs $200-280 benchmark"

    # Exit value sensitivity (using stabilized NOI)
    noi = fin.get("noi_stabilized") or fin.get("noi_yr1")
    total_cost = fin.get("total_project_cost") or fin.get("total_cost")
    if noi:
        calcs["exit_value_sensitivity"] = {}
        for cap in [0.04, 0.045, 0.05, 0.055, 0.06]:
            val = round(noi / cap)
            profit = round(val - total_cost) if total_cost else None
            pgsf = round(val / gross_sf) if gross_sf else None
            calcs["exit_value_sensitivity"][f"{int(cap*1000)/10}%_cap"] = {
                "value": val,
                "per_gsf": pgsf,
                "profit_vs_cost": profit
            }

    # Debt metrics
    equity = fin.get("equity")
    debt = fin.get("debt")
    if equity and debt:
        calcs["ltc_pct"] = round(debt / (equity + debt) * 100, 1)
        calcs["equity_pct"] = round(equity / (equity + debt) * 100, 1)

    # IRR reasonableness
    irr = ret.get("irr")
    em = ret.get("equity_multiple")
    if irr and em:
        calcs["irr_assessment"] = {
            "sponsor_irr": irr,
            "equity_multiple": em,
            "note": (
                "Conservative (<15%)" if irr < 15 else
                "Moderate (15-20%)" if irr < 20 else
                "Aggressive (20-30%)" if irr < 30 else
                "Very aggressive (>30%)"
            )
        }

    return calcs


# ─────────────────────────────────────────────
# 5. REPORT GENERATOR
# ─────────────────────────────────────────────

def generate_report(pdf_name: str, data: dict, calcs: dict) -> str:
    """Generate a clean human-readable text report."""
    prop = data.get("property", {})
    fin = data.get("financials", {})
    rr = data.get("rent_roll", {})
    ret = data.get("returns", {})
    tl = data.get("timeline", {})

    def fmt_usd(v): return f"${v:,.0f}" if v else "N/A"
    def fmt_pct(v): return f"{v:.2f}%" if v else "N/A"

    report = f"""
╔══════════════════════════════════════════════════════════════╗
║         REAL ESTATE OM EXTRACTION REPORT                     ║
║         {pdf_name:<50}  ║
╚══════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address:        {prop.get("address","N/A")}
City/State:     {prop.get("city","N/A")}, {prop.get("state","N/A")} {prop.get("zip","") or ""}
Type:           {prop.get("type","N/A")} — {prop.get("subtype","") or ""}
Stories:        {prop.get("stories","N/A")}
Units:          {prop.get("residential_units") or prop.get("units","N/A")}
Beds:           {prop.get("beds","N/A")}
Gross SF:       {fmt_usd(prop.get("gross_sf") or prop.get("gross_building_sf",""))}
Net SF:         {fmt_usd(prop.get("net_sf") or prop.get("net_building_sf",""))}
Lot Size:       {fmt_usd(prop.get("lot_sf",""))} SF
Parking:        {prop.get("parking_spaces","N/A")} spaces

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RENT ROLL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Avg Unit Rent:  {fmt_usd(rr.get("avg_unit_rent"))}/mo
Avg Bed Rent:   {fmt_usd(rr.get("avg_bed_rent"))}/mo
Avg $/SF:       ${rr.get("avg_ppsf","N/A")}/SF
Occupancy:      {fmt_pct(rr.get("occupancy_pct"))}
EGI (Yr 1):     {fmt_usd(rr.get("egi") or rr.get("net_effective_revenue_egi_yr1"))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOURCES & USES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Project Cost:  {fmt_usd(fin.get("total_project_cost") or fin.get("total_cost"))}
  Site Acquisition:  {fmt_usd(fin.get("site_acquisition"))}
  Hard Costs:        {fmt_usd(fin.get("hard_costs"))}
  Soft Costs:        {fmt_usd(fin.get("soft_costs"))}
Equity (35%):        {fmt_usd(fin.get("equity"))}
Debt (65%):          {fmt_usd(fin.get("debt"))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINANCIALS (YEAR 1 POST-TCO)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOI (Yr 1):          {fmt_usd(fin.get("noi_yr1"))}
NOI (Stabilized):    {fmt_usd(fin.get("noi_stabilized"))}
Total Expenses:      {fmt_usd(fin.get("total_expenses_yr1"))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RETURNS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IRR:             {fmt_pct(ret.get("irr"))}
Equity Multiple: {ret.get("equity_multiple","N/A")}x
Yield on Cost:   {fmt_pct(ret.get("yield_on_cost"))}
Net Profit:      {fmt_usd(ret.get("net_profit"))}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIMELINE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Investment:       {tl.get("investment_date","N/A")}
Construction:     {tl.get("construction_start","N/A")}
Completion (TCO): {tl.get("completion_date") or tl.get("tco","N/A")}
Sale:             {tl.get("sale_date") or tl.get("sale","N/A")}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CALCULATED ANALYTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

    if calcs.get("hard_cost_per_gsf"):
        within = "✅ YES" if calcs.get("capex_within_200_280_benchmark") else "⚠️  NO"
        report += f"Hard Cost/GSF:    ${calcs['hard_cost_per_gsf']}/GSF\n"
        if calcs.get("hard_cost_per_nsf"):
            report += f"Hard Cost/NSF:    ${calcs['hard_cost_per_nsf']}/NSF\n"
        report += f"$200-280 Bench:   {within}  ({calcs.get('capex_benchmark_note','')})\n\n"

    if calcs.get("exit_value_sensitivity"):
        report += "EXIT VALUE SENSITIVITY (on Stabilized NOI):\n"
        for cap_label, vals in calcs["exit_value_sensitivity"].items():
            report += f"  {cap_label}:  {fmt_usd(vals['value'])}  (${vals.get('per_gsf','?')}/GSF)"
            if vals.get("profit_vs_cost"):
                report += f"  →  profit: {fmt_usd(vals['profit_vs_cost'])}"
            report += "\n"
        report += "\n"

    if calcs.get("irr_assessment"):
        ia = calcs["irr_assessment"]
        report += f"IRR Assessment:   {ia.get('note','')}\n"

    if calcs.get("ltc_pct"):
        report += f"LTC:              {calcs['ltc_pct']}%\n"

    notes = data.get("property_type_assessment", {}) or data.get("notes", "")
    if isinstance(notes, dict):
        report += f"\nPROPERTY TYPE:\n  {notes.get('classification','')}\n  {notes.get('rationale','')}\n"
    elif notes:
        report += f"\nNOTES: {notes}\n"

    report += "\n" + "═"*64 + "\n"
    return report


# ─────────────────────────────────────────────
# 6. MAIN CLI
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Real Estate OM Extractor")
    parser.add_argument("pdf", help="Path to OM PDF")
    parser.add_argument("--llm", action="store_true", help="Use Claude API for extraction (requires ANTHROPIC_API_KEY)")
    parser.add_argument("--vision-pages", default="", help="Comma-separated pages to render for vision LLM, e.g. 3,4,5")
    parser.add_argument("--output-dir", default=".", help="Output directory for JSON/report files")
    parser.add_argument("--save-text", action="store_true", help="Save extracted text to file")
    args = parser.parse_args()

    pdf_path = args.pdf
    if not os.path.exists(pdf_path):
        print(f"ERROR: File not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    pdf_name = Path(pdf_path).stem
    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"📄 Extracting text from: {pdf_path}")
    text, metadata = extract_text(pdf_path)
    print(f"   Pages: {text.count('=== PAGE')}  |  Chars: {len(text):,}")

    if args.save_text:
        text_path = out_dir / f"{pdf_name}_text.txt"
        text_path.write_text(text)
        print(f"   Saved text: {text_path}")

    images = None
    if args.vision_pages:
        pages = [int(p.strip()) for p in args.vision_pages.split(",") if p.strip()]
        print(f"   Rendering pages {pages} for vision...")
        images = extract_page_images(pdf_path, pages)

    if args.llm:
        print("🤖 Running LLM extraction (Claude)...")
        data = llm_extract(text, images=images)
        print("   LLM extraction complete.")
    else:
        print("🔍 Running regex extraction...")
        data = regex_extract(text)
        # Also embed raw metadata
        data["_pdf_metadata"] = metadata
        print("   Regex extraction complete.")

    print("🧮 Calculating analytics...")
    calcs = calculate(data)
    data["_calcs"] = calcs

    # Save JSON
    json_path = out_dir / f"{pdf_name}_extracted.json"
    json_path.write_text(json.dumps(data, indent=2))
    print(f"✅ Saved JSON: {json_path}")

    # Generate and save report
    report = generate_report(pdf_name, data, calcs)
    report_path = out_dir / f"{pdf_name}_report.txt"
    report_path.write_text(report)
    print(f"✅ Saved report: {report_path}")
    print()
    print(report)


if __name__ == "__main__":
    main()
