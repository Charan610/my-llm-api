import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Brain } from 'lucide-react';

interface ReasoningBoxProps {
  reasoning: string;
}

export const ReasoningBox: React.FC<ReasoningBoxProps> = ({ reasoning }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!reasoning || !reasoning.trim()) return null;

  return (
    <div className="reasoning-box">
      <div className="reasoning-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Brain size={15} color="#a855f7" />
          <span>Thought Process</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#a855f7' }}>
          <span>{reasoning.trim().split(/\s+/).length} tokens</span>
          {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>
      {isOpen && (
        <div className="reasoning-body">
          {reasoning.trim()}
        </div>
      )}
    </div>
  );
};
