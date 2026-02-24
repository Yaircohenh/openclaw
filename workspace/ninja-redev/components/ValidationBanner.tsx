'use client';
import { ValidationResult, ValidationIssue, completenessScore, autoFixInputs } from '@/lib/validation';
import { ModelInputs } from '@/lib/model';

interface Props {
  validation: ValidationResult;
  inputs: ModelInputs;
  onAutoFix: (fixed: ModelInputs) => void;
  onNavigate?: (field: string) => void;
  compact?: boolean;
}

export default function ValidationBanner({ validation, inputs, onAutoFix, onNavigate, compact }: Props) {
  const score = completenessScore(inputs);
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  const handleAutoFix = () => {
    const fixed = autoFixInputs(inputs, validation);
    onAutoFix(fixed);
  };

  if (!hasErrors && !hasWarnings) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-green-700">
        <span>✓</span>
        <span className="font-medium">All required fields complete</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`rounded-lg px-3 py-2 flex items-center gap-2 text-xs ${hasErrors ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
        <span>{hasErrors ? '⛔' : '⚠️'}</span>
        <span className="font-medium flex-1">
          {hasErrors ? `${validation.errors.length} error${validation.errors.length > 1 ? 's' : ''}` : ''}
          {hasErrors && hasWarnings ? ' · ' : ''}
          {hasWarnings ? `${validation.warnings.length} warning${validation.warnings.length > 1 ? 's' : ''}` : ''}
        </span>
        {validation.issues.some(i => i.autoFixable) && (
          <button
            onClick={handleAutoFix}
            className={`text-xs underline font-medium ${hasErrors ? 'text-red-600' : 'text-amber-600'}`}
          >
            Auto-fix
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border text-xs ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${hasErrors ? 'border-red-200' : 'border-amber-200'}`}>
        <span>{hasErrors ? '⛔' : '⚠️'}</span>
        <span className={`font-bold flex-1 ${hasErrors ? 'text-red-800' : 'text-amber-800'}`}>
          {hasErrors ? `${validation.errors.length} Required Field${validation.errors.length > 1 ? 's' : ''} Missing` : 'Review Recommended'}
        </span>
        {/* Completeness bar */}
        <div className="flex items-center gap-1.5 text-gray-500">
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${score === 1 ? 'bg-green-500' : score > 0.6 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${score * 100}%` }}
            />
          </div>
          <span>{Math.round(score * 100)}%</span>
        </div>
      </div>

      {/* Issues list */}
      <div className="px-3 py-2 space-y-1 max-h-32 overflow-y-auto">
        {validation.errors.slice(0, 5).map((issue, i) => (
          <IssueRow key={i} issue={issue} onNavigate={onNavigate} />
        ))}
        {validation.warnings.slice(0, 3).map((issue, i) => (
          <IssueRow key={`w${i}`} issue={issue} onNavigate={onNavigate} />
        ))}
        {validation.errors.length > 5 && (
          <p className="text-gray-400 italic">+{validation.errors.length - 5} more errors…</p>
        )}
      </div>

      {/* Auto-fix */}
      {validation.issues.some(i => i.autoFixable) && (
        <div className={`px-3 py-2 border-t ${hasErrors ? 'border-red-200' : 'border-amber-200'}`}>
          <button
            onClick={handleAutoFix}
            className={`text-xs font-medium px-2.5 py-1 rounded ${hasErrors ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
          >
            ⚡ Auto-fix {validation.issues.filter(i => i.autoFixable).length} issue{validation.issues.filter(i => i.autoFixable).length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}

function IssueRow({ issue, onNavigate }: { issue: ValidationIssue; onNavigate?: (f: string) => void }) {
  const isError = issue.severity === 'error';
  return (
    <div className={`flex items-start gap-1.5 ${isError ? 'text-red-700' : 'text-amber-700'}`}>
      <span className="mt-0.5">{isError ? '⛔' : '⚠'}</span>
      <span className="flex-1 leading-tight">{issue.message}</span>
      {onNavigate && (
        <button
          onClick={() => onNavigate(issue.field)}
          className="underline text-blue-500 flex-shrink-0"
        >
          go
        </button>
      )}
    </div>
  );
}
