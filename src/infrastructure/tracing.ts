import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

let sdk: NodeSDK | null = null
export function startTracing(): void {
  if (sdk || process.env.OTEL_SDK_DISABLED === 'true') return
  sdk = new NodeSDK({
    traceExporter: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? new OTLPTraceExporter({ url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT }) : undefined,
    instrumentations: [getNodeAutoInstrumentations()],
  })
  void sdk.start()
}
export async function stopTracing(): Promise<void> { if (sdk) { await sdk.shutdown(); sdk = null } }