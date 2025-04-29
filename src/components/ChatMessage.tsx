// 假設這是顯示聊天訊息的組件
interface ChatMessageProps {
  message: {
    sender: string;
    text: string;
    answerType?: string;
    imageToShow?: string;
  };
}

export function ChatMessage({ message }: ChatMessageProps) {
  // 如果是旁白類型的訊息，使用不同的樣式顯示
  if (message.answerType === 'narration') {
    return (
      <div className="narration-message">
        <em>{message.text}</em>
        {message.imageToShow && (
          <div className="narration-image">
            <img src={`/images/${message.imageToShow}`} alt="Narration visual" />
          </div>
        )}
      </div>
    );
  }
  
  // 正常對話訊息
  return (
    <div className={`chat-message ${message.sender === 'user' ? 'user-message' : 'ai-message'}`}>
      <div className="message-content">{message.text}</div>
    </div>
  );
} 