import React, { useState, useEffect } from 'react';
import type { Quest } from '../types/quest';
import { CITY_NAMES, TYPE_LABELS } from '../types/quest';
import type { LocalCompletion, LocalPhoto } from '../lib/db';
import { getPhoto } from '../lib/db';

interface QuestDetailProps {
  quest: Quest;
  completion?: LocalCompletion;
  onStartValidation: () => void;
  onBack: () => void;
}

export const QuestDetail: React.FC<QuestDetailProps> = ({
  quest,
  completion,
  onStartValidation,
  onBack,
}) => {
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (completion?.photoId) {
      getPhoto(completion.photoId).then((p: LocalPhoto | undefined) => {
        if (active && p) {
          const url = URL.createObjectURL(p.blob);
          setPhotoDataUrl(url);
        }
      });
    } else {
      setPhotoDataUrl(null);
    }
    return () => {
      active = false;
      if (photoDataUrl) {
        URL.revokeObjectURL(photoDataUrl);
      }
    };
  }, [completion?.photoId]);

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
            <span className="quest-info-label">Statut</span>
            <span className="quest-info-value">
              {completion ? (completion.isDemo ? '🧪 Démo' : '✅ Validée') : '⏳ À faire'}
            </span>
          </div>
        </div>

        <section className="quest-section">
          <h3>À propos du lieu</h3>
          <p className="quest-description">{quest.description}</p>
        </section>

        {completion ? (
          <section className="quest-completed-section">
            <div className="completed-header">
              <h3>Quête validée !</h3>
              {completion.isDemo && <span className="demo-badge">Mode Démo</span>}
            </div>
            <p className="completed-date">
              Explorée le {new Date(completion.completedAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>

            {photoDataUrl && (
              <div className="completed-photo-wrap">
                <img src={photoDataUrl} alt={`Photo prise à ${quest.name}`} className="completed-photo" />
              </div>
            )}
          </section>
        ) : (
          <section className="quest-action-section">
            <button
              type="button"
              className="btn-primary-action"
              onClick={onStartValidation}
            >
              📷 Valider ici
            </button>
            <p className="quest-hint">
              Prends une photo et vérifie ta position GPS pour remporter {quest.points} points.
            </p>
          </section>
        )}
      </div>
    </div>
  );
};
