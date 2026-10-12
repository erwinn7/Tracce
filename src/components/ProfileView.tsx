import React, { useState, useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
  lat: number;
  lng: number;
}

// Création d'une icône d'épingle rouge d'enquêteur 3D réaliste pour Leaflet
function createDetectivePinIcon(questName: string, isSelected: boolean = false) {
  const pinSize = isSelected ? 42 : 36;
  const height = isSelected ? 50 : 44;
  const needleY = height - 4;
  const headRadius = isSelected ? 14 : 12;
  const headY = 16;
  const headX = pinSize / 2;

  const svgHtml = `
    <div class="detective-pin-container ${isSelected ? 'pin-active-pulse' : ''}" title="${questName}">
      <svg width="${pinSize}" height="${height}" viewBox="0 0 ${pinSize} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Dégradé sphérique 3D pour la boule d'épingle rouge -->
          <radialGradient id="pin-sphere-${pinSize}" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stop-color="#ff8a80" />
            <stop offset="25%" stop-color="#ef4444" />
            <stop offset="65%" stop-color="#dc2626" />
            <stop offset="90%" stop-color="#991b1b" />
            <stop offset="100%" stop-color="#450a0a" />
          </radialGradient>
          <!-- Ombre portée douce -->
          <radialGradient id="pin-shadow-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(0,0,0,0.5)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <!-- Ombre sous la pointe de l'aiguille -->
        <ellipse cx="${headX + 4}" cy="${needleY + 1}" rx="7" ry="3.5" fill="url(#pin-shadow-grad)" />

        <!-- Aiguille métallique brillante plantée dans la carte -->
        <polygon points="${headX - 1.8},${headY + headRadius - 2} ${headX + 1.8},${headY + headRadius - 2} ${headX},${needleY}" fill="#cbd5e1" stroke="#475569" stroke-width="0.6"/>

        <!-- Tête sphérique rouge d'enquêteur -->
        <circle cx="${headX}" cy="${headY}" r="${headRadius}" fill="url(#pin-sphere-${pinSize})" stroke="#7f1d1d" stroke-width="1"/>

        <!-- Reflet brillant spéculaire (effet verre/plastique glacé) -->
        <ellipse cx="${headX - headRadius * 0.35}" cy="${headY - headRadius * 0.35}" rx="${headRadius * 0.38}" ry="${headRadius * 0.22}" fill="#ffffff" opacity="0.85" transform="rotate(-25 ${headX - headRadius * 0.35} ${headY - headRadius * 0.35})"/>
        <circle cx="${headX - headRadius * 0.3}" cy="${headY - headRadius * 0.35}" r="${headRadius * 0.16}" fill="#ffffff" opacity="0.95"/>
      </svg>
    </div>
  `;

  return L.divIcon({
    className: 'leaflet-detective-pin',
    html: svgHtml,
    iconSize: [pinSize, height],
    iconAnchor: [headX, needleY], // L'aiguille pointe exactement sur la coordonnée GPS
    popupAnchor: [0, -height + 6],
  });
}

// Icône discrète pour les quêtes non encore visitées
function createUnvisitedPinIcon(name: string) {
  const svg = `
    <div style="background:white; border:2px dashed #94a3b8; border-radius:50%; width:16px; height:16px; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.2);" title="${name}">
      <div style="width:6px; height:6px; background:#94a3b8; border-radius:50%;"></div>
    </div>
  `;
  return L.divIcon({
    className: 'leaflet-unvisited-pin',
    html: svg,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -10],
  });
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filtrer les complétions réelles (hors mode démo)
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

  // Associer chaque complétion à sa quête du catalogue avec coordonnées réelles
  const completedItems = useMemo<CompletedQuestItem[]>(() => {
    if (!catalog) return [];
    return realCompletions.map((c) => {
      const quest = catalog.quests.find((q) => q.id === c.questId);
      const lat = quest ? quest.lat : c.lat;
      const lng = quest ? quest.lng : c.lng;
      return {
        completion: c,
        quest,
        photoUrl: photoUrls[c.questId],
        lat,
        lng,
      };
    });
  }, [realCompletions, catalog, photoUrls]);

  // Initialisation et gestion de la carte Leaflet (Carte du monde centrée sur la Corse)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Éviter la double instanciation
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [42.15, 9.15], // Centre géographique de la Corse
        zoom: 8,
        minZoom: 3,
        maxZoom: 18,
        scrollWheelZoom: true,
      });

      // Tuiles cartographiques OpenStreetMap mondiales haute résolution
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs',
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // 1. Quêtes non visitées du catalogue (points gris discrets)
    if (catalog?.quests) {
      catalog.quests.forEach((q) => {
        const isDone = completedItems.some((ci) => ci.completion.questId === q.id);
        if (isDone) return;

        const unvisitedMarker = L.marker([q.lat, q.lng], {
          icon: createUnvisitedPinIcon(q.name),
        });

        unvisitedMarker.bindPopup(`
          <div style="font-family:inherit; min-width:160px;">
            <strong style="color:#2D4A3E; font-size:13px;">${q.name}</strong>
            <p style="margin:4px 0 0; font-size:11px; color:#64748b;">Quête à découvrir (+${q.points} pts)</p>
          </div>
        `);

        markersLayer.addLayer(unvisitedMarker);
      });
    }

    // 2. Fil rouge d'enquête reliant les quêtes réussies
    if (completedItems.length > 1) {
      const latlngs = completedItems.map((ci) => [ci.lat, ci.lng] as [number, number]);
      const polyline = L.polyline(latlngs, {
        color: '#dc2626',
        weight: 3,
        opacity: 0.75,
        dashArray: '6, 6',
      });
      markersLayer.addLayer(polyline);
    }

    // 3. Épingles rouges d'enquêteur sur les lieux visités
    completedItems.forEach((item) => {
      const isSelected = selectedPinId === item.completion.questId;
      const marker = L.marker([item.lat, item.lng], {
        icon: createDetectivePinIcon(item.quest?.name || 'Lieu visité', isSelected),
        zIndexOffset: isSelected ? 1000 : 500,
      });

      // Contenu du pop-up style fiche d'enquêteur
      const popupHtml = `
        <div style="font-family: 'Newsreader', serif; min-width: 190px; text-align: left;">
          ${item.photoUrl ? `
            <div style="margin-bottom: 8px; border-radius: 6px; overflow: hidden; max-height: 110px; border: 1px solid #e2e8e5;">
              <img src="${item.photoUrl}" style="width: 100%; height: 110px; object-fit: cover; display: block;" alt="${item.quest?.name}" />
            </div>
          ` : ''}
          <div style="color: #991b1b; font-size: 11px; font-weight: 700; text-transform: uppercase;">📍 Quête Épinglée</div>
          <strong style="color: #2D4A3E; font-size: 15px; display: block; margin: 2px 0 4px;">${item.quest?.name || 'Lieu exploré'}</strong>
          <div style="font-size: 11px; color: #52525b; line-height: 1.4;">
            <div>🗓️ ${new Date(item.completion.completedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
            <div>📏 Distance : ${Math.round(item.completion.distanceToTargetM)} m</div>
            <div>🎯 Récompense : +${item.quest?.points || 10} pts</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        setSelectedPinId(item.completion.questId);
      });

      markersLayer.addLayer(marker);
    });

    // Invalidation de la taille pour s'assurer que Leaflet s'affiche correctement
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

  }, [completedItems, catalog, selectedPinId]);

  // Recadrer la carte sur la Corse
  const handleRecenterCorsica = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([42.15, 9.15], 8, { animate: true });
    }
  };

  // Zoomer sur tous les points épinglés
  const handleFitPins = () => {
    if (mapInstanceRef.current && completedItems.length > 0) {
      const bounds = L.latLngBounds(completedItems.map((ci) => [ci.lat, ci.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13, animate: true });
    }
  };

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
        <h1 className="profile-title">Tableau d'Enquêteur & Carte</h1>
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

      {/* Tableau d'Investigation : Vraie Carte du monde centrée sur la Corse avec Épingles Rouges */}
      <div className="investigation-board">
        <div className="board-header">
          <div>
            <h2 className="board-title">🌍 Carte Géographique — Corse</h2>
            <p className="board-subtitle">
              Carte du monde réelle centrée sur l'île de Beauté. Vos explorations sont épinglées avec de véritables punaises d'enquêteur.
            </p>
          </div>
          <div className="board-controls-wrap">
            <button type="button" className="btn-map-control" onClick={handleRecenterCorsica} title="Centrer la Corse">
              🎯 Corse
            </button>
            {completedItems.length > 0 && (
              <button type="button" className="btn-map-control btn-map-control-pins" onClick={handleFitPins} title="Voir toutes mes épingles">
                📌 Mes épingles
              </button>
            )}
            <div className="pins-count-badge">
              📌 {completedItems.length} épingle{completedItems.length > 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Cadre de la vraie carte Leaflet */}
        <div className="real-map-wrapper">
          <div ref={mapContainerRef} className="leaflet-map-element" />
        </div>

        {/* Fiche détaillée Polaroid de l'épingle sélectionnée */}
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
                    📸 Preuve photo officielle
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
              🕵️‍♂️ Votre carte ne comporte encore aucune épingle rouge. Parcourez la Corse et validez une quête pour planter votre première punaise !
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

      {/* Carnet des photos de terrain */}
      {completedItems.length > 0 && (
        <div className="carnet-section">
          <h2 className="carnet-title">📸 Carnet de bord des explorations ({completedItems.length})</h2>
          <div className="carnet-grid">
            {completedItems.map((item) => (
              <div
                key={`card-${item.completion.questId}`}
                className={`carnet-card ${selectedPinId === item.completion.questId ? 'carnet-card-active' : ''}`}
                onClick={() => {
                  setSelectedPinId(item.completion.questId);
                  if (mapInstanceRef.current) {
                    mapInstanceRef.current.setView([item.lat, item.lng], 14, { animate: true });
                  }
                }}
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
