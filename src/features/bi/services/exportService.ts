// Export des rapports en CSV et PDF. Génération entièrement côté navigateur,
// aucun serveur n'intervient.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { APP_NAME } from '@/shared/config/constants';
import type { Kpi, TimeSeriesPoint, CategoryShare, KpiDashboard } from '../types';

export interface ExportColumn<T> {
  header: string;
  // Valeur affichée pour une ligne donnée.
  accessor: (row: T) => string | number;
}

/* ---------- Téléchargement ---------- */

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  // Libération immédiate : sans cela l'objet reste en mémoire
  // jusqu'au rechargement de la page.
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getTimestampedName(base: string, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${base}-${stamp}.${extension}`;
}

/* ---------- CSV ---------- */

// Point-virgule et non virgule : Excel en configuration française
// n'ouvre correctement que ce séparateur.
const CSV_SEPARATOR = ';';

function escapeCsvValue(value: string | number): string {
  const text = String(value ?? '');
  // Une valeur contenant le séparateur, un guillemet ou un saut de ligne
  // doit être encadrée, les guillemets internes étant doublés.
  if (/[";\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function toCsv<T>(rows: T[], columns: Array<ExportColumn<T>>): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(CSV_SEPARATOR);

  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(column.accessor(row))).join(CSV_SEPARATOR),
  );

  return [header, ...body].join('\r\n');
}

export function exportToCsv<T>(
  rows: T[],
  columns: Array<ExportColumn<T>>,
  filename: string,
): void {
  // Le BOM UTF-8 est indispensable : sans lui, Excel affiche les accents
  // en caractères illisibles.
  const bom = '\uFEFF';
  const blob = new Blob([bom + toCsv(rows, columns)], {
    type: 'text/csv;charset=utf-8;',
  });

  downloadBlob(blob, filename);
}

/* ---------- PDF ---------- */

interface PdfOptions {
  title: string;
  subtitle?: string;
}

function createPdfDocument({ title, subtitle }: PdfOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text(title, 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(120);
  const generatedAt = new Date().toLocaleString('fr-FR');
  doc.text(`${APP_NAME} — généré le ${generatedAt}`, 14, 25);

  if (subtitle) {
    doc.text(subtitle, 14, 31);
  }

  doc.setTextColor(0);
  return doc;
}

export function exportToPdf<T>(
  rows: T[],
  columns: Array<ExportColumn<T>>,
  filename: string,
  options: PdfOptions,
): void {
  const doc = createPdfDocument(options);

  autoTable(doc, {
    startY: options.subtitle ? 38 : 32,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(column.accessor(row)))),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [40, 40, 48], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 247] },
    margin: { left: 14, right: 14 },
  });

  doc.save(filename);
}

/* ---------- Colonnes prêtes à l'emploi ---------- */

function formatKpiValue(kpi: Kpi): string {
  if (kpi.unit === 'EUR') return `${kpi.value.toLocaleString('fr-FR')} €`;
  if (kpi.unit === 'pourcent') return `${kpi.value} %`;
  if (kpi.unit === 'jours') return `${kpi.value} j`;
  return String(kpi.value);
}

export const KPI_COLUMNS: Array<ExportColumn<Kpi>> = [
  { header: 'Indicateur', accessor: (kpi) => kpi.label },
  { header: 'Valeur', accessor: formatKpiValue },
  { header: 'Période précédente', accessor: (kpi) => kpi.previousValue },
  { header: 'Évolution', accessor: (kpi) => `${kpi.deltaPercent > 0 ? '+' : ''}${kpi.deltaPercent} %` },
  { header: 'Tendance', accessor: (kpi) => kpi.direction },
];

export const TIME_SERIES_COLUMNS: Array<ExportColumn<TimeSeriesPoint>> = [
  { header: 'Période', accessor: (point) => point.label },
  { header: 'Valeur', accessor: (point) => point.value },
];

export const CATEGORY_COLUMNS: Array<ExportColumn<CategoryShare>> = [
  { header: 'Catégorie', accessor: (item) => item.category },
  { header: 'Chiffre d\'affaires', accessor: (item) => item.value },
  { header: 'Part', accessor: (item) => `${item.share} %` },
];

// Aplatit le tableau de bord en une liste d'indicateurs exportable.
export function flattenDashboard(dashboard: KpiDashboard): Kpi[] {
  return [
    ...Object.values(dashboard.sales),
    ...Object.values(dashboard.stock),
    ...Object.values(dashboard.crm),
    ...Object.values(dashboard.projects),
    ...Object.values(dashboard.hr),
  ];
}