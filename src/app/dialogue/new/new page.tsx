// src/app/dialogue/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
// import { getCurrentUser } from '@/lib/auth';
import { ScenarioInfo } from '@/types';
// import { getScenarios } from '@/lib/scenario';
import { MicrophoneCheck } from '@/components/dialogue/MicrophoneCheck';
import { ScenarioSelector } from '@/components/dialogue/ScenarioSelector'; // ✅ 正確
import DialogueInterface from '@/components/dialogue/DialogueInterface';
import { Navbar } from '@/components/navbar';

export default function NewDialoguePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [micCheckCompleted, setMicCheckCompleted] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);


  useEffect(() => {
    fetch('/api/scenarios')
      .then(res => res.json())
      .then(json => {
        console.log('✅ 場景資料:', json);
        setScenarios(json?.data ?? []); // ← 確保使用 json.data
      });
  }, []);
  

  const handleMicCheckComplete = () => {
    setMicCheckCompleted(true);
  };

  const handleScenarioSelect = (scenario: ScenarioInfo) => {
    setSelectedScenario(scenario);
  };

  const handleEndDialogue = () => {
    router.push('/dialogue/note');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {!micCheckCompleted ? (
          // ✅ 這裡加上背景和高度設定
          <div className="flex justify-center items-center py-8">
            <MicrophoneCheck onComplete={handleMicCheckComplete} />
          </div>        
        ) : !selectedScenario ? (
          <div className="p-4 max-w-5xl mx-auto">
            <ScenarioSelector scenarios={scenarios} onSelect={handleScenarioSelect} />
          </div>          
        ) : (
          <div className="p-4 max-w-5xl mx-auto">
            <DialogueInterface
              scenario={selectedScenario}
              onEndDialogue={handleEndDialogue}
            />
          </div>
        )}
      </div>
    </div>
  );
}

