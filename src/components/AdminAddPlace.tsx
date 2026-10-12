import React, { useState } from 'react';
import type { CityId, QuestType, Quest } from '../types/quest';

interface AdminAddPlaceProps {
  onAddQuest: (quest: Quest) => Promise<void>;
  onBack: () => void;
}

export const AdminAddPlace: React.FC<AdminAddPlaceProps> = ({ onAddQuest, onBack }) => {
  const [name, setName] = useState('');
  const [cityId, setCityId] = useState<CityId>('ajaccio');
  const [type, setType] = useState<QuestType>('ville');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [altitudeM, setAltitudeM] = useState('');
  const [radiusM, setRadiusM] = useState('100');
  const [points, setPoints] = useState('10');
  const [successMsg, setSuccessMsg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoFeedback, setGeoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Géolocalisation directe de l'administrateur sur le terrain
  const handleUseCurrentPosition = () => {
    if (!('geolocation' in navigator)) {
      setGeoFeedback({
        type: 'error',
        message: 'La géolocalisation n’est pas prise en charge par ce navigateur.',
      });
      return;
    }

    setLocating(true);
    setGeoFeedback(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude, accuracy, altitude } = pos.coords;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));
        if (altitude !== null && altitude !== undefined && !isNaN(altitude)) {
          setAltitudeM(Math.round(altitude).toString());
        }
        setGeoFeedback({
          type: 'success',
          message: `Position captée avec succès (Précision : ±${Math.round(accuracy)} m)`,
        });
      },
      (err) => {
        setLocating(false);
        let msg = 'Impossible de capter la position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Autorisation GPS refusée. Veuillez activer la localisation.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Délai GPS dépassé. Veuillez réessayer à ciel ouvert.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS non disponible.';
        }
        setGeoFeedback({ type: 'error', message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // Ajustement automatique des points / rayons recommandés selon le type
  const handleTypeChange = (newType: QuestType) => {
    setType(newType);
    if (newType === 'ville') {
      setRadiusM('100');
      setPoints('10');
    } else if (newType === 'colline' || newType === 'site-naturel') {
      setRadiusM('150');
      setPoints('25');
    } else if (newType === 'sommet') {
      setRadiusM('100');
      setPoints('50');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim() || !lat || !lng) {
      alert('Veuillez renseigner le nom, la description et les coordonnées.');
      return;
    }

    try {
      setSaving(true);
      const slug = `${cityId}-${name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

      const newQuest: Quest = {
        id: slug,
        cityId,
        type,
        name: name.trim(),
        description: description.trim(),
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        altitudeM: altitudeM ? parseInt(altitudeM, 10) : undefined,
        radiusM: parseInt(radiusM, 10) || 100,
        points: parseInt(points, 10) || 10,
        source: 'manuel',
      };

      await onAddQuest(newQuest);
      setSuccessMsg(true);
      setName('');
      setDescription('');
      setLat('');
      setLng('');
      setAltitudeM('');
      setTimeout(() => setSuccessMsg(false), 3500);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l’ajout du lieu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-header">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Retour
        </button>
        <span className="admin-crown-badge">👑 Espace Administrateur</span>
      </div>

      <div className="admin-card">
        <h2>Ajouter un nouveau lieu de quête</h2>
        <p className="admin-desc">
          Ce lieu sera directement intégré au catalogue de quêtes et jouable sur le terrain.
        </p>

        {successMsg && (
          <div className="alert-success">
            ✅ Quête ajoutée avec succès au catalogue !
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label htmlFor="q-name">Nom du lieu</label>
            <input
              id="q-name"
              type="text"
              placeholder="Ex: Tour de Capitello"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="q-city">Territoire</label>
              <select
                id="q-city"
                value={cityId}
                onChange={(e) => setCityId(e.target.value as CityId)}
              >
                <option value="ajaccio">Ajaccio</option>
                <option value="bastia">Bastia</option>
                <option value="corte">Corte</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="q-type">Type de quête</label>
              <select
                id="q-type"
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as QuestType)}
              >
                <option value="ville">Ville (10 pts / 100 m)</option>
                <option value="colline">Colline (25 pts / 150 m)</option>
                <option value="site-naturel">Site Naturel (25 pts / 150 m)</option>
                <option value="sommet">Sommet (50 pts / 100 m)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="q-desc">Description (2 à 4 phrases)</label>
            <textarea
              id="q-desc"
              rows={3}
              placeholder="Historique ou particularité du site..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="geo-locate-action">
            <button
              type="button"
              className="btn-locate-current"
              onClick={handleUseCurrentPosition}
              disabled={locating}
            >
              {locating ? '⏳ Acquisition GPS en cours...' : '📍 Utiliser ma position actuelle'}
            </button>
            {geoFeedback && (
              <div className={`geo-feedback ${geoFeedback.type}`}>
                {geoFeedback.message}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="q-lat">Latitude GPS</label>
              <input
                id="q-lat"
                type="number"
                step="any"
                placeholder="41.918..."
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="q-lng">Longitude GPS</label>
              <input
                id="q-lng"
                type="number"
                step="any"
                placeholder="8.738..."
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="q-alt">Altitude (mètres, optionnel)</label>
              <input
                id="q-alt"
                type="number"
                placeholder="Ex: 520"
                value={altitudeM}
                onChange={(e) => setAltitudeM(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="q-radius">Rayon GPS (mètres)</label>
              <input
                id="q-radius"
                type="number"
                value={radiusM}
                onChange={(e) => setRadiusM(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary-action btn-submit-admin"
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : '➕ Enregistrer le lieu'}
          </button>
        </form>
      </div>
    </div>
  );
};
