import fs from 'fs';
import path from 'path';

interface Quest {
  id: string;
  cityId: string;
  type: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
  altitudeM?: number;
  radiusM: number;
  points: number;
  source: string;
  osmType?: string;
  osmId?: number;
  wikidata?: string;
}

interface Catalog {
  version: string;
  quests: Quest[];
}

const CITY_DETAILS: Record<string, { name: string; intro: string; faqs: { q: string; a: string }[] }> = {
  ajaccio: {
    name: 'Ajaccio',
    intro: 'Cité impériale nichée au bord d’un des plus beaux golfes de Méditerranée, Ajaccio mêle patrimoine historique bonapartiste et paysages côtiers préservés.',
    faqs: [
      {
        q: 'Combien de quêtes sont disponibles à Ajaccio ?',
        a: 'Tracce propose 4 quêtes vérifiées à Ajaccio : la Maison Bonaparte, la Citadelle Miollis, la Pointe de la Parata et le Rocher des Gozzi.',
      },
      {
        q: 'Quelle est la quête la plus facile à Ajaccio ?',
        a: 'La Maison Bonaparte et la Citadelle Miollis se situent en plein cœur historique piétonnier d’Ajaccio et sont immédiatement accessibles.',
      },
      {
        q: 'Quelle quête offre le meilleur panorama sur le golfe d’Ajaccio ?',
        a: 'Le Rocher des Gozzi (716 m) et la Pointe de la Parata offrent des vues panoramiques spectaculaires sur l’ensemble du littoral.',
      },
    ],
  },
  bastia: {
    name: 'Bastia',
    intro: 'Capitale économique et portuaire du nord de la Corse, Bastia séduit par son port historique, sa citadelle génoise perchée et les crêtes vertigineuses du Cap Corse.',
    faqs: [
      {
        q: 'Quelles sont les quêtes incontournables à Bastia ?',
        a: 'La Place Saint-Nicolas, le Palais des Gouverneurs dans la citadelle Terra Nova, l’étang de Biguglia et l’ascension de la Serra di Pigno.',
      },
      {
        q: 'Peut-on explorer Bastia sans voiture avec Tracce ?',
        a: 'Oui, la Place Saint-Nicolas et la Citadelle se découvrent à pied depuis le centre. La Serra di Pigno nécessite une randonnée sportive.',
      },
      {
        q: 'Quel est l’intérêt écologique de l’Étang de Biguglia ?',
        a: 'C’est la plus grande zone humide lagunaire de Corse, classée réserve naturelle pour la nidification de nombreuses espèces d’oiseaux.',
      },
    ],
  },
  corte: {
    name: 'Corte',
    intro: 'Capitale historique et cœur battant de la Corse indépendante sous Pascal Paoli, Corte est entourée par les massifs granitiques les plus hauts de l’île.',
    faqs: [
      {
        q: 'Pourquoi Corte est-elle une étape majeure de Tracce ?',
        a: 'Corte rassemble le patrimoine paoliste (Citadelle, Place Paoli) et des quêtes de haute montagne uniques comme le Monte Rotondo (2622 m) et les Gorges de la Restonica.',
      },
      {
        q: 'Quel niveau physique est nécessaire pour les quêtes de Corte ?',
        a: 'La Citadelle et la Place Paoli sont très faciles d’accès en ville. En revanche, le sommet du Monte Rotondo est une randonnée alpine exigeante réservée aux marcheurs confirmés.',
      },
      {
        q: 'Où se baigner après une quête à Corte ?',
        a: 'Les vasques naturelles et fraîches des Gorges de la Restonica sont idéales après votre quête photo.',
      },
    ],
  },
};

const SITE_URL = 'https://tracce-corse.web.app';
const DIST_DIR = path.resolve('dist');

