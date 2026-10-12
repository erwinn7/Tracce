import React, { useState } from 'react';
import type { Quest } from '../types/quest';
import { compressImage } from '../utils/image';
import { haversine, isValid, type ValidationResult } from '../utils/geo';
import type { LocalCompletion } from '../lib/db';

interface QuestValidationModalProps {
  quest: Quest;
  isDemoMode: boolean;
  onSuccess: (completion: LocalCompletion, photoBlob: Blob) => Promise<void>;
  onClose: () => void;
}

type Step = 'PERMISSION_EXPLAIN' | 'CAPTURE' | 'GEOLOCATION' | 'RESULT';

export const QuestValidationModal: React.FC<QuestValidationModalProps> = ({
  quest,
  isDemoMode,
  onSuccess,
  onClose,
}) => {
  const [step, setStep] = useState<Step>('PERMISSION_EXPLAIN');
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // Position & validation
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [geoError, setGeoError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [validationResult, setValidationResult] = useState<{
    res: ValidationResult;
    distanceM: number;
    accuracyM: number;
    coords: { lat: number; lng: number };
  } | null>(null);

  const [saving, setSaving] = useState(false);

  // Étape 1 : Photo
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressing(true);
      const { blob, dataUrl } = await compressImage(file);
      setPhotoBlob(blob);
      setPhotoPreview(dataUrl);
    } catch (err) {
      console.error('Erreur compression image:', err);
      alert('Erreur lors du traitement de la photo. Veuillez réessayer.');
    } finally {
      setCompressing(false);
    }
  };

  // Étape 2 : Position
  const handleAcquirePosition = () => {
    setLoadingGeo(true);
    setGeoError(null);

    // En mode démo, on simule une position valide immédiatement
    if (isDemoMode) {
      setTimeout(() => {
        setLoadingGeo(false);
        const simulatedCoords = { lat: quest.lat, lng: quest.lng };
        setValidationResult({
          res: { valid: true },
          distanceM: 0,
          accuracyM: 5,
          coords: simulatedCoords,
        });
        setStep('RESULT');
      }, 500);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLoadingGeo(false);
      setGeoError({
        message: 'La géolocalisation n’est pas supportée par votre navigateur.',
        canRetry: false,
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoadingGeo(false);
        const { latitude, longitude, accuracy } = pos.coords;
        const distance = haversine(latitude, longitude, quest.lat, quest.lng);
        const result = isValid(distance, accuracy, quest.radiusM);

        setValidationResult({
          res: result,
          distanceM: distance,
          accuracyM: accuracy,
          coords: { lat: latitude, lng: longitude },
        });
        setStep('RESULT');
      },
      (err) => {
        setLoadingGeo(false);
        let msg = 'Une erreur est survenue lors de la géolocalisation.';
        let canRetry = true;

        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Autorisation GPS refusée. Veuillez activer la localisation dans les réglages de votre appareil.';
          canRetry = true;
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS introuvable. Déplacez-vous à découvert.';
          canRetry = true;
        } else if (err.code === err.TIMEOUT) {
          msg = 'Le signal GPS a mis trop de temps à répondre (timeout 15s). Réessayez à ciel ouvert.';
          canRetry = true;
        }

        setGeoError({ message: msg, canRetry });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Étape 3 : Confirmation finale
  const handleConfirmCompletion = async () => {
    if (!photoBlob || !validationResult?.res.valid) return;

    try {
      setSaving(true);
      const completion: LocalCompletion = {
        questId: quest.id,
        completedAt: new Date().toISOString(),
        lat: validationResult.coords.lat,
        lng: validationResult.coords.lng,
        accuracyM: validationResult.accuracyM,
        distanceToTargetM: validationResult.distanceM,
        photoId: `photo_${quest.id}_${Date.now()}`,
        isDemo: isDemoMode,
      };

      await onSuccess(completion, photoBlob);
      onClose();
    } catch (err) {
      console.error('Erreur sauvegarde completion:', err);
      alert('Impossible d’enregistrer la quête.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card" role="dialog" aria-modal="true">
        <header className="modal-header">
          <h2 className="modal-title">Valider : {quest.name}</h2>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </header>

        {isDemoMode && (
          <div className="demo-pill-notice">
            Mode Démo actif : position simulée sur place
          </div>
        )}

        <div className="modal-body">
          {/* Étape A : Explication de permission */}
          {step === 'PERMISSION_EXPLAIN' && (
            <div className="validation-step">
              <div className="step-icon">📍 📷</div>
              <h3>Pourquoi Tracce a besoin de ta position et de la caméra ?</h3>
              <p className="step-text">
                Pour valider cette quête, tu dois prouver ta présence en prenant une photo sur place
                et en vérifiant tes coordonnées GPS par rapport au lieu cible ({quest.radiusM} m max).
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  className="banner-btn banner-btn-primary"
                  onClick={() => setStep('CAPTURE')}
                >
                  Continuer
                </button>
                <button type="button" className="banner-btn banner-btn-secondary" onClick={onClose}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Étape B : Prise de photo */}
          {step === 'CAPTURE' && (
            <div className="validation-step">
              <h3>Étape 1/2 : Prends une photo du lieu</h3>
              <p className="step-text">Prends un cliché sur le vif prouvant ton exploration.</p>

              <div className="photo-capture-box">
                {photoPreview ? (
                  <div className="photo-preview-wrap">
                    <img src={photoPreview} alt="Aperçu du lieu" className="photo-preview" />
                    <button
                      type="button"
                      className="btn-retake"
                      onClick={() => {
                        setPhotoBlob(null);
                        setPhotoPreview(null);
                      }}
                    >
                      Reprendre la photo
                    </button>
                  </div>
                ) : (
                  <label className="btn-camera-trigger">
                    <span>{compressing ? 'Compression en cours...' : '📷 Ouvrir l’appareil photo'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={compressing}
                      onChange={handlePhotoCapture}
                      className="hidden-file-input"
                    />
                  </label>
                )}
              </div>

              {photoBlob && (
                <div className="modal-actions">
                  <button
                    type="button"
                    className="banner-btn banner-btn-primary"
                    onClick={() => {
                      setStep('GEOLOCATION');
                      handleAcquirePosition();
                    }}
                  >
                    Vérifier ma position GPS →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Étape C : Géolocalisation */}
          {step === 'GEOLOCATION' && (
            <div className="validation-step">
              <h3>Étape 2/2 : Lecture GPS</h3>
              {loadingGeo && (
                <div className="loading-geo">
                  <div className="spinner" />
                  <p>Acquisition de la position haute précision...</p>
                </div>
              )}

              {geoError && (
                <div className="geo-error-box">
                  <p className="error-msg">{geoError.message}</p>
                  <div className="modal-actions">
                    {geoError.canRetry && (
                      <button
                        type="button"
                        className="banner-btn banner-btn-primary"
                        onClick={handleAcquirePosition}
                      >
                        Réessayer
                      </button>
                    )}
                    <button
                      type="button"
                      className="banner-btn banner-btn-secondary"
                      onClick={() => setStep('CAPTURE')}
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Étape D : Résultat & Confirmation */}
          {step === 'RESULT' && validationResult && (
            <div className="validation-step">
              {validationResult.res.valid ? (
                <div className="result-success">
                  <div className="success-badge">✅ Position validée !</div>
                  <p className="result-detail">
                    Distance à la cible : <strong>{Math.round(validationResult.distanceM)} m</strong> (rayon autorisé : {quest.radiusM} m)<br />
                    Précision GPS : <strong>±{Math.round(validationResult.accuracyM)} m</strong> (exigé : ≤ 50 m)
                  </p>
                  <div className="points-reward">
                    +{quest.points} points à remporter
                  </div>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="banner-btn banner-btn-primary"
                      disabled={saving}
                      onClick={handleConfirmCompletion}
                    >
                      {saving ? 'Enregistrement...' : 'Confirmer et valider la quête'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="result-failure">
                  <div className="failure-badge">❌ Validation impossible</div>
                  <p className="error-msg">{validationResult.res.message}</p>
                  <p className="result-detail">
                    Distance actuelle : {Math.round(validationResult.distanceM)} m (max {quest.radiusM} m)<br />
                    Précision signal : ±{Math.round(validationResult.accuracyM)} m (max 50 m)
                  </p>

                  <div className="modal-actions">
                    <button
                      type="button"
                      className="banner-btn banner-btn-primary"
                      onClick={handleAcquirePosition}
                    >
                      Réessayer
                    </button>
                    <button
                      type="button"
                      className="banner-btn banner-btn-secondary"
                      onClick={() => setStep('CAPTURE')}
                    >
                      Retour
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
