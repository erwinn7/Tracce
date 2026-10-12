import { describe, it, expect } from 'vitest';
import { haversine, isValid, computeScore } from './geo';
import type { Catalog } from '../types/quest';

describe('haversine', () => {
  it('calcule une distance connue avec une précision < 1%', () => {
    // Distance connue : Tour Eiffel (48.8584, 2.2945) -> Cathédrale Notre-Dame (48.8530, 2.3499) ≈ 4070 m
    const d = haversine(48.8584, 2.2945, 48.8530, 2.3499);
    expect(d).toBeGreaterThanOrEqual(4040);
    expect(d).toBeLessThanOrEqual(4100);
  });

  it('retourne 0 pour deux points identiques', () => {
    const d = haversine(41.9179, 8.7386, 41.9179, 8.7386);
    expect(d).toBe(0);
  });

  it('calcule la distance entre Ajaccio (Maison Bonaparte) et la Citadelle Miollis (~190 m)', () => {
    const d = haversine(41.9179369, 8.7386364, 41.9167826, 8.7405751);
    expect(d).toBeGreaterThan(150);
    expect(d).toBeLessThan(230);
  });
});

describe('isValid', () => {
  it('valide si la distance est inférieure ou égale au rayon et la précision <= 50m', () => {
    expect(isValid(80, 15, 100)).toEqual({ valid: true });
    expect(isValid(100, 50, 100)).toEqual({ valid: true });
  });

  it('refuse si la précision dépasse 50 m même si on est pile sur la cible', () => {
    const res = isValid(10, 50.1, 100);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('POOR_ACCURACY');
    expect(res.message).toBe('Signal GPS trop imprécis, avance à découvert et réessaie');
  });

  it('refuse si la distance dépasse le rayon cible', () => {
    const res = isValid(105, 10, 100);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('TOO_FAR');
  });

  it('refuse immédiatement si précision > 50m et distance > rayon', () => {
    const res = isValid(200, 60, 100);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('POOR_ACCURACY');
  });
});

describe('computeScore', () => {
  const mockCatalog: Catalog = {
    version: '1.0.0',
    quests: [
      {
        id: 'q1',
        cityId: 'ajaccio',
        type: 'ville',
        name: 'Quête Ville',
        description: '',
        lat: 0,
        lng: 0,
        radiusM: 100,
        points: 10,
        source: 'osm',
      },
      {
        id: 'q2',
        cityId: 'corte',
        type: 'sommet',
        name: 'Quête Sommet',
        description: '',
        lat: 0,
        lng: 0,
        radiusM: 100,
        points: 50,
        source: 'osm',
      },
    ],
  };

  it('somme les points des quêtes uniques validées', () => {
    const completions = [{ questId: 'q1' }, { questId: 'q2' }];
    expect(computeScore(completions, mockCatalog)).toBe(60);
  });

  it('compte une quête validée deux fois une seule fois', () => {
    const completions = [{ questId: 'q1' }, { questId: 'q1' }, { questId: 'q2' }];
    expect(computeScore(completions, mockCatalog)).toBe(60);
  });

  it('ignore les validations démo lors du calcul du score réel', () => {
    const completions = [
      { questId: 'q1', isDemo: true },
      { questId: 'q2', isDemo: false },
    ];
    expect(computeScore(completions, mockCatalog, false)).toBe(50);
    expect(computeScore(completions, mockCatalog, true)).toBe(10);
  });

  it('retourne 0 si aucune completion ou catalogue vide', () => {
    expect(computeScore([], mockCatalog)).toBe(0);
    expect(computeScore([{ questId: 'q1' }], null)).toBe(0);
  });
});