function generateHtmlShell(title: string, description: string, canonicalUrl: string, structuredData: object, content: string): string {
  const jsonLd = JSON.stringify(structuredData);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${canonicalUrl}">
  <link rel="alternate" type="text/markdown" href="/tracce.md">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <meta property="og:image" content="${SITE_URL}/icons/logo-512.png">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..700;1,6..72,400..700&family=Lora:ital,wght@0,400..700;1,400..700&display=swap" rel="stylesheet">
  <script type="application/ld+json">
    ${jsonLd}
  </script>
  <style>
    :root {
      --color-primary: #2D4A3E;
      --color-bg: #F8FAF9;
      --color-surface: #FFFFFF;
      --color-text: #1A201C;
      --color-text-muted: #5A6660;
      --color-border: #E2E8E5;
    }
    body {
      margin: 0;
      font-family: 'Newsreader', 'Lora', Georgia, 'Times New Roman', serif;
      background-color: var(--color-bg);
      color: var(--color-text);
      line-height: 1.6;
    }
    .seo-container {
      max-width: 780px;
      margin: 0 auto;
      padding: 2rem 1rem;
    }
    header {
      border-bottom: 2px solid var(--color-primary);
      padding-bottom: 1rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      color: var(--color-primary);
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
    }
    .btn-app {
      display: inline-block;
      background-color: var(--color-primary);
      color: #fff;
      padding: 0.6rem 1.2rem;
      border-radius: 9999px;
      text-decoration: none;
      font-weight: 700;
    }
    .badge {
      display: inline-block;
      background-color: rgba(45, 74, 62, 0.1);
      color: var(--color-primary);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 0.2rem 0.6rem;
      border-radius: 9999px;
      text-transform: uppercase;
    }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0,0,0,0.04);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }
    th {
      color: var(--color-text-muted);
      font-size: 0.85rem;
      text-transform: uppercase;
    }
    .faq-item {
      margin-bottom: 1rem;
    }
    .faq-q {
      font-weight: 700;
      color: var(--color-primary);
    }
    .faq-a {
      margin: 0.25rem 0 0 0;
      color: var(--color-text-muted);
    }
    footer {
      border-top: 1px solid var(--color-border);
      padding-top: 1.5rem;
      margin-top: 3rem;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      text-align: center;
    }
    footer a { color: var(--color-primary); }
  </style>
</head>
<body>
  <div class="seo-container">
    <header>
      <a href="/" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.6rem;">
        <img src="/icons/logo.png" alt="Logo Tracce" style="width:38px; height:38px; border-radius:8px; object-fit:contain;" />
        <div>
          <strong style="color:var(--color-primary); font-size:1.3rem;">Tracce</strong>
          <div style="font-size:0.85rem; color:var(--color-text-muted);">Rally photo géolocalisé en Corse</div>
        </div>
      </a>
      <a href="/" class="btn-app">Lancer l'application →</a>
    </header>

    <main>
      ${content}
    </main>

    <footer>
      <p>Données géographiques : <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© contributeurs OpenStreetMap</a> (ODbL). Projet pédagogique Tracce PWA.</p>
      <p><a href="/">Accueil / Application</a> • <a href="/villes/ajaccio">Ajaccio</a> • <a href="/villes/bastia">Bastia</a> • <a href="/villes/corte">Corte</a></p>
    </footer>
  </div>
