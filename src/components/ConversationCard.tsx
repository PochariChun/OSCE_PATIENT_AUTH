import React from 'react';

interface ConversationCardProps {
  title: string;
  date: string;
  score: number;
}

const ConversationCard = ({ title, date, score }: ConversationCardProps) => {
  return (
    <div className="bg-white p-4 rounded shadow">
      <h3>{title}</h3>
      <p>日期: {date}</p>
      <p>分数: {score}</p>
    </div>
  );
};

// 使用 React.memo 包装组件
export default React.memo(ConversationCard); 