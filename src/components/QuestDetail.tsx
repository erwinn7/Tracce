import React from 'react';
import type { Quest } from '../types/quest';
import { CITY_NAMES, TYPE_LABELS } from '../types/quest';

interface QuestDetailProps {
  quest: Quest;
  onBack: () => void;
}

export const QuestDetail: React.FC<QuestDetailProps> = ({ quest, onBack }) => {
  return (
    <div className="quest-detail">
      <button type="button" className="btn-back" onClick={onBack}>
        ← Retour aux quêtes
      </button>

      <div className="quest-detail-header">
        <div className="quest-detail-badges">
          <span className={`quest-badge quest-badge-${quest.type}`}>
            {TYPE_LABELS[quest.type]}
          </span>
          <span className="quest-points-lg">+{quest.points} points</span>
        </div>
        <h2 className="quest-detail-title">{quest.name}</h2>
        <p className="quest-detail-subtitle">
          📍 {CITY_NAMES[quest.cityId]} • Rayon de validation : {quest.radiusM} m
        </p>
      </div>

      <div className="quest-detail-body">
        <div className="quest-info-grid">
          <div className="quest-info-item">
            <span className="quest-info-label">Rayon GPS</span>
            <span className="quest-info-value">{quest.radiusM} m</span>
          </div>
          {quest.altitudeM && (
            <div className="quest-info-item">
              <span className="quest-info-label">Altitude</span>
              <span className="quest-info-value">{quest.altitudeM} m</span>
            </div>
          )}
          <div className="quest-info-item">
            <span className="quest-info-label">Récompense</span>
            <span className="quest-info-value">{quest.points} pts</span>
          </div>
          <div className="quest-info-item">
            <span className="quest-info-label">Source</span>
            <span className="quest-info-value uppercase">{quest.source}</span>
          </div>
        </div>

        <section className="quest-section">
          <h3>À propos du lieu</h3>
          <p className="quest-description">{quest.description}</p>
        </section>

        <section className="quest-action-section">
          <button type="button" className="btn-primary-action" disabled title="Disponible au jalon M2">
            📷 Valider ici (bientôt disponible)
          </button>
          <p className="quest-hint">
            La validation photo et géolocalisation sera active au jalon M2.
          </p>
        </section>
      </div>
    </div>
  );
};
