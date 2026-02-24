# RE OM Extractor Skill

## Description
Smart extractor for Real Estate Offering Memorandums (OMs). Recognizes property type (student housing, multi-family, etc.), extracts structured JSON (property, financials, rent roll), adds calcs ($/sqft benchmark, IRR sensitivity, exit values).

## Usage
```
python3 om_extractor.py deal.pdf [--llm] [--vision-pages 3,4,5]
```
Outputs: JSON, report.txt, text.txt

## Dependencies
- PyMuPDF (`pip install pymupdf`)
- Anthropic (`pip install anthropic`) for LLM mode

## Examples
- Offline: `python3 om_extractor.py om.pdf`
- LLM: `ANTHROPIC_API_KEY=sk-... python3 om_extractor.py om.pdf --llm`

Integrates with OpenClaw: exec tool calls script directly.

Version: 1.0.0
Author: Ninja 🥷