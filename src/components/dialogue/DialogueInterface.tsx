// src/components/dialogue/DialogueInterface.tsx
'use client';

import { useRef } from 'react';
import { ConversationDisplay } from './ConversationDisplay';
import { MessageInput } from './MessageInput';
import { VirtualPatient } from './VirtualPatient';
import { ScoringDisplay } from './ScoringDisplay';
import useDialogueLogic from './useDialogueLogic';
import { ScenarioInfo } from '@/types';

interface DialogueInterfaceProps {
  scenario: ScenarioInfo;
  onEndDialogue: () => void;
}

export default function DialogueInterface({ scenario, onEndDialogue }: DialogueInterfaceProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const {
    message,
    setMessage,
    conversation,
    scoredCodes,
    overlayText,
    interimTranscript,
    isListening,
    isRecordButtonPressed,
    handleSendMessage,
    handleRecordButtonMouseDown,
    handleRecordButtonMouseUp,
    handleRecordButtonTouchStart,
    handleRecordButtonTouchEnd,
    handleRecordButtonMouseLeave,
  } = useDialogueLogic(scenario);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {scenario.title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          {scenario.description}
        </p>
      </div>

      <ScoringDisplay scoredCodes={scoredCodes} />

      <VirtualPatient
        isListening={isListening}
        isRecordButtonPressed={isRecordButtonPressed}
        overlayText={overlayText}
        interimTranscript={interimTranscript}
        onMouseDown={handleRecordButtonMouseDown}
        onMouseUp={handleRecordButtonMouseUp}
        onMouseLeave={handleRecordButtonMouseLeave}
        onTouchStart={handleRecordButtonTouchStart}
        onTouchEnd={handleRecordButtonTouchEnd}
      />

      <ConversationDisplay
        conversation={conversation}
        audioRef={audioRef}
        showPlayButton={false}
      />

      <MessageInput
        message={message}
        setMessage={setMessage}
        handleSendMessage={handleSendMessage}
        isRecordButtonPressed={isRecordButtonPressed}
        isListening={isListening}
        handleRecordButtonMouseDown={handleRecordButtonMouseDown}
        handleRecordButtonMouseUp={handleRecordButtonMouseUp}
        handleRecordButtonTouchStart={handleRecordButtonTouchStart}
        handleRecordButtonTouchEnd={handleRecordButtonTouchEnd}
      />

      <div className="flex justify-end">
        <button
          onClick={onEndDialogue}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          結束對話
        </button>
      </div>
    </div>
  );
}
