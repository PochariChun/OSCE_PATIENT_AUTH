import { ScenarioInfo } from '@/types';

interface ScenarioSelectorProps {
  scenarios: ScenarioInfo[];
  onSelectScenario: (scenarioCode: string) => void;
}

export default function ScenarioSelector({ scenarios, onSelectScenario }: ScenarioSelectorProps) {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        選擇對話場景
      </h1>
      
      {scenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 场景卡片 */}
          {/* ... 原有的场景卡片代码 ... */}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">暫無可用場景</p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">請聯繫管理員添加場景</p>
        </div>
      )}
    </div>
  );
} 