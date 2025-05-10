// src/app/dialogue/note/page.tsx
import { Suspense } from 'react';
import ClientNotePage from './ClientNotePage';

export default function NursingNotePageWrapper() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        <Suspense fallback={<div>載入中...</div>}>
          <ClientNotePage />
        </Suspense>
    </div>
  );
}


