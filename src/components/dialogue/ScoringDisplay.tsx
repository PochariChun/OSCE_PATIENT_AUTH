// src/components/dialogue/ScoringDisplay.tsx
'use client';

interface ScoringDisplayProps {
  scoredCodes: Set<string>;
}

export function ScoringDisplay({ scoredCodes }: ScoringDisplayProps) {
  if (scoredCodes.size === 0) return null;
  
  return (
    <div className="mt-4 mb-6 text-center text-sm text-green-700 dark:text-green-200">
      <strong>🎯 已得分：</strong>
      <div className="mt-2 inline-flex flex-wrap justify-center gap-2">
        {Array.from(scoredCodes).map(code => (
          <span 
            key={code}
            className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-1 rounded text-xs"
          >
            {code}
          </span>
        ))}
      </div>
    </div>
  );
} 