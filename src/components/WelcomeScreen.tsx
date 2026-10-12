import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
  totalQuests: number;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart, totalQuests }) => {
  return (
    <div className="welcome-screen">
      {/* Illustration Hero avec l'image officielle d'accueil */}
      <div className="welcome-hero-wrap">
        <img
          src={`${import.meta.env.BASE_URL}media/img-home.jpeg`}
          alt="Explorateur photographe dans les montagnes de Corse"
          className="welcome-hero-img"
        />
        <div className="welcome-hero-badge">
          <span>🌿 Exploration insulaire</span>
        </div>
      </div>

      <div className="welcome-content">
        <h2 className="welcome-heading">
          Explorez la Corse à travers l’objectif
        </h2>
        <p className="welcome-lead">
          <strong>Tracce</strong> est un rally photo géolocalisé qui vous emmène au cœur des trésors d’Ajaccio, Bastia, Corte et des sommets environnants.
        </p>

        {/* Vidéo de présentation en immersion */}
        <div className="welcome-video-card">
          <div className="welcome-video-header">
            <span className="video-badge">🎬 En immersion</span>
            <h3 className="video-title">Découvrez l'aventure en vidéo</h3>
          </div>
          <div className="welcome-video-player-wrap">
            <video
              className="welcome-video-player"
              controls
              playsInline
              preload="metadata"
              poster={`${import.meta.env.BASE_URL}icons/logo-512.png`}
            >
              <source src={`${import.meta.env.BASE_URL}media/tracce-teaser.mp4`} type="video/mp4" />
              Votre navigateur ne prend pas en charge la lecture vidéo.
            </video>
          </div>
          <p className="welcome-video-caption">
            Des ruelles génoises aux aiguilles rocheuses, suivez la trace et capturez chaque étape.
          </p>
        </div>

        {/* 3 Cartes illustratives de parcours */}
        <div className="welcome-steps-grid">
          <div className="welcome-step-card">
            <div className="step-card-icon">🗺️</div>
            <div className="step-card-info">
              <h3>1. Choisissez un lieu</h3>
              <p>Parcourez {totalQuests > 0 ? `${totalQuests} quêtes réelles` : 'les quêtes'} : citadelles génoises, places ombragées, cascades et sommets mythiques.</p>
            </div>
          </div>

          <div className="welcome-step-card">
            <div className="step-card-icon">📸</div>
            <div className="step-card-info">
              <h3>2. Prenez votre photo</h3>
              <p>Rendez-vous sur place et immortalisez la quête avec votre appareil photo pour prouver votre exploration.</p>
            </div>
          </div>

          <div className="welcome-step-card">
            <div className="step-card-icon">📍</div>
            <div className="step-card-info">
              <h3>3. Validez par GPS</h3>
              <p>Validez votre présence dans le rayon requis pour marquer des points et enrichir votre carnet de voyage.</p>
            </div>
          </div>
        </div>

        {/* Bouton d'entrée principal */}
        <div className="welcome-action-area">
          <button type="button" className="btn-start-exploration" onClick={onStart}>
            <span>Découvrir les quêtes</span>
            <span className="btn-arrow">→</span>
          </button>
          <p className="welcome-offline-hint">
            ⚡ Fonctionne à 100 % hors ligne une fois chargé
          </p>
        </div>
      </div>
    </div>
  );
};
