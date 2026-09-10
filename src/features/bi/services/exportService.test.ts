import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CATEGORY_COLUMNS,
  KPI_COLUMNS,
  TIME_SERIES_COLUMNS,
  exportToCsv,
  exportToPdf,
  flattenDashboard,
  getTimestampedName,
  toCsv,
} from './exportService';
import { buildKpi } from '../hooks/kpiLogic';
import type { KpiDashboard } from '../types';

// jsPDF écrit réellement sur le disque dans cet environnement : on
// substitue la sauvegarde pour ne pas semer des fichiers à la racine.
vi.mock('jspdf', async () => {
  const actual = await vi.importActual<typeof import('jspdf')>('jspdf');
  const Original = actual.default;

  class JsPdfSansSauvegarde extends Original {}
  // Surcharge assignée après coup : la signature d'origine est surchargée
  // et ne peut pas être redéclarée simplement dans la classe.
  (JsPdfSansSauvegarde.prototype as unknown as { save: () => unknown }).save =
    function save() {
      return this;
    };

  return { default: JsPdfSansSauvegarde };
});

interface Ligne {
  nom: string;
  montant: number;
}

const COLONNES = [
  { header: 'Nom', accessor: (row: Ligne) => row.nom },
  { header: 'Montant', accessor: (row: Ligne) => row.montant },
];

describe('toCsv', () => {
  it('place les en-têtes sur la première ligne', () => {
    const csv = toCsv([], COLONNES);
    expect(csv).toBe('Nom;Montant');
  });

  // Point-virgule et non virgule : Excel en configuration française
  // place tout dans une seule colonne avec le séparateur anglo-saxon.
  it('sépare les colonnes par un point-virgule', () => {
    const csv = toCsv([{ nom: 'Produit', montant: 100 }], COLONNES);
    expect(csv).toContain('Produit;100');
  });

  it('sépare les lignes par un retour chariot Windows', () => {
    const csv = toCsv(
      [
        { nom: 'A', montant: 1 },
        { nom: 'B', montant: 2 },
      ],
      COLONNES,
    );

    expect(csv.split('\r\n')).toHaveLength(3);
  });

  // Une valeur contenant le séparateur casserait la structure du fichier
  // si elle n'était pas encadrée.
  it('encadre les valeurs contenant le séparateur', () => {
    const csv = toCsv([{ nom: 'Dupont; Martin', montant: 1 }], COLONNES);
    expect(csv).toContain('"Dupont; Martin"');
  });

  it('double les guillemets internes', () => {
    const csv = toCsv([{ nom: 'Le "meilleur" produit', montant: 1 }], COLONNES);
    expect(csv).toContain('"Le ""meilleur"" produit"');
  });

  it('encadre les valeurs contenant un saut de ligne', () => {
    const csv = toCsv([{ nom: 'Ligne1\nLigne2', montant: 1 }], COLONNES);
    expect(csv).toContain('"Ligne1\nLigne2"');
  });

  it('laisse les valeurs simples sans guillemets', () => {
    const csv = toCsv([{ nom: 'Simple', montant: 42 }], COLONNES);
    expect(csv).toContain('Simple;42');
    expect(csv).not.toContain('"Simple"');
  });
});

