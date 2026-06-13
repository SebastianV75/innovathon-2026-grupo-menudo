/**
 * ai-brief — InsForge edge function
 *
 * Accepts a life-snapshot JSON from the Aliester frontend and returns a
 * structured attention-center brief via OpenRouter chat completions.
 *
 * Response shape (strict JSON):
 * {
 *   priority: { title, reason, route?, label? },
 *   next:     [{ title, reason, route?, label? }],
 *   context:  [{ label, value, detail?, route? }],
 *   defer:    [string],
 *   alerts:   [{ title, detail?, severity }]
 * }
 */

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const JSON_HEADERS: Record<string, string> = {
  ...CORS_HEADERS,
  'Content-Type': 'application/json',
};

/* ── Helpers ──────────────────────────────────────────── */

function jsonError(message: string, status = 500): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: JSON_HEADERS,
  });
}

function buildPrompt(snapshot: Record<string, unknown>): string {
  return `Eres Aliester, un asistente de gestion personal. Tu unica funcion es analizar el snapshot de vida del usuario y devolver UN SOLO OBJETO JSON (sin markdown, sin explicacion, sin texto adicional).

REGLAS ESTRICTAS:
- Devuelve SOLO JSON valido. Nada mas.
- "priority" es la UNICA cosa mas importante que necesita atencion AHORA. Debe ser concreta y accionable. Si no hay nada urgente, usa la tarea o evento mas relevante.
- "next" tiene 1-2 acciones de seguimiento. Nunca mas de 2.
- "context" tiene filas compactas de contexto: hoy/calendario, dinero, proyectos, notas, suscripciones. Solo lo relevante. Maximo 5 filas.
- "defer" tiene strings cortos de cosas que pueden esperar. Solo si aplica. Maximo 3.
- "alerts" solo si hay algo genuinamente alertable (balance negativo, concentracion de gastos, cobros inminentes). Maximo 3. Si no hay alertas, devuelve array vacio.
- "route" es un hash route como "#/proyectos", "#/calendario", "#/finanzas", "#/suscripciones", "#/notas", "#/cuentas". Solo si la accion lleva a una vista.
- "severity" en alerts: "error", "warning", o "info".
- NO inventes datos. Usa SOLO lo que viene en el snapshot.
- NO des consejos genericos de bienestar. Solo hechos y acciones concretas.
- Escribe todo en espanol.

ESTRUCTURA EXACTA:
{
  "priority": { "title": "string", "reason": "string", "route": "string?", "label": "string?" },
  "next": [{ "title": "string", "reason": "string", "route": "string?", "label": "string?" }],
  "context": [{ "label": "string", "value": "string", "detail": "string?", "route": "string?" }],
  "defer": ["string"],
  "alerts": [{ "title": "string", "detail": "string?", "severity": "error|warning|info" }]
}

SNAPSHOT DEL USUARIO:
${JSON.stringify(snapshot, null, 2)}

RESPONDE SOLO CON EL JSON:`;
}

function sanitizeBrief(parsed: Record<string, unknown>): Record<string, unknown> {
  // Ensure all required keys exist with safe defaults
  const priority = parsed.priority && typeof parsed.priority === 'object'
    ? parsed.priority as Record<string, unknown>
    : { title: 'Sin pendientes', reason: 'Dia libre' };

  const next = Array.isArray(parsed.next)
    ? parsed.next.slice(0, 2).filter((n: unknown) => n && typeof n === 'object')
    : [];

  const context = Array.isArray(parsed.context)
    ? parsed.context.slice(0, 5).filter((c: unknown) => c && typeof c === 'object')
    : [];

  const defer = Array.isArray(parsed.defer)
    ? parsed.defer.slice(0, 3).filter((d: unknown) => typeof d === 'string')
    : [];

  const alerts = Array.isArray(parsed.alerts)
    ? parsed.alerts.slice(0, 3).filter((a: unknown) => a && typeof a === 'object')
    : [];

  return { priority, next, context, defer, alerts };
}

/* ── Handler ──────────────────────────────────────────── */

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonError('Method not allowed', 405);
  }

  // Read secrets
  const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
  if (!openrouterKey) {
    return jsonError('OPENROUTER_API_KEY not configured', 500);
  }

  // Parse body
  let snapshot: Record<string, unknown>;
  try {
    snapshot = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400);
  }

  // Call OpenRouter
  const model = Deno.env.get('AI_MODEL') || 'openai/gpt-4o-mini';

  let completion: Record<string, unknown>;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openrouterKey}`,
        'HTTP-Referer': 'https://47br95d3.us-east.insforge.app',
        'X-Title': 'Aliester',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'user', content: buildPrompt(snapshot) },
        ],
        max_tokens: 800,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return jsonError(`OpenRouter error: ${res.status} ${errText}`, 502);
    }

    completion = await res.json();
  } catch (err) {
    return jsonError(`OpenRouter fetch failed: ${String(err)}`, 502);
  }

  // Extract content
  const choices = completion.choices as Array<{ message?: { content?: string } }> | undefined;
  const raw = choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return jsonError('Empty response from model', 502);
  }

  // Parse JSON from response (strip markdown fences if present)
  let parsed: Record<string, unknown>;
  try {
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonError('Model returned invalid JSON', 502);
  }

  // Sanitize and return
  const brief = sanitizeBrief(parsed);

  return new Response(
    JSON.stringify({ ...brief, source: 'ai', generatedAt: new Date().toISOString() }),
    { status: 200, headers: JSON_HEADERS },
  );
}
