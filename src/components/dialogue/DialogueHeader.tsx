'use client';

interface ScenarioInfo {
  id: string | number;
  title: string;
  description: string;
  patientInfo?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  scenarioCode: string;
}

interface DialogueHeaderProps {
  selectedScenario: ScenarioInfo | null;
  elapsedTime: number;
  handleEndDialogue: () => void;
}

export function DialogueHeader({ selectedScenario, elapsedTime, handleEndDialogue }: DialogueHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {selectedScenario?.title || '新對話'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {selectedScenario?.description || '請選擇一個場景開始對話'}
          </p>
        </div>
        
        <div className="flex flex-row justify-between items-center gap-3 w-full sm:w-auto">
          {/* 計時器顯示 */}
          <div className="bg-blue-100 dark:bg-blue-900 border-2 border-blue-500 dark:border-blue-400 px-4 py-2 rounded-md shadow-md flex-1 sm:flex-none">
            <div className="text-lg font-mono font-bold text-blue-800 dark:text-blue-200 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:
              {(elapsedTime % 60).toString().padStart(2, '0')}
            </div>
          </div>
          
          <button 
            onClick={handleEndDialogue}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md transition-colors flex-1 sm:flex-none"
          >
            完成對話
          </button>
        </div>
      </div>
    </div>
  );
} 