// Envoi d'alertes vers Slack via un webhook entrant
const SLACK_WEBHOOK_URL = import.meta.env.VITE_SLACK_WEBHOOK_URL as string | undefined;

export async function sendSlackAlert(message: string): Promise<void> {
  if (!SLACK_WEBHOOK_URL) {
    console.warn('[Slack] VITE_SLACK_WEBHOOK_URL manquant, alerte non envoyée.');
    return;
  }

  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ text: message }),
  });
}