</body>
</html>`;
}

async function buildSeo() {
  console.log('🚀 Début de la génération SEO & GEO...');

  const questsJsonPath = path.resolve('public/data/quests.json');
  const catalog: Catalog = JSON.parse(fs.readFileSync(questsJsonPath, 'utf-8'));

  // 1. Page d'accueil /
  const homeStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Tracce',
    url: `${SITE_URL}/`,
    description: 'Rally photo géolocalisé en Corse explorant Ajaccio, Bastia, Corte et les grands massifs insulaires.',
    inLanguage: 'fr-FR',
  };

  const homeContent = `
    <h1>Tracce — Rally photo géolocalisé en Corse</h1>
    <p><strong>Tracce</strong> est une Progressive Web App dédiée à la découverte du patrimoine naturel et historique de la Corse. À travers 12 quêtes vérifiées réparties sur Ajaccio, Bastia et Corte, explorez citadelles génoises, lacs d'altitude et sommets emblématiques, validez votre présence par GPS et immortalisez chaque étape en photo.</p>

    <div class="card" style="margin: 1.5rem 0;">
      <h2 style="margin-top:0; color:var(--color-primary);">🌿 Exploration insulaire : Explorez la Corse à travers l’objectif</h2>
      <p>Tracce est un rally photo géolocalisé qui vous emmène au cœur des trésors d’Ajaccio, Bastia, Corte et des sommets environnants.</p>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 1.5rem 0;">
        <div style="border-left: 3px solid #2D4A3E; padding-left: 0.8rem;">
          <h3 style="margin: 0 0 0.3rem; font-size: 1.05rem;">🗺️ 1. Choisissez un lieu</h3>
          <p style="margin: 0; font-size: 0.95rem; color: #5A6660;">Parcourez 12 quêtes réelles : citadelles génoises, places ombragées, cascades et sommets mythiques.</p>
        </div>
        <div style="border-left: 3px solid #2D4A3E; padding-left: 0.8rem;">
          <h3 style="margin: 0 0 0.3rem; font-size: 1.05rem;">📸 2. Prenez votre photo</h3>
          <p style="margin: 0; font-size: 0.95rem; color: #5A6660;">Rendez-vous sur place et immortalisez la quête avec votre appareil photo pour prouver votre exploration.</p>
        </div>
        <div style="border-left: 3px solid #2D4A3E; padding-left: 0.8rem;">
          <h3 style="margin: 0 0 0.3rem; font-size: 1.05rem;">📍 3. Validez par GPS</h3>
          <p style="margin: 0; font-size: 0.95rem; color: #5A6660;">Validez votre présence dans le rayon requis pour marquer des points et enrichir votre carnet de voyage.</p>
        </div>
      </div>
      <p style="font-size:0.9rem; color:#5A6660; margin-top:1rem;">⚡ <strong>Fonctionne à 100 % hors ligne</strong> une fois chargé. Application prête pour une utilisation hors ligne en zone blanche.</p>
    </div>

    <div class="card" style="text-align: center;">
      <h2 style="margin-top:0;">🎬 EN IMMERSION : Découvrez l'aventure en vidéo</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Des ruelles génoises aux aiguilles rocheuses, suivez la trace et capturez chaque étape.</p>
      <video controls playsinline preload="metadata" poster="/icons/logo-512.png" style="max-width: 100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
        <source src="/media/tracce-teaser.mp4" type="video/mp4" />
        Votre navigateur ne prend pas en charge la lecture de vidéos.
      </video>
    </div>

    <div class="card">
      <h2>Les Territoires d'exploration</h2>
      <ul>
        <li><a href="/villes/ajaccio"><strong>Ajaccio</strong></a> : Du golfe impérial jusqu'au sommet panoramique du Mont Gozzi et la pointe de la Parata.</li>
        <li><a href="/villes/bastia"><strong>Bastia</strong></a> : Des ruelles de Terra Nova à la lagune de Biguglia et la Serra di Pigno.</li>
        <li><a href="/villes/corte"><strong>Corte</strong></a> : De la citadelle de Pascal Paoli aux crêtes alpines du Monte Rotondo.</li>
      </ul>
    </div>

    <div class="card">
      <h2>Toutes les Quêtes du Catalogue (12 quêtes vérifiées)</h2>
      <table>
        <thead>
          <tr>
            <th>Nom</th>
            <th>Ville</th>
            <th>Type</th>
            <th>Points</th>
            <th>Détails</th>
          </tr>
        </thead>
        <tbody>
          ${catalog.quests
            .map(
              (q) => `<tr>
              <td><strong>${q.name}</strong></td>
              <td>${CITY_DETAILS[q.cityId]?.name || q.cityId}</td>
              <td><span class="badge">${q.type}</span></td>
              <td>+${q.points} pts</td>
              <td><a href="/lieux/${q.id}">Voir la fiche</a></td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Questions fréquentes (FAQ)</h2>
      <div class="faq-item">
        <div class="faq-q">Comment fonctionne la validation d'une quête dans Tracce ?</div>
        <div class="faq-a">Rendez-vous à proximité du lieu (rayon de 50 à 150 mètres), prenez une photo via l'appareil photo de votre smartphone, puis confirmez la géolocalisation GPS haute précision.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">L'application fonctionne-t-elle sans connexion Internet ?</div>
        <div class="faq-a">Oui, Tracce est une PWA entièrement installable pré-chargeant l'ensemble du catalogue et des pages. Vos validations et photos sont stockées localement et synchronisées automatiquement dès le retour du réseau.</div>
      </div>
      <div class="faq-item">
        <div class="faq-q">Le service est-il gratuit ?</div>
        <div class="faq-a">Tracce est un projet éducatif libre et gratuit s'appuyant sur les données ouvertes collaboratives d'OpenStreetMap.</div>
      </div>
    </div>
  `;

  // 1. Enrichir dist/index.html (généré par Vite pour la PWA) avec les balises SEO et le contenu pré-rendu visible dans #root
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    let spaHtml = fs.readFileSync(indexPath, 'utf-8');

    // S'assurer que le titre complet est présent
    spaHtml = spaHtml.replace(/<title>.*?<\/title>/, '<title>Tracce — Rally photo géolocalisé en Corse</title>');

    // Balises SEO et lien vers jumelle Markdown dans le <head>
    const seoHeadTags = `
    <link rel="canonical" href="${SITE_URL}/">
    <link rel="alternate" type="text/markdown" href="/tracce.md">
    <meta property="og:title" content="Tracce — Rally photo géolocalisé en Corse">
    <meta property="og:description" content="Explorez Ajaccio, Bastia, Corte et les sommets de Corse à travers un rally photo géolocalisé.">
    <meta property="og:url" content="${SITE_URL}/">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${SITE_URL}/icons/logo-512.png">
    <script type="application/ld+json">
      ${JSON.stringify(homeStructuredData, null, 2)}
    </script>`;

    if (!spaHtml.includes('application/ld+json')) {
      spaHtml = spaHtml.replace('</head>', `${seoHeadTags}\n  </head>`);
    }

    // Injection du contenu pré-rendu DIRECTEMENT dans <div id="root">
    // De cette manière, les robots (crawlers sans JS, GPTBot, ClaudeBot, Googlebot sans JS)
    // voient 100% du contenu textuel, le <h1>, le nom Tracce et les quêtes.
    // Dès que React démarre, createRoot remplace le contenu de #root par l'application interactive.
    const prerenderedRoot = `<div id="root">
      <div class="prerender-seo-shell" style="max-width:820px;margin:0 auto;padding:2rem 1.5rem;font-family:'Newsreader','Lora',Georgia,serif;color:#1A201C;line-height:1.6;">
        ${homeContent}
      </div>
    </div>
    <noscript>
      <div style="max-width:820px;margin:2rem auto;padding:1rem;background:#fff;border-radius:12px;border:1px solid #E2E8E5;">
        ${homeContent}
      </div>
    </noscript>`;

    spaHtml = spaHtml.replace(/<div id="root"><\/div>/, prerenderedRoot);

    fs.writeFileSync(indexPath, spaHtml);
    console.log('✅ dist/index.html PWA pré-rendu avec succès (contenu visible sans JavaScript dans #root et balises SEO)');
  }

  // Également générer presentation.html pour consultation statique pure
  fs.writeFileSync(
    path.join(DIST_DIR, 'presentation.html'),
    generateHtmlShell('Tracce — Rally photo géolocalisé en Corse', 'Explorez Ajaccio, Bastia, Corte et les sommets de Corse à travers un rally photo géolocalisé.', `${SITE_URL}/`, homeStructuredData, homeContent)
  );

  // 1bis. Jumelle Markdown (tracce.md)
  const tracceMd = `# Tracce — Rally photo géolocalisé en Corse

> Tracce est une application web progressive (PWA) de rally photo géolocalisé invitant à explorer le patrimoine naturel et historique de Corse à travers Ajaccio, Bastia et Corte. Pour valider une quête et remporter des points, l'utilisateur doit se rendre physiquement sur le lieu, immortaliser l'étape avec son appareil photo et prouver sa présence via la géolocalisation GPS. Conçue pour le terrain et les zones blanches, l'application fonctionne à 100 % hors ligne avec persistance locale (IndexedDB) et synchronisation automatique vers Firebase au retour du réseau.

## Exploration insulaire : Explorez la Corse à travers l’objectif

Tracce est un rally photo géolocalisé qui vous emmène au cœur des trésors d’Ajaccio, Bastia, Corte et des sommets environnants.

### 1. Choisissez un lieu
Parcourez 12 quêtes réelles : citadelles génoises, places ombragées, cascades et sommets mythiques.

### 2. Prenez votre photo
Rendez-vous sur place et immortalisez la quête avec votre appareil photo pour prouver votre exploration.

### 3. Validez par GPS
Validez votre présence dans le rayon requis pour marquer des points et enrichir votre carnet de voyage.

## Territoires d'exploration

- [Ajaccio](${SITE_URL}/villes/ajaccio) : Du golfe impérial jusqu'au sommet panoramique du Mont Gozzi et la pointe de la Parata.
- [Bastia](${SITE_URL}/villes/bastia) : Des ruelles de Terra Nova à la lagune de Biguglia et la Serra di Pigno.
- [Corte](${SITE_URL}/villes/corte) : De la citadelle de Pascal Paoli aux crêtes alpines du Monte Rotondo.

## Quêtes du catalogue (12 quêtes vérifiées)

${catalog.quests.map((q) => `- [${q.name}](${SITE_URL}/lieux/${q.id}) (${CITY_DETAILS[q.cityId]?.name || q.cityId}) : Type ${q.type}, ${q.points} points, rayon de validation ${q.radiusM} m.`).join('\n')}

## Foire Aux Questions (FAQ)

### Comment fonctionne la validation d'une quête dans Tracce ?
Rendez-vous à proximité du lieu (rayon de 50 à 150 mètres), prenez une photo via l'appareil photo de votre smartphone, puis confirmez la géolocalisation GPS haute précision.

### L'application fonctionne-t-elle sans connexion Internet ?
Oui, Tracce est une PWA entièrement installable pré-chargeant l'ensemble du catalogue et des pages. Vos validations et photos sont stockées localement et synchronisées automatiquement dès le retour du réseau.

### Le service est-il gratuit ?
Tracce est un projet éducatif libre et gratuit s'appuyant sur les données ouvertes collaboratives d'OpenStreetMap.
`;
  fs.writeFileSync(path.join(DIST_DIR, 'tracce.md'), tracceMd);
  console.log('✅ Jumelle Markdown tracce.md générée dans dist/tracce.md');

  // 2. Pages des villes /villes/{cityId}.html et dossiers
  const villesDir = path.join(DIST_DIR, 'villes');
  fs.mkdirSync(villesDir, { recursive: true });

  for (const [cityId, info] of Object.entries(CITY_DETAILS)) {
    const cityQuests = catalog.quests.filter((q) => q.cityId === cityId);
    const cityUrl = `${SITE_URL}/villes/${cityId}`;

    const cityStructuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Place',
          name: info.name,
          description: info.intro,
          url: cityUrl,
        },
        {
          '@type': 'FAQPage',
          mainEntity: info.faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.a,
            },
          })),
        },
      ],
    };

    const cityContent = `
      <h1>Quêtes à ${info.name} — Tracce Corse</h1>
      <p><strong>${info.name}</strong> est un haut lieu du rally photo Tracce. ${info.intro}</p>

      <div class="card">
        <h2>Quêtes disponibles à ${info.name} (${cityQuests.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Nom de la quête</th>
              <th>Type</th>
              <th>Altitude</th>
              <th>Récompense</th>
              <th>Fiche</th>
            </tr>
          </thead>
          <tbody>
            ${cityQuests
              .map(
                (q) => `<tr>
                <td><strong>${q.name}</strong></td>
                <td><span class="badge">${q.type}</span></td>
                <td>${q.altitudeM ? `${q.altitudeM} m` : 'Niveau de la mer'}</td>
                <td>+${q.points} pts</td>
                <td><a href="/lieux/${q.id}">Voir la fiche</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>Foire Aux Questions : ${info.name}</h2>
        ${info.faqs
          .map(
            (f) => `<div class="faq-item">
            <div class="faq-q">${f.q}</div>
            <div class="faq-a">${f.a}</div>
          </div>`
          )
          .join('')}
      </div>
    `;

    const cityHtml = generateHtmlShell(
      `Quêtes à ${info.name} — Tracce Corse`,
      `${info.intro} Découvrez les ${cityQuests.length} quêtes Tracce disponibles à ${info.name}.`,
      cityUrl,
      cityStructuredData,
      cityContent
    );

    // Écrit à la fois /villes/nom.html et /villes/nom/index.html pour garantir 0 erreur 404
    fs.writeFileSync(path.join(villesDir, `${cityId}.html`), cityHtml);
    const citySubDir = path.join(villesDir, cityId);
    fs.mkdirSync(citySubDir, { recursive: true });
    fs.writeFileSync(path.join(citySubDir, 'index.html'), cityHtml);
  }
  console.log('✅ Pages villes statiques générées dans dist/villes/ (fichiers .html et dossiers /index.html)');

  // 3. Pages des lieux /lieux/{id}.html et dossiers
  const lieuxDir = path.join(DIST_DIR, 'lieux');
  fs.mkdirSync(lieuxDir, { recursive: true });

  for (const quest of catalog.quests) {
    const cityName = CITY_DETAILS[quest.cityId]?.name || quest.cityId;
    const questUrl = `${SITE_URL}/lieux/${quest.id}`;

    const questStructuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'TouristAttraction',
          name: quest.name,
          description: quest.description,
          url: questUrl,
          geo: {
            '@type': 'GeoCoordinates',
            latitude: quest.lat,
            longitude: quest.lng,
            ...(quest.altitudeM ? { elevation: quest.altitudeM } : {}),
          },
          isAccessibleForFree: true,
          publicAccess: true,
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Accueil',
              item: `${SITE_URL}/`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: cityName,
              item: `${SITE_URL}/villes/${quest.cityId}`,
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: quest.name,
              item: questUrl,
            },
          ],
        },
      ],
    };

    const questFaqs = [
      {
        q: `Comment réussir la quête « ${quest.name} » ?`,
        a: `Rendez-vous à ${cityName} dans le rayon de ${quest.radiusM} mètres autour du point. Cadrez le lieu avec votre appareil photo et appuyez sur « Valider ici » dans l'application Tracce.`,
      },
      {
        q: `Quel équipement est recommandé pour « ${quest.name} » ?`,
        a: quest.altitudeM && quest.altitudeM > 1000
          ? `Cette quête se situe à ${quest.altitudeM} m d'altitude. Prévoyez des chaussures de marche, de l'eau et vérifiez la météo de montagne.`
          : `Cette quête urbaine ou côtière est accessible à pied avec un smartphone chargé.`,
      },
      {
        q: `Puis-je valider cette quête hors ligne ?`,
        a: `Oui, Tracce fonctionne en mode déconnecté. La photo et les coordonnées GPS sont mémorisées sur votre appareil et synchronisées dès que vous retrouvez du réseau.`,
      },
    ];

    const questContent = `
      <div style="font-size:0.9rem; color:var(--color-text-muted); margin-bottom:1rem;">
        <a href="/">Accueil</a> &gt; <a href="/villes/${quest.cityId}">${cityName}</a> &gt; <span>${quest.name}</span>
      </div>

      <h1>${quest.name} — Quête Tracce Corse</h1>
      <p style="font-size: 1.15rem; font-weight: 500;">
        ${quest.description}
      </p>

      <div class="card">
        <h2>Fiche Technique de la Quête</h2>
        <table>
          <tbody>
            <tr>
              <th>Ville</th>
              <td><a href="/villes/${quest.cityId}">${cityName}</a></td>
            </tr>
            <tr>
              <th>Type de quête</th>
              <td><span class="badge">${quest.type}</span></td>
            </tr>
            <tr>
              <th>Coordonnées GPS</th>
              <td>${quest.lat.toFixed(5)}, ${quest.lng.toFixed(5)}</td>
            </tr>
            ${quest.altitudeM ? `<tr><th>Altitude</th><td>${quest.altitudeM} mètres</td></tr>` : ''}
            <tr>
              <th>Rayon de validation</th>
              <td>${quest.radiusM} mètres</td>
            </tr>
            <tr>
              <th>Récompense</th>
              <td>+${quest.points} points</td>
            </tr>
            <tr>
              <th>Source cartographique</th>
              <td>OpenStreetMap (${quest.osmType || 'osm'} #${quest.osmId || 'N/A'})</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>Foire Aux Questions (FAQ)</h2>
        ${questFaqs
          .map(
            (f) => `<div class="faq-item">
            <div class="faq-q">${f.q}</div>
            <div class="faq-a">${f.a}</div>
          </div>`
          )
          .join('')}
      </div>
    `;

    const questHtml = generateHtmlShell(
      `${quest.name} (${cityName}) — Quête Tracce Corse`,
      quest.description,
      questUrl,
      questStructuredData,
      questContent
    );

    // Écrit à la fois /lieux/id.html et /lieux/id/index.html pour garantir 0 erreur 404
    fs.writeFileSync(path.join(lieuxDir, `${quest.id}.html`), questHtml);
    const lieuSubDir = path.join(lieuxDir, quest.id);
    fs.mkdirSync(lieuSubDir, { recursive: true });
    fs.writeFileSync(path.join(lieuSubDir, 'index.html'), questHtml);
  }
  console.log('✅ Pages lieux statiques générées dans dist/lieux/ (fichiers .html et dossiers /index.html)');

  // Copie des icônes et médias à la racine de dist/ pour le site statique
  if (fs.existsSync(path.resolve('public/icons'))) {
    fs.cpSync(path.resolve('public/icons'), path.join(DIST_DIR, 'icons'), { recursive: true });
  }
  if (fs.existsSync(path.resolve('public/media'))) {
    fs.cpSync(path.resolve('public/media'), path.join(DIST_DIR, 'media'), { recursive: true });
  }
  if (fs.existsSync(path.resolve('public/404.html'))) {
    fs.copyFileSync(path.resolve('public/404.html'), path.join(DIST_DIR, '404.html'));
  }

  // 4. robots.txt avec les 7 jetons explicites + Google-Extended et commentaires de justification
  const robotsTxt = `# Recherche Google : moteur d'indexation web principal
User-agent: Googlebot
Allow: /

# Règle générale pour l'ensemble des robots du Web
User-agent: *
Allow: /
Disallow: /s/

# OpenAI GPTBot : entraînement des modèles d'IA sur le patrimoine et la géographie corse
User-agent: GPTBot
Allow: /

# OpenAI OAI-SearchBot : résultats de recherche et citations directes dans ChatGPT
User-agent: OAI-SearchBot
Allow: /

# Anthropic ClaudeBot : apprentissage et indexation pour les modèles Claude
User-agent: ClaudeBot
Allow: /

# Anthropic Claude-SearchBot : recherche en temps réel et citations de réponses dans Claude
User-agent: Claude-SearchBot
Allow: /

# PerplexityBot : moteur conversationnel et citations de sources en direct
User-agent: PerplexityBot
Allow: /

# Common Crawl CCBot : corpus ouvert et archivage patrimonial du web
User-agent: CCBot
Allow: /

# Google-Extended : contrôle d'accès pour les modèles Gemini et Vertex AI
User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);
  console.log('✅ robots.txt généré avec 7 jetons explicites, Google-Extended et commentaires de justification.');

  // 5. sitemap.xml
  const urls: string[] = [
    `${SITE_URL}/`,
    ...Object.keys(CITY_DETAILS).map((c) => `${SITE_URL}/villes/${c}`),
    ...catalog.quests.map((q) => `${SITE_URL}/lieux/${q.id}`),
  ];

  const now = new Date().toISOString().split('T')[0];
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>
`;
  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml);
  console.log('✅ sitemap.xml généré.');

  // 6. llms.txt (GEO pour agents et LLM) avec citation blockquote > et liens [texte](url)
  const llmsTxt = `# Tracce — Rally Photo Géolocalisé en Corse

> Tracce est une application web progressive (PWA) de rally photo géolocalisé invitant à explorer le patrimoine naturel et historique de Corse à travers Ajaccio, Bastia et Corte. Pour valider une quête et remporter des points, l'utilisateur doit se rendre physiquement sur le lieu, immortaliser l'étape avec son appareil photo et prouver sa présence via la géolocalisation GPS (≤ 50 m). Conçue pour le terrain et les zones blanches, l'application fonctionne à 100 % hors ligne avec persistance locale (IndexedDB) et synchronisation automatique vers Firebase au retour du réseau.

## Territoires couverts

- [Quêtes à Ajaccio](${SITE_URL}/villes/ajaccio) : Quêtes historiques et sentiers côtiers d'Ajaccio (Maison Bonaparte, Citadelle Miollis, Pointe de la Parata, Mont Gozzi).
- [Quêtes à Bastia](${SITE_URL}/villes/bastia) : Cité génoise de Terra Nova, crêtes de la Serra di Pigno et lagune de Biguglia.
- [Quêtes à Corte](${SITE_URL}/villes/corte) : Capitale paoliste, forteresse historique, gorges de la Restonica et sommet du Monte Rotondo.

## Quêtes détaillées

${catalog.quests.map((q) => `- [${q.name}](${SITE_URL}/lieux/${q.id}) : ${q.name} (${CITY_DETAILS[q.cityId]?.name || q.cityId}) - Type ${q.type}, ${q.points} points, rayon de validation ${q.radiusM} m.`).join('\n')}

## Informations techniques

- Données ouvertes : Sources issues d'OpenStreetMap et Wikidata.
- Validation : Présence physique requise dans le rayon GPS de chaque cible.
- Accès WebApp PWA : [Tracce PWA](${SITE_URL}/)
- Jumelle Markdown : [tracce.md](${SITE_URL}/tracce.md)
`;
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt);
  console.log('✅ llms.txt généré avec liens markdown et résumé en citation.');

  console.log('✨ Build SEO & GEO terminé avec succès !');
}

buildSeo();
