
import React, { useMemo } from 'react';
import { HistoryEntry } from '../types';
import { FileText, Image, Tag, Users, Edit, RotateCcw, RotateCw, Clock, Sparkles, Plus, Trash2 } from 'lucide-react';
import '../styles/history-timeline.css';

interface HistoryTimelineProps {
  history: Array<{ historyEntry?: HistoryEntry; actionType?: string; lastModified?: number }>;
  currentIndex: number;
  onJumpToHistory: (index: number) => void;
  onClose: () => void;
}

const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  history,
  currentIndex,
  onJumpToHistory,
  onClose
}) => {
  const historyEntries = useMemo(() => {
    return history.map((h, index) => ({
      entry: h.historyEntry,
      actionType: h.actionType || h.historyEntry?.actionType || '未知操作',
      timestamp: h.lastModified || h.historyEntry?.timestamp || Date.now(),
      index
    }));
  }, [history]);

  const getActionIcon = (actionType: string) => {
    if (actionType.includes('文本') || actionType.includes('叙述') || actionType.includes('提示')) {
      return <FileText className="history-icon" />;
    }
    if (actionType.includes('图片') || actionType.includes('图像')) {
      return <Image className="history-icon" />;
    }
    if (actionType.includes('标签')) {
      return <Tag className="history-icon" />;
    }
    if (actionType.includes('角色')) {
      return <Users className="history-icon" />;
    }
    if (actionType.includes('生成') || actionType.includes('创建')) {
      return <Sparkles className="history-icon" />;
    }
    if (actionType.includes('优化')) {
      return <Sparkles className="history-icon" />;
    }
    if (actionType.includes('续写') || actionType.includes('扩展')) {
      return <Plus className="history-icon" />;
    }
    return <Edit className="history-icon" />;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return '刚刚';
    }
    if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)} 分钟前`;
    }
    if (diff < 86400000) { // Less than 1 day
      return `${Math.floor(diff / 3600000)} 小时前`;
    }
    
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFieldBadges = (affectedFields?: string[]) => {
    if (!affectedFields || affectedFields.length === 0) return null;
    
    const fieldLabels: Record<string, string> = {
      narrative: '叙述',
      visual_prompt: '视觉',
      tags: '标签',
      imageUrl: '图片',
      characters: '角色'
    };

    return (
      <div className="history-fields">
        {affectedFields.map(field => (
          <span key={field} className="history-field-badge">
            {fieldLabels[field] || field}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="history-timeline-overlay" onClick={onClose}>
      <div className="history-timeline-container" onClick={(e) => e.stopPropagation()}>
        <div className="history-timeline-header">
          <h3 className="history-timeline-title">历史记录</h3>
          <button className="history-timeline-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="history-timeline-content custom-scrollbar">
          {historyEntries.length === 0 ? (
            <div className="history-timeline-empty">
              <Clock className="history-empty-icon" />
              <p>暂无历史记录</p>
            </div>
          ) : (
            <div className="history-timeline-list">
              {historyEntries.map((item, index) => {
                const isActive = index === currentIndex;
                const isPast = index < currentIndex;
                const isFuture = index > currentIndex;
                
                return (
                  <div
                    key={item.entry?.id || index}
                    className={`history-timeline-item ${isActive ? 'active' : ''} ${isPast ? 'past' : ''} ${isFuture ? 'future' : ''}`}
                    onClick={() => onJumpToHistory(index)}
                  >
                    <div className="history-timeline-line">
                      <div className="history-timeline-dot">
                        {getActionIcon(item.actionType)}
                      </div>
                      {index < historyEntries.length - 1 && (
                        <div className="history-timeline-connector" />
                      )}
                    </div>
                    
                    <div className="history-timeline-content-item">
                      <div className="history-timeline-action">
                        <span className="history-action-type">{item.actionType}</span>
                        {item.entry?.sceneIndex && (
                          <span className="history-scene-badge">场景 {item.entry.sceneIndex}</span>
                        )}
                      </div>
                      
                      {item.entry?.description && (
                        <p className="history-description">{item.entry.description}</p>
                      )}
                      
                      {getFieldBadges(item.entry?.affectedFields)}
                      
                      <div className="history-timeline-meta">
                        <Clock className="history-time-icon" />
                        <span className="history-time">{formatTime(item.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="history-timeline-footer">
          <div className="history-timeline-stats">
            <span>共 {historyEntries.length} 条记录</span>
            <span>当前位置: {currentIndex + 1} / {historyEntries.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryTimeline;

