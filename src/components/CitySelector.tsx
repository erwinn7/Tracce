import React from 'react';
import type { CityId } from '../types/quest';

interface CitySelectorProps {
  selectedCity: CityId | 'all';
  onSelectCity: (city: CityId | 'all') => void;
}

export const CitySelector: React.FC<CitySelectorProps> = ({ selectedCity, onSelectCity }) => {
  const cities: { id: CityId | 'all'; label: string }[] = [
    { id: 'all', label: 'Toute la Corse' },
    { id: 'ajaccio', label: 'Ajaccio' },
    { id: 'bastia', label: 'Bastia' },
    { id: 'corte', label: 'Corte' },
  ];

  return (
    <div className="city-selector">
      <div className="city-selector-grid">
        {cities.map((city) => (
          <button
            key={city.id}
            type="button"
            className={`city-card ${selectedCity === city.id ? 'city-card-active' : ''}`}
            onClick={() => onSelectCity(city.id)}
          >
            <span className="city-card-title">{city.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