describe('getTimestampedName', () => {
  it('compose un nom daté', () => {
    const nom = getTimestampedName('rapport', 'csv');
    expect(nom).toMatch(/^rapport-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('respecte l\'extension demandée', () => {
    expect(getTimestampedName('rapport', 'pdf').endsWith('.pdf')).toBe(true);
  });
});

describe('exportToCsv', () => {
  let clic: ReturnType<typeof vi.fn>;
  let ancre: HTMLAnchorElement;

  beforeEach(() => {
    // jsdom ne sait ni créer d'URL d'objet ni déclencher un téléchargement :
    // on observe l'appel plutôt que le fichier produit.
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:test');
    globalThis.URL.revokeObjectURL = vi.fn();

    clic = vi.fn();
    ancre = document.createElement('a');
    ancre.click = clic as unknown as () => void;

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
      tag === 'a' ? ancre : document.createElementNS('http://www.w3.org/1999/xhtml', tag),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('déclenche le téléchargement', () => {
    exportToCsv([{ nom: 'A', montant: 1 }], COLONNES, 'test.csv');
    expect(clic).toHaveBeenCalledTimes(1);
  });

  it('nomme le fichier téléchargé', () => {
    exportToCsv([{ nom: 'A', montant: 1 }], COLONNES, 'indicateurs.csv');
    expect(ancre.download).toBe('indicateurs.csv');
  });

  // Sans le BOM, Excel affiche « Chiffre d'affaires » à la place
  // des caractères accentués.
  // Le BOM doit être lu sur les octets bruts : Blob.text() le retire au
  // décodage, comme le ferait tout lecteur correct. Ce sont justement les
  // octets qu'Excel examine pour deviner l'encodage du fichier.
  it('préfixe le contenu d\'une marque d\'ordre des octets', async () => {
    let octets: Uint8Array | undefined;

    globalThis.URL.createObjectURL = vi.fn((blob: Blob) => {
      void blob.arrayBuffer().then((buffer) => {
        octets = new Uint8Array(buffer);
      });
      return 'blob:test';
    });

    exportToCsv([{ nom: 'Évaluation', montant: 1 }], COLONNES, 'test.csv');

    await vi.waitFor(() => expect(octets).toBeDefined());

    // Signature UTF-8 : EF BB BF
    expect(octets![0]).toBe(0xef);
    expect(octets![1]).toBe(0xbb);
    expect(octets![2]).toBe(0xbf);
  });

  // L'URL créée doit être libérée immédiatement, sinon l'objet reste
  // en mémoire jusqu'au rechargement de la page.
  it('libère l\'URL après le téléchargement', () => {
    exportToCsv([{ nom: 'A', montant: 1 }], COLONNES, 'test.csv');
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });
});

describe('exportToPdf', () => {
  it('génère un document sans erreur', () => {
    expect(() =>
      exportToPdf([{ nom: 'A', montant: 1 }], COLONNES, 'test.pdf', {
        title: 'Rapport de test',
      }),
    ).not.toThrow();
  });

  it('accepte un sous-titre', () => {
    expect(() =>
      exportToPdf([{ nom: 'A', montant: 1 }], COLONNES, 'test.pdf', {
        title: 'Rapport',
        subtitle: 'Comparaison de période',
      }),
    ).not.toThrow();
  });

  it('génère un document même sans donnée', () => {
    expect(() =>
      exportToPdf([], COLONNES, 'vide.pdf', { title: 'Rapport vide' }),
    ).not.toThrow();
  });
});

describe('colonnes prédéfinies', () => {
  it('décrit les indicateurs avec leur évolution', () => {
    const kpi = buildKpi("Chiffre d'affaires", 12000, 10000, { unit: 'EUR' });
    const ligne = KPI_COLUMNS.map((colonne) => String(colonne.accessor(kpi)));

    expect(ligne[0]).toBe("Chiffre d'affaires");
    expect(ligne[1]).toContain('€');
    expect(ligne[3]).toBe('+20 %');
    expect(ligne[4]).toBe('hausse');
  });

  it('formate chaque unité correctement', () => {
    const euros = KPI_COLUMNS[1].accessor(buildKpi('CA', 1000, 900, { unit: 'EUR' }));
    const pourcent = KPI_COLUMNS[1].accessor(buildKpi('Taux', 45, 40, { unit: 'pourcent' }));
    const jours = KPI_COLUMNS[1].accessor(buildKpi('Délai', 12, 10, { unit: 'jours' }));

    expect(String(euros)).toContain('€');
    expect(pourcent).toBe('45 %');
    expect(jours).toBe('12 j');
  });

  it('préfixe les évolutions positives d\'un signe', () => {
    const hausse = KPI_COLUMNS[3].accessor(buildKpi('CA', 120, 100));
    const baisse = KPI_COLUMNS[3].accessor(buildKpi('CA', 80, 100));

    expect(hausse).toBe('+20 %');
    expect(baisse).toBe('-20 %');
  });

  it('décrit un point de série temporelle', () => {
    const point = { key: '2026-03', label: 'mars 2026', value: 24500 };
    const ligne = TIME_SERIES_COLUMNS.map((colonne) => colonne.accessor(point));

    expect(ligne).toEqual(['mars 2026', 24500]);
  });

  it('décrit une part de catégorie', () => {
    const part = { category: 'smartphones', value: 12400, share: 32.1 };
    const ligne = CATEGORY_COLUMNS.map((colonne) => String(colonne.accessor(part)));

    expect(ligne[0]).toBe('smartphones');
    expect(ligne[2]).toBe('32.1 %');
  });
});

describe('flattenDashboard', () => {
  it('rassemble les indicateurs des cinq domaines', () => {
    const tableau = {
      sales: {
        revenue: buildKpi('CA', 1, 1),
        orderCount: buildKpi('Commandes', 1, 1),
        averageBasket: buildKpi('Panier', 1, 1),
        cancellationRate: buildKpi('Annulations', 1, 1),
      },
      stock: {
        turnoverRate: buildKpi('Rotation', 1, 1),
        daysOfInventory: buildKpi('Écoulement', 1, 1),
        lowStockCount: buildKpi('Alertes', 1, 1),
        restockValue: buildKpi('Réassort', 1, 1),
      },
      crm: {
        pipelineValue: buildKpi('Pipeline', 1, 1),
        weightedPipelineValue: buildKpi('Pondéré', 1, 1),
        winRate: buildKpi('Conversion', 1, 1),
        nps: buildKpi('NPS', 1, 1),
      },
      projects: {
        total: buildKpi('Projets', 1, 1),
        active: buildKpi('Actifs', 1, 1),
        averageProgress: buildKpi('Avancement', 1, 1),
        overdue: buildKpi('Retards', 1, 1),
      },
      hr: {
        totalEmployees: buildKpi('Effectif', 1, 1),
        teamCount: buildKpi('Équipes', 1, 1),
        pendingLeaveRequests: buildKpi('Congés', 1, 1),
        employeesOnLeaveToday: buildKpi('Absents', 1, 1),
      },
      range: {
        current: { from: '', to: '' },
        previous: { from: '', to: '' },
      },
    } as KpiDashboard;

    expect(flattenDashboard(tableau)).toHaveLength(20);
  });
});