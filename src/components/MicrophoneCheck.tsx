'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';

interface MicrophoneCheckProps {
  onComplete: (success: boolean) => void;
}

export function MicrophoneCheck({ onComplete }: MicrophoneCheckProps) {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'checking'>('checking');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    let audioContext: AudioContext | null = null;
    
    const initMicrophone = async () => {
      await checkMicrophonePermission();
      if (stream) {
        audioContext = startAudioLevelMonitoring(stream);
      }
    };
    
    initMicrophone();
    
    return () => {
      // 清理音訊流
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // 關閉音頻上下文
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // 檢查瀏覽器是否支援 getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('您的瀏覽器不支援麥克風存取，請使用現代瀏覽器如Chrome、Firefox或Edge');
        setPermission('denied');
        return;
      }

      // 請求麥克風權限
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      setPermission('granted');
      
      // 開始監聽音訊電平
      startAudioLevelMonitoring(mediaStream);
    } catch (err: any) {
      console.error('麥克風存取錯誤:', err);
      console.log('當前協議:', window.location.protocol); // 檢查是否為 https:
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('麥克風存取被拒絕。請在瀏覽器設定中允許存取麥克風，然後重新整理頁面。');
        setPermission('denied');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('未檢測到麥克風裝置。請確保您的麥克風已正確連接。');
        setPermission('denied');
      } else {
        setError(`麥克風存取出錯: ${err.message || '未知錯誤'}`);
        setPermission('denied');
      }
    }
  };

  const startAudioLevelMonitoring = (mediaStream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(mediaStream);
      
      // 使用更現代的方法替代 ScriptProcessorNode
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      
      // 不需要連接到 destination，這可能導致回授
      // analyser.connect(javascriptNode);
      // javascriptNode.connect(audioContext.destination);
      
      // 使用 requestAnimationFrame 替代 onaudioprocess
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let values = 0;
        
        const length = dataArray.length;
        for (let i = 0; i < length; i++) {
          values += dataArray[i];
        }
        
        const average = values / length;
        setAudioLevel(average);
        
        // 繼續更新
        requestAnimationFrame(updateAudioLevel);
      };
      
      // 開始更新循環
      updateAudioLevel();
      
      // 保存 audioContext 以便清理
      return audioContext;
    } catch (err) {
      console.error('音訊分析錯誤:', err);
      return null;
    }
  };

  const handleContinue = () => {
    onComplete(permission === 'granted');
  };

  const retryPermission = async () => {
    setPermission('checking');
    setError(null);
    await checkMicrophonePermission();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-md w-full">
      <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
        麥克風檢查
      </h2>
      
      <div className="mb-6">
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          對話系統需要使用您的麥克風來進行語音互動。請確保您的麥克風正常運作。
          <br />
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            當瀏覽器詢問時，請點擊「允許」以授予麥克風存取權限。
          </span>
        </p>
        
        {permission === 'checking' && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-500 dark:text-gray-400">正在檢查麥克風權限...</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              請注意瀏覽器上方是否出現權限請求通知
            </p>
          </div>
        )}
        
        {permission === 'granted' && (
          <div className="text-center py-4">
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div 
                  className="bg-green-600 h-4 rounded-full transition-all duration-200 ease-in-out"
                  style={{ width: `${Math.min(100, audioLevel * 3)}%` }}
                ></div>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {audioLevel < 5 ? '請對著麥克風說話...' : '麥克風運作正常！'}
              </p>
            </div>
            <div className="flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-green-500 font-medium">麥克風權限已獲取</span>
            </div>
          </div>
        )}
        
        {permission === 'denied' && (
          <div className="text-center py-4">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              <span className="text-red-500 font-medium">麥克風存取受限</span>
            </div>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="mt-3 text-blue-600 dark:text-blue-400 text-sm underline"
            >
              {showHelp ? '隱藏幫助' : '如何允許麥克風存取？'}
            </button>
            
            {showHelp && (
              <div className="mt-3 text-left text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <h3 className="font-medium mb-2">Chrome 瀏覽器允許麥克風存取步驟：</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>點擊瀏覽器地址欄左側的鎖頭或資訊圖示</li>
                  <li>在彈出的選單中找到「麥克風」或「網站設定」選項</li>
                  <li>將麥克風權限設定為「允許」</li>
                  <li>重新整理頁面</li>
                </ol>
                <div className="mt-3">
                  <img 
                    src="/images/mic-permission-help.png" 
                    alt="麥克風權限設定示意圖" 
                    className="max-w-full h-auto rounded border border-gray-200 dark:border-gray-600"
                    onError={(e) => {
                      // 如果圖片載入失敗，隱藏圖片元素
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}
            
            <button
              onClick={retryPermission}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              重試
            </button>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={permission === 'checking'}
          className="px-6 py-2"
        >
          {permission === 'granted' ? '繼續對話' : '跳過檢查'}
        </Button>
      </div>
    </div>
  );
} 