import type { Catalog } from '../types/quest';

/**
 * Calcule la distance orthodromique entre deux coordonnées GPS via la formule de Haversine.
 * Rayon moyen terrestre : 6 371 000 mètres.
 * @returns Distance en mètres (arrondie au dixième).
 */
export function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Rayon de la Terre en mètres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c * 10) / 10;
}

export interface ValidationResult {
  valid: boolean;
  reason?: 'TOO_FAR' | 'POOR_ACCURACY';
  message?: string;
}

/**
 * Règle de validation stricte Tracce (Décisions D4 & D7) :
 * - Précision GPS <= 50 m
 * - Distance au lieu <= radiusM
 */
export function isValid(
  distanceM: number,
  accuracyM: number,
  radiusM: number
): ValidationResult {
  if (accuracyM > 50) {
    return {
      valid: false,
      reason: 'POOR_ACCURACY',
      message: 'Signal GPS trop imprécis, avance à découvert et réessaie',
    };
  }

  if (distanceM > radiusM) {
    return {
      valid: false,
      reason: 'TOO_FAR',
      message: `Tu es trop éloigné du lieu (${Math.round(distanceM)} m pour un rayon de ${radiusM} m).`,
    };
  }

  return { valid: true };
}

export interface CompletionItem {
  questId: string;
  isDemo?: boolean;
}

/**
 * Calcule le score cumulé à partir des quêtes validées et du catalogue.
 * Chaque quête validée n'est comptée qu'une seule fois (Set des questId).
 * Les quêtes de type 'demo' ne comptent jamais dans le score réel.
 */
export function computeScore(
  completions: CompletionItem[],
  catalog: Catalog | null,
  includeDemo = false
): number {
  if (!catalog) return 0;

  const questMap = new Map(catalog.quests.map((q) => [q.id, q.points]));
  const counted = new Set<string>();
  let total = 0;

  for (const c of completions) {
    if (!includeDemo && c.isDemo) continue;
    if (includeDemo && !c.isDemo) continue;

    if (!counted.has(c.questId)) {
      counted.add(c.questId);
      const pts = questMap.get(c.questId) ?? 0;
      total += pts;
    }
  }

  return total;
}
