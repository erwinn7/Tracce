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
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="fr_FR">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
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
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
    <h1>Tracce — Rally Photo Géolocalisé en Corse</h1>
    <p><strong>Tracce</strong> est une Progressive Web App dédiée à la découverte du patrimoine naturel et historique de la Corse. À travers 12 quêtes vérifiées réparties sur Ajaccio, Bastia et Corte, explorez citadelles génoises, lacs d'altitude et sommets emblématiques, validez votre présence par GPS et immortalisez chaque étape en photo.</p>

    <div class="card" style="text-align: center;">
      <h2 style="margin-top:0;">Découvrez l'expérience Tracce en vidéo</h2>
      <p style="color: var(--color-text-muted); margin-bottom: 1rem;">Un aperçu en immersion du rallye photo et des panoramas insulaires.</p>
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
      <h2>Toutes les Quêtes du Catalogue</h2>
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
        <div class="faq-a">Rendez-vous à proximité du lieu (rayon de 100 à 150 mètres), prenez une photo via l'appareil photo de votre smartphone, puis confirmez la géolocalisation GPS haute précision.</div>
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

  // 1. Enrichir dist/index.html (généré par Vite pour la PWA) avec les balises SEO et noscript
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    let spaHtml = fs.readFileSync(indexPath, 'utf-8');
    const seoHeadTags = `
    <link rel="canonical" href="${SITE_URL}/">
    <meta property="og:title" content="Tracce — Rally Photo Géolocalisé en Corse">
    <meta property="og:description" content="Explorez Ajaccio, Bastia, Corte et les sommets de Corse à travers un rally photo géolocalisé.">
    <meta property="og:url" content="${SITE_URL}/">
    <meta property="og:type" content="website">
    <meta property="og:image" content="${SITE_URL}/icons/logo-512.png">
    <script type="application/ld+json">
      ${JSON.stringify(homeStructuredData, null, 2)}
    </script>`;
    spaHtml = spaHtml.replace('</head>', `${seoHeadTags}\n  </head>`);

    const noscriptBlock = `
    <noscript>
      <div style="max-width:800px;margin:2rem auto;padding:1rem;font-family:sans-serif;background:#fff;border-radius:8px;">
        ${homeContent}
      </div>
    </noscript>`;
    spaHtml = spaHtml.replace('</body>', `${noscriptBlock}\n  </body>`);

    fs.writeFileSync(indexPath, spaHtml);
    console.log('✅ dist/index.html PWA enrichi avec JSON-LD et fallback noscript SEO');
  }

  // Également générer presentation.html pour consultation statique pure
  fs.writeFileSync(
    path.join(DIST_DIR, 'presentation.html'),
    generateHtmlShell('Tracce — Rally Photo Géolocalisé en Corse', 'Explorez Ajaccio, Bastia, Corte et les sommets de Corse à travers un rally photo géolocalisé.', `${SITE_URL}/`, homeStructuredData, homeContent)
  );

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
                <td>${q.altitudeM ? `${q.altitudeM} m` : '—'}</td>
                <td>+${q.points} pts</td>
                <td><a href="/lieux/${q.id}">Consulter</a></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>FAQ — Découvrir ${info.name} avec Tracce</h2>
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
      `Quêtes photo à ${info.name} — Tracce Corse`,
      `Découvrez les quêtes géolocalisées à ${info.name} : citadelles, sentiers et sommets.`,
      cityUrl,
      cityStructuredData,
      cityContent
    );

    // Écrit à la fois /villes/ajaccio.html et /villes/ajaccio/index.html pour éviter tout 404
    fs.writeFileSync(path.join(villesDir, `${cityId}.html`), cityHtml);
    const citySubDir = path.join(villesDir, cityId);
    fs.mkdirSync(citySubDir, { recursive: true });
    fs.writeFileSync(path.join(citySubDir, 'index.html'), cityHtml);
  }
  console.log('✅ Pages villes statiques générées dans dist/villes/');

  // 3. Pages de lieux /lieux/{questId}.html
  const lieuxDir = path.join(DIST_DIR, 'lieux');
  fs.mkdirSync(lieuxDir, { recursive: true });

  for (const quest of catalog.quests) {
    const questUrl = `${SITE_URL}/lieux/${quest.id}`;
    const cityName = CITY_DETAILS[quest.cityId]?.name || quest.cityId;

    const questFaqs = [
      {
        q: `Quel est le rayon de validation GPS pour ${quest.name} ?`,
        a: `Le rayon de validation pour ${quest.name} est de ${quest.radiusM} mètres autour des coordonnées ${quest.lat}, ${quest.lng} avec une précision GPS exigée ≤ 50 m.`,
      },
      {
        q: `Combien de points rapporte la quête ${quest.name} ?`,
        a: `Valider la quête ${quest.name} rapporte ${quest.points} points dans votre carnet d'exploration Tracce.`,
      },
      {
        q: `Comment se rendre à ${quest.name} ?`,
        a: `Ce site est situé à ${cityName}. Consultez les coordonnées ouvertes OpenStreetMap pour préparer votre itinéraire pédestre ou routier.`,
      },
    ];

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
          },
          address: {
            '@type': 'PostalAddress',
            addressLocality: cityName,
            addressRegion: 'Corse',
            addressCountry: 'FR',
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: questFaqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: f.a,
            },
          })),
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

    const questContent = `
      <div style="margin-bottom:1rem; font-size:0.9rem; color:var(--color-text-muted);">
        <a href="/">Accueil</a> &gt; <a href="/villes/${quest.cityId}">${cityName}</a> &gt; <span>${quest.name}</span>
      </div>

      <h1>${quest.name}</h1>
      <span class="badge">${quest.type}</span> • <span>${cityName}</span>

      <div class="card" style="margin-top:1.5rem;">
        <h2>Présentation du site</h2>
        <p><strong>${quest.name}</strong> : ${quest.description}</p>
      </div>

      <div class="card">
        <h2>Données factuelles & GPS</h2>
        <table>
          <tbody>
            <tr>
              <th>Territoire</th>
              <td>${cityName}</td>
            </tr>
            <tr>
              <th>Type de quête</th>
              <td>${quest.type}</td>
            </tr>
            <tr>
              <th>Coordonnées GPS</th>
              <td>${quest.lat}, ${quest.lng}</td>
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

  // 4. robots.txt
  const robotsTxt = `User-agent: *
