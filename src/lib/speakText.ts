// lib/speakText.ts
export function speakText(text: string, voice = 'zh-TW-HsiaoChenNeural'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `/api/edge-tts?text=${encodeURIComponent(text)}&voice=${voice}`;
        const audio = new Audio(url);
  
        audio.onended = () => resolve();
        audio.onerror = (err) => reject(err);
  
        audio.play();
      } catch (error) {
        reject(error);
      }
    });
  }
  