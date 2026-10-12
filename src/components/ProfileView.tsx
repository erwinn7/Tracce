import React, { useState, useEffect, useMemo } from 'react';
import type { AuthUser } from '../hooks/useAuth';
import type { Catalog, Quest } from '../types/quest';
import { getPhoto, type LocalCompletion } from '../lib/db';

interface ProfileViewProps {
  user: AuthUser | null;
  completions: LocalCompletion[];
  catalog: Catalog | null;
  onBack: () => void;
  onNavigateToQuests: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

interface CompletedQuestItem {
  completion: LocalCompletion;
  quest?: Quest;
  photoUrl?: string;
  x: number;
  y: number;
}

// Projection équirectangulaire calée sur les coordonnées réelles de la Corse
// Latitude : 41.30 (Bonifacio) à 43.05 (Cap Corse)
// Longitude : 8.50 (Ouest) à 9.60 (Est)
function projectCoords(lat: number, lng: number): { x: number; y: number } {
  const minLat = 41.30;
  const maxLat = 43.05;
  const minLng = 8.50;
  const maxLng = 9.60;

  const x = 50 + ((lng - minLng) / (maxLng - minLng)) * 400;
  const y = 40 + ((maxLat - lat) / (maxLat - minLat)) * 620;

  return { x: Math.round(x), y: Math.round(y) };
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  user,
  completions,
  catalog,
  onBack,
  onNavigateToQuests,
  onOpenAuth,
  onLogout,
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});

  // Filtrer les complétions réelles (non démo)
  const realCompletions = useMemo(
    () => completions.filter((c) => !c.isDemo),
    [completions]
  );

  // Charger les photos depuis IndexedDB
  useEffect(() => {
    let isMounted = true;
    const urls: Record<string, string> = {};

    async function loadPhotos() {
      for (const c of realCompletions) {
        if (c.photoId) {
          try {
            const photoRecord = await getPhoto(c.photoId);
            if (photoRecord && photoRecord.blob) {
              urls[c.questId] = URL.createObjectURL(photoRecord.blob);
            }
          } catch (e) {
            console.warn('Impossible de charger la photo:', e);
          }
        }
      }
      if (isMounted) {
        setPhotoUrls(urls);
      }
    }

    loadPhotos();

    return () => {
      isMounted = false;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [realCompletions]);

  // Associer chaque complétion à sa quête du catalogue
  const completedItems = useMemo<CompletedQuestItem[]>(() => {
    if (!catalog) return [];
    return realCompletions.map((c) => {
      const quest = catalog.quests.find((q) => q.id === c.questId);
      const lat = quest ? quest.lat : c.lat;
      const lng = quest ? quest.lng : c.lng;
      const { x, y } = projectCoords(lat, lng);
      return {
        completion: c,
        quest,
        photoUrl: photoUrls[c.questId],
        x,
        y,
      };
    });
  }, [realCompletions, catalog, photoUrls]);

  // Calcul du score total et statistiques
  const totalScore = useMemo(() => {
    return completedItems.reduce((acc, item) => acc + (item.quest?.points || 10), 0);
  }, [completedItems]);

  const visitedCities = useMemo(() => {
    const cities = new Set<string>();
    completedItems.forEach((i) => {
      if (i.quest?.cityId) cities.add(i.quest.cityId);
    });
    return Array.from(cities);
  }, [completedItems]);

  // Titre d'enquêteur selon la progression
  const investigatorRank = useMemo(() => {
    const count = completedItems.length;
    if (count === 0) return 'Novice du Maquis';
    if (count < 3) return 'Éclaireur des Sentiers';
    if (count < 6) return 'Arpenteur Insulaire';
    if (count < 10) return 'Enquêteur Chevronné';
    return 'Maître des Traces de Corse 🏆';
  }, [completedItems.length]);

  const selectedItem = useMemo(() => {
    if (!selectedPinId) return null;
    return completedItems.find((i) => i.completion.questId === selectedPinId) || null;
  }, [selectedPinId, completedItems]);

  return (
    <div className="profile-page">
      {/* En-tête profil */}
      <div className="profile-header-bar">
        <button type="button" className="btn-back" onClick={onBack}>
          ← Retour
        </button>
        <h1 className="profile-title">Tableau d'Enquêteur & Profil</h1>
      </div>

      {/* Carte d'identité Enquêteur */}
      <div className="investigator-id-card">
        <div className="investigator-badge-wrap">
          <div className="investigator-avatar">
            {user?.isAdmin ? '👑' : '🕵️‍♂️'}
          </div>
          <div className="investigator-meta">
            <div className="investigator-name-row">
              <span className="investigator-name">
                {user ? user.username : 'Explorateur Anonyme'}
              </span>
              {user?.isAdmin && <span className="badge-admin-tag">Admin</span>}
            </div>
            <div className="investigator-rank">{investigatorRank}</div>
          </div>
        </div>

        <div className="investigator-stats-grid">
          <div className="stat-box">
            <span className="stat-num">{totalScore}</span>
            <span className="stat-label">Points d'Enquête</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{completedItems.length} / 12</span>
            <span className="stat-label">Lieux Épinglés</span>
          </div>
          <div className="stat-box">
            <span className="stat-num">{visitedCities.length} / 3</span>
            <span className="stat-label">Villes Explorées</span>
          </div>
        </div>

        {!user && (
          <div className="auth-prompt-banner">
            <p>💡 Connectez-vous pour conserver votre progression et lier vos épingles à votre compte.</p>
            <button type="button" className="btn-auth-action" onClick={onOpenAuth}>
              🔑 Se connecter
            </button>
          </div>
        )}

        {user && (
          <div className="user-actions-row">
            <button type="button" className="btn-logout-soft" onClick={onLogout}>
              Se déconnecter
            </button>
          </div>
        )}
      </div>

      {/* Tableau d'Investigation : Carte de Corse avec Épingles Rouges */}
      <div className="investigation-board">
        <div className="board-header">
          <div>
            <h2 className="board-title">📍 Carte d'Investigation — Corse</h2>
            <p className="board-subtitle">
              Vos découvertes de terrain épinglées comme dans un véritable quartier général d'enquêteur.
            </p>
          </div>
          <div className="pins-count-badge">
            📌 {completedItems.length} épingle{completedItems.length > 1 ? 's' : ''} plantée{completedItems.length > 1 ? 's' : ''}
          </div>
        </div>

        <div className="corkboard-frame">
          <svg
            className="corsica-map-svg"
            viewBox="0 0 500 700"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Ombre portée réaliste sous la Corse */}
              <filter id="corkboard-shadow" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="3" dy="6" stdDeviation="6" floodColor="#2b1810" floodOpacity="0.3" />
              </filter>

              {/* Ombre de l'épingle rouge */}
              <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="3" dy="5" stdDeviation="3" floodColor="#1a0500" floodOpacity="0.45" />
              </filter>

              {/* Dégradé sphérique 3D pour la tête d'épingle rouge */}
              <radialGradient id="red-pin-ball" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#ff8a80" />
                <stop offset="25%" stopColor="#ef4444" />
                <stop offset="65%" stopColor="#dc2626" />
                <stop offset="90%" stopColor="#991b1b" />
                <stop offset="100%" stopColor="#450a0a" />
              </radialGradient>

              {/* Reflet brillant de l'épingle */}
              <radialGradient id="pin-glint" cx="40%" cy="35%" r="45%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Pointe métallique argentée */}
              <linearGradient id="metal-needle" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f1f5f9" />
                <stop offset="50%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>

              {/* Texture papier carte vintage */}
              <linearGradient id="island-fill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f4ede1" />
                <stop offset="50%" stopColor="#ede2cf" />
                <stop offset="100%" stopColor="#e3d4bc" />
              </linearGradient>
            </defs>

            {/* Mer Méditerranée / Texture de fond */}
            <rect width="500" height="700" fill="#e9f1ee" rx="16" />

            {/* Lignes topographiques marines / grille nautique */}
            <g stroke="#d5e3dc" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.6">
              <line x1="0" y1="175" x2="500" y2="175" />
              <line x1="0" y1="350" x2="500" y2="350" />
              <line x1="0" y1="525" x2="500" y2="525" />
              <line x1="166" y1="0" x2="166" y2="700" />
              <line x1="333" y1="0" x2="333" y2="700" />
            </g>

            {/* Silhouette géographique précise de la Corse */}
            <path
              filter="url(#corkboard-shadow)"
              d="
                M 368 45
                C 375 52, 382 75, 380 98
                C 377 120, 395 150, 395 175
                C 395 210, 420 270, 415 320
                C 410 370, 418 420, 412 470
                C 405 520, 410 560, 395 590
                C 380 615, 350 645, 320 655
                C 290 660, 275 640, 260 625
                C 240 600, 215 570, 200 540
                C 185 520, 160 500, 140 480
                C 125 460, 130 435, 145 420
                C 160 405, 155 380, 140 360
                C 125 340, 120 310, 140 280
                C 155 255, 170 230, 190 205
                C 210 180, 240 160, 265 135
                C 285 115, 310 90, 325 65
                C 340 45, 358 38, 368 45
                Z
              "
              fill="url(#island-fill)"
              stroke="#b5a285"
              strokeWidth="2.5"
            />

            {/* Reliefs intérieurs & massifs de montagne (Monte Cinto / Rotondo) */}
            <g fill="none" stroke="#cfbe9f" strokeWidth="1.2" opacity="0.7">
              <path d="M 270 210 Q 285 230 300 260 Q 280 290 260 320" />
              <path d="M 250 270 Q 280 300 295 340 Q 270 380 245 410" />
              <path d="M 310 150 Q 330 180 340 220" />
              <path d="M 220 440 Q 240 480 260 520" />
            </g>

            {/* Repères des grandes villes (écritures d'archive) */}
            <g className="map-city-labels">
              <text x="140" y="445" fontSize="12" fontWeight="700" fill="#2d4a3e" textAnchor="end">Ajaccio</text>
              <circle cx="148" cy="441" r="3" fill="#2d4a3e" />

              <text x="390" y="172" fontSize="12" fontWeight="700" fill="#2d4a3e" textAnchor="start">Bastia</text>
              <circle cx="382" cy="168" r="3" fill="#2d4a3e" />

              <text x="290" y="310" fontSize="12" fontWeight="700" fill="#2d4a3e" textAnchor="start">Corte</text>
              <circle cx="282" cy="306" r="3" fill="#2d4a3e" />
            </g>

            {/* Repères des quêtes non encore visitées (petits cercles discrets) */}
            {catalog?.quests.map((q) => {
              const isCompleted = completedItems.some((ci) => ci.completion.questId === q.id);
              if (isCompleted) return null;
              const { x, y } = projectCoords(q.lat, q.lng);
              return (
                <g key={`unvisited-${q.id}`} opacity="0.4">
                  <circle cx={x} cy={y} r="3.5" fill="#94a3b8" />
                  <circle cx={x} cy={y} r="7" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" fill="none" />
                </g>
              );
            })}

            {/* Fil rouge d'enquête reliant les étapes visitées */}
            {completedItems.length > 1 && (
              <polyline
                points={completedItems.map((item) => `${item.x},${item.y}`).join(' ')}
                fill="none"
                stroke="#dc2626"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                opacity="0.65"
              />
            )}

            {/* ÉPINGLES ROUGES D'ENQUÊTEUR (Tête ronde et rouge brillante) */}
            {completedItems.map((item) => {
              const isSelected = selectedPinId === item.completion.questId;
              const pinRadius = isSelected ? 12 : 9.5;

              return (
                <g
                  key={`pin-${item.completion.questId}`}
                  className={`detective-pin-group ${isSelected ? 'pin-selected' : ''}`}
                  onClick={() => setSelectedPinId(isSelected ? null : item.completion.questId)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Ombre portée de la tête d'épingle */}
                  <ellipse
                    cx={item.x + 4}
                    cy={item.y + 4}
                    rx={pinRadius * 0.9}
                    ry={pinRadius * 0.55}
                    fill="rgba(20, 5, 0, 0.4)"
                    filter="url(#pin-shadow)"
                  />

                  {/* Pointe métallique (aiguille plantée dans la carte) */}
                  <polygon
                    points={`
                      ${item.x - 1.5},${item.y - pinRadius * 0.5}
                      ${item.x + 1.5},${item.y - pinRadius * 0.5}
                      ${item.x},${item.y}
                    `}
                    fill="url(#metal-needle)"
                  />

                  {/* Tête ronde sphérique 3D rouge d'enquêteur */}
                  <circle
                    cx={item.x}
                    cy={item.y - pinRadius * 0.9}
                    r={pinRadius}
                    fill="url(#red-pin-ball)"
                    stroke="#7f1d1d"
                    strokeWidth="0.8"
                  />

                  {/* Reflet de brillance sur la sphère */}
                  <ellipse
                    cx={item.x - pinRadius * 0.3}
                    cy={item.y - pinRadius * 1.25}
                    rx={pinRadius * 0.38}
                    ry={pinRadius * 0.25}
                    fill="url(#pin-glint)"
                  />

                  {/* Point blanc spéculaire pur */}
                  <circle
                    cx={item.x - pinRadius * 0.32}
                    cy={item.y - pinRadius * 1.3}
                    r={pinRadius * 0.16}
                    fill="#ffffff"
                    opacity="0.9"
                  />

                  {/* Nom du lieu au survol ou sélection */}
                  {isSelected && (
                    <g transform={`translate(${item.x}, ${item.y - pinRadius * 2 - 8})`}>
                      <rect
                        x="-70"
                        y="-24"
                        width="140"
                        height="24"
                        rx="12"
                        fill="#1f2937"
                        opacity="0.95"
                      />
                      <text
                        x="0"
                        y="-8"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {item.quest?.name.slice(0, 18)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Zoom / Fiche détaillée d'une quête épinglée sélectionnée */}
        {selectedItem && (
          <div className="pinned-detail-card">
            <div className="pinned-card-header">
              <span className="pinned-badge">📍 Épingle d'enquête active</span>
              <button
                type="button"
                className="btn-close-pinned"
                onClick={() => setSelectedPinId(null)}
              >
                ✕
              </button>
            </div>

            <div className="pinned-card-body">
              {selectedItem.photoUrl ? (
                <div className="polaroid-preview">
                  <img
                    src={selectedItem.photoUrl}
                    alt={selectedItem.quest?.name}
                    className="polaroid-img"
                  />
                  <div className="polaroid-caption">
                    📸 Photo terrain officielle
                  </div>
                </div>
              ) : (
                <div className="polaroid-placeholder">
                  <span>📷 Photo enregistrée en local</span>
                </div>
              )}

              <div className="pinned-info-col">
                <h3 className="pinned-quest-name">{selectedItem.quest?.name}</h3>
                <p className="pinned-quest-desc">{selectedItem.quest?.description}</p>
                <div className="pinned-meta-grid">
                  <div><strong>Date :</strong> {new Date(selectedItem.completion.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                  <div><strong>Distance :</strong> {Math.round(selectedItem.completion.distanceToTargetM)} mètres de la cible</div>
                  <div><strong>Précision GPS :</strong> ±{Math.round(selectedItem.completion.accuracyM)} m</div>
                  <div><strong>Récompense :</strong> +{selectedItem.quest?.points || 10} points</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {completedItems.length === 0 && (
          <div className="empty-pins-box">
            <p className="empty-pins-text">
              🕵️‍♂️ Votre tableau d'enquête est encore vierge. Rendez-vous sur le terrain avec votre appareil photo pour planter votre première épingle rouge sur la carte !
            </p>
            <button
              type="button"
              className="btn-discover-quests"
              onClick={onNavigateToQuests}
            >
              🗺️ Parcourir les 12 quêtes du catalogue →
            </button>
          </div>
        )}
      </div>

      {/* Carnet des photos de terrain de l'utilisateur */}
      {completedItems.length > 0 && (
        <div className="carnet-section">
          <h2 className="carnet-title">📸 Carnet de bord des explorations ({completedItems.length})</h2>
          <div className="carnet-grid">
            {completedItems.map((item) => (
              <div
                key={`card-${item.completion.questId}`}
                className={`carnet-card ${selectedPinId === item.completion.questId ? 'carnet-card-active' : ''}`}
                onClick={() => setSelectedPinId(item.completion.questId)}
              >
                <div className="carnet-img-wrap">
                  {item.photoUrl ? (
                    <img src={item.photoUrl} alt={item.quest?.name} className="carnet-img" />
                  ) : (
                    <div className="carnet-placeholder">📷 Preuve photo</div>
                  )}
                  <div className="carnet-pin-icon">📍</div>
                </div>
                <div className="carnet-body">
                  <h4 className="carnet-name">{item.quest?.name}</h4>
                  <p className="carnet-date">
                    Validé le {new Date(item.completion.completedAt).toLocaleDateString('fr-FR')}
                  </p>
                  <span className="badge-pts">+{item.quest?.points || 10} pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