Allow: /
Disallow: /s/

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt);
  console.log('✅ robots.txt généré.');

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

  // 6. llms.txt (GEO pour agents et LLM)
  const llmsTxt = `# Tracce — Rally Photo Géolocalisé en Corse

> Tracce est une application web progressive (PWA) d'exploration patrimoniale et sportive en Corse. Elle propose 12 quêtes vérifiées avec validation photo et contrôle de présence GPS haute précision (≤ 50 m).

## Territoires couverts
- ${SITE_URL}/villes/ajaccio : Quêtes historiques et côtières d'Ajaccio (Maison Bonaparte, Parata, Gozzi).
- ${SITE_URL}/villes/bastia : Quêtes du Cap Corse et de la cité génoise (Terra Nova, Pigno, Biguglia).
- ${SITE_URL}/villes/corte : Quêtes au cœur des massifs du centre Corse (Citadelle, Restonica, Monte Rotondo).

## Quêtes détaillées
${catalog.quests.map((q) => `- ${SITE_URL}/lieux/${q.id} : ${q.name} (${CITY_DETAILS[q.cityId]?.name || q.cityId}) - Type ${q.type}, ${q.points} points, rayon ${q.radiusM} m.`).join('\n')}

## Informations techniques
- Données ouvertes : Sources issues d'OpenStreetMap et Wikidata.
- Validation : Présence physique requise dans le rayon GPS de chaque cible.
- Accès WebApp PWA : ${SITE_URL}/
`;
  fs.writeFileSync(path.join(DIST_DIR, 'llms.txt'), llmsTxt);
  console.log('✅ llms.txt généré.');

  console.log('✨ Build SEO & GEO terminé avec succès !');
}

buildSeo();
