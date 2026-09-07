// Chaque appel axios devient une trace envoyée à Honeycomb
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor, StackContextManager, WebTracerProvider } from '@opentelemetry/sdk-trace-web';

const HONEYCOMB_API_KEY = import.meta.env.VITE_HONEYCOMB_API_KEY as string | undefined;
const HONEYCOMB_ENDPOINT = 'https://api.honeycomb.io/v1/traces';

// Si pas de clé configurée, aucune trace n'est envoyée
export function initTracing(): void {
  if (!HONEYCOMB_API_KEY) {
    console.warn('[OpenTelemetry] VITE_HONEYCOMB_API_KEY manquant, tracing désactivé.');
    return;
  }

  const exporter = new OTLPTraceExporter({
    url: HONEYCOMB_ENDPOINT,
    headers: { 'x-honeycomb-team': HONEYCOMB_API_KEY },
  });

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({ [ATTR_SERVICE_NAME]: 'omni-erp-frontend' }),
    spanProcessors: [new BatchSpanProcessor(exporter)],
  });

  // axios utilise XMLHttpRequest dans le navigateur
  provider.register({ contextManager: new StackContextManager() });

  registerInstrumentations({
    instrumentations: [
      new XMLHttpRequestInstrumentation({
        propagateTraceHeaderCorsUrls: /.*/,
      }),
    ],
  });
}