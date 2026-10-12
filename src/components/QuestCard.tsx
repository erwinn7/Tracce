import React from 'react';
import type { Quest } from '../types/quest';
import { CITY_NAMES, TYPE_LABELS } from '../types/quest';
import type { LocalCompletion } from '../lib/db';

interface QuestCardProps {
  quest: Quest;
  completion?: LocalCompletion;
  onSelect: (quest: Quest) => void;
}

export const QuestCard: React.FC<QuestCardProps> = ({ quest, completion, onSelect }) => {
  return (
    <article
      className={`quest-card ${completion ? 'quest-card-completed' : ''}`}
      onClick={() => onSelect(quest)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(quest);
        }
      }}
    >
      <div className="quest-card-header">
        <span className={`quest-badge quest-badge-${quest.type}`}>
          {TYPE_LABELS[quest.type]}
        </span>
        <div className="quest-card-status">
          {completion ? (
            <span className={`status-pill ${completion.isDemo ? 'status-demo' : 'status-done'}`}>
              {completion.isDemo ? '🧪 Démo' : '✅ Validée'}
            </span>
          ) : (
            <span className="status-pill status-todo">⏳ À faire</span>
          )}
          <span className="quest-points">+{quest.points} pts</span>
        </div>
      </div>

      <h3 className="quest-title">{quest.name}</h3>

      <div className="quest-meta">
        <span className="quest-city">📍 {CITY_NAMES[quest.cityId]}</span>
        {quest.altitudeM && (
          <span className="quest-alt">⛰️ {quest.altitudeM} m</span>
        )}
      </div>

      <p className="quest-desc-preview">{quest.description}</p>
    </article>
  );
};
