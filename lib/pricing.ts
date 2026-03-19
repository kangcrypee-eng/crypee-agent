export const MODEL_PRICING = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00, label: 'Haiku 4.5', desc: '빠르고 저렴. 단순 문서용' },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00, label: 'Sonnet 4.5', desc: '균형. 중간 복잡도' },
  'claude-opus-4-6': { input: 15.00, output: 75.00, label: 'Opus 4.6', desc: '최고 품질. 고복잡도' },
} as const
export type ModelId = keyof typeof MODEL_PRICING
export function estimateTokens(t: string): number { return t ? Math.ceil(t.length/3.5) : 0 }
export function estimateModulePricing(sp: string, up: string, ref: string, max: number, model: ModelId) {
  const p = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929']
  const inp = estimateTokens(sp) + estimateTokens(up) + estimateTokens(ref) + 500
  const out = Math.ceil(max * 0.8)
  const usd = (inp/1e6)*p.input + (out/1e6)*p.output
  const krw = usd * 1350
  const cr = Math.max(1, Math.ceil((krw/0.3)/990))
  const sell = cr * 990
  const margin = ((sell-krw)/sell)*100
  return { inputTokens:inp, outputTokens:out, totalUSD:usd, totalKRW:krw, credits:cr, sellingPrice:sell, margin }
}
