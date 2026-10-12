export type CityId = 'ajaccio' | 'bastia' | 'corte';

export type QuestType = 'ville' | 'colline' | 'sommet' | 'site-naturel';

export interface Quest {
  id: string;
  cityId: CityId;
  type: QuestType;
  name: string;
  description: string;
  lat: number;
  lng: number;
  altitudeM?: number;
  radiusM: number;
  points: number;
  source: 'osm' | 'wikidata' | 'manuel';
  osmType?: 'node' | 'way' | 'relation';
  osmId?: number;
  wikidata?: string;
}

export interface Catalog {
  version: string;
  quests: Quest[];
}

export const CITY_NAMES: Record<CityId, string> = {
  ajaccio: 'Ajaccio',
  bastia: 'Bastia',
  corte: 'Corte',
};

export const TYPE_LABELS: Record<QuestType, string> = {
  ville: 'Ville',
  colline: 'Colline',
  sommet: 'Sommet',
  'site-naturel': 'Site Naturel',
};
