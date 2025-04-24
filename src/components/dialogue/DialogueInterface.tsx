import { useState } from 'react';
import { ScenarioInfo } from '@/types';

interface DialogueInterfaceProps {
  scenario: ScenarioInfo;
  onEndDialogue: () => void;
}

export default function DialogueInterface({ scenario, onEndDialogue }: DialogueInterfaceProps) {
  const [conversation, setConversation] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { 
      role: 'assistant', 
      content: `您好，我是${scenario.title}的虛擬患者。${scenario.patientInfo}` 
    }
  ]);
  const [message, setMessage] = useState('');
  
  const handleSendMessage = () => {
    // ... 原有的发送消息逻辑 ...
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 场景信息头部 */}
      {/* 对话区域 */}
      {/* 提示和指导 */}
      {/* ... 原有的对话界面代码 ... */}
    </div>
  );
} 