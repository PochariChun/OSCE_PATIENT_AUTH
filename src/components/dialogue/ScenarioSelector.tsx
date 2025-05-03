// src/components/dialogue/ScenarioSelector.tsx
'use client';

interface ScenarioInfo {
  id: string | number;
  title: string;
  description: string;
  patientInfo?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scenarioCode: string;
}

interface ScenarioSelectorProps {
  scenarios: ScenarioInfo[];
  onSelect: (scenario: ScenarioInfo) => void;
}

export function ScenarioSelector({ scenarios, onSelect }: ScenarioSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        選擇對話場景
      </h1>
      
      {(scenarios?.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {scenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelect(scenario)}
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {scenario.title}
                </h2>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  scenario.difficulty === 'easy' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' :
                  scenario.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' :
                  'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                }`}>
                  {scenario.difficulty === 'easy' ? '簡單' : 
                   scenario.difficulty === 'medium' ? '中等' : '困難'}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {scenario.description}
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">暫無可用場景</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">請聯絡管理員添加場景</p>
        </div>
      )}
    </div>
  );
} 