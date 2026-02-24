import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────
// POST /api/analyze
// Body: { inputs: ModelInputs, outputs: ModelOutputs }
// Returns: { analysis: string }
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ANTHROPIC_API_KEY not configured. Add it to .env.local:\n\nANTHROPIC_API_KEY=sk-ant-...',
        code: 'NO_API_KEY',
      },
      { status: 503 }
    );
  }

  let body: {
    inputs: Record<string, unknown>;
    outputs: Record<string, unknown>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { inputs, outputs } = body;
  if (!inputs || !outputs) {
    return NextResponse.json({ error: 'inputs and outputs are required' }, { status: 400 });
  }

  // Build a clean deal summary for Claude
  const i = inputs as Record<string, unknown>;
  const o = outputs as Record<string, unknown>;
  const returns = (o.returns ?? {}) as Record<string, number>;
  const cc = (o.constructionCosts ?? {}) as Record<string, number>;
  const su = (o.sourcesUses ?? {}) as Record<string, number>;
  const sm = (o.sizeMetrics ?? {}) as Record<string, number>;
  const sp = (o.saleProceeds ?? {}) as Record<string, number>;

  const totalUnits =
    ((i.studioUnits as number) ?? 0) +
    ((i.br1Units as number) ?? 0) +
    ((i.br2Units as number) ?? 0) +
    ((i.br3Units as number) ?? 0) +
    ((i.ahBr1Units as number) ?? 0) +
    ((i.ahBr2Units as number) ?? 0);

  const prompt = `You are a senior real estate analyst specializing in multifamily development. Analyze this development deal and give a concise, actionable investor-ready assessment.

## Deal Summary
- **Name**: ${i.dealName ?? 'Untitled'}
- **Address**: ${[i.address, i.cityStateZip].filter(Boolean).join(', ') || 'Not specified'}
- **Total Units**: ${totalUnits} (Studio: ${i.studioUnits ?? 0}, 1BR: ${i.br1Units ?? 0}, 2BR: ${i.br2Units ?? 0}, 3BR: ${i.br3Units ?? 0}, AH: ${((i.ahBr1Units as number) ?? 0) + ((i.ahBr2Units as number) ?? 0)})
- **Residential GSF**: ${sm.totalResidentialGSF ? Math.round(sm.totalResidentialGSF as number).toLocaleString() : (i.residentialGSF as number ?? 0).toLocaleString()} SF
- **Retail GSF**: ${(i.retailGSF as number ?? 0).toLocaleString()} SF
- **Land Price**: $${((i.landPrice as number) ?? 0).toLocaleString()}
- **Timeline**: ${i.preconstructionMonths ?? 0} mo pre-con + ${i.constructionMonths ?? 0} mo construction = ${((i.preconstructionMonths as number) ?? 0) + ((i.constructionMonths as number) ?? 0)} mo total
- **Resi Rent**: $${(i.resiRentPerNSF as number ?? 0).toFixed(2)}/NSF/mo (${i.trended ? 'trended' : 'today'})

## Capital Structure
- **Total Development Cost**: $${(su.totalCost ? Math.round(su.totalCost as number) : 0).toLocaleString()}
- **Hard Costs (Apts)**: $${((cc.hardCostsApartments as number) ?? 0).toLocaleString()}
- **Construction Loan LTC**: ${(((i.constLoanLTC as number) ?? 0) * 100).toFixed(0)}% @ ${(((i.constLoanInterestRate as number) ?? 0) * 100).toFixed(2)}%
- **Total Equity Required**: $${(su.totalEquity ? Math.round(su.totalEquity as number) : 0).toLocaleString()}
- **Land $/Unit**: $${totalUnits > 0 ? Math.round(((i.landPrice as number) ?? 0) / totalUnits).toLocaleString() : '—'}
- **TDC $/Unit**: $${totalUnits > 0 && su.totalCost ? Math.round((su.totalCost as number) / totalUnits).toLocaleString() : '—'}

## Investment Returns
- **Project IRR**: ${(returns.irr ? (returns.irr * 100).toFixed(1) : '—')}%
- **Equity Multiple**: ${(returns.equityMultiple ? returns.equityMultiple.toFixed(2) : '—')}x
- **LP IRR**: ${(returns.lpIrr ? (returns.lpIrr * 100).toFixed(1) : '—')}%
- **LP Equity Multiple**: ${(returns.lpEquityMultiple ? returns.lpEquityMultiple.toFixed(2) : '—')}x
- **Stabilized Yield on Cost**: ${(returns.stabilizedYieldOnCost ? (returns.stabilizedYieldOnCost * 100).toFixed(2) : '—')}%
- **Net Profit**: $${(returns.netProfit ? Math.round(returns.netProfit as number).toLocaleString() : '—')}
- **Exit Cap Rate**: ${(((i.resiCapRate as number) ?? 0) * 100).toFixed(2)}%
- **Gross Sale Proceeds**: $${(sp.grossSaleProceeds ? Math.round(sp.grossSaleProceeds as number).toLocaleString() : '—')}

## Assumptions
- **Rent Growth**: ${(((i.rentGrowth as number) ?? 0) * 100).toFixed(1)}%/yr
- **Stabilized Occ**: ${(((i.resiStabilizedOcc as number) ?? 0) * 100).toFixed(0)}%
- **Exit Month Post-TCO**: ${i.resiSaleMonthPostTCO ?? 48} months
- **Property Tax Rate**: ${(((i.taxRate as number) ?? 0) * 100).toFixed(3)}%

Please analyze this deal and respond with the following structure (use markdown headers):

## 📊 Deal Overview
Brief 2-3 sentence summary of what this deal is.

## ✅ Key Strengths
Bullet list of 3-5 deal strengths (returns, location, structure, etc.)

## ⚠️ Key Risks
Bullet list of 3-5 specific risks to watch (not generic, be specific to these numbers)

## 💡 Recommendations
Bullet list of 3-5 specific actionable improvements or things to verify

## 📈 Return Verdict
One paragraph: Is this deal investable? What IRR/EM hurdle would typical institutional investors require? Does this deal clear that bar?

Keep your response concise, data-driven, and useful for an investment committee. Use specific numbers from the deal.`;

  try {
    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : 'No analysis generated.';

    return NextResponse.json({ analysis: text });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[/api/analyze] Anthropic error:', errMsg);
    return NextResponse.json(
      { error: `Anthropic API error: ${errMsg}`, code: 'API_ERROR' },
      { status: 500 }
    );
  }
}
