# Aliester — Documento de Alcance y Cotización

> App de **gestión personal unificada** con asistente IA. Este documento describe qué es, qué hace, cómo está construido, y los componentes que se cotizan.

---

## 1. Producto en una línea

**Aliester** es una aplicación web (con app móvil vía WebView) que reúne **finanzas, proyectos, calendario, notas, cuentas y suscripciones** en un solo panel, y un **asistente con IA** que analiza todo el contexto del usuario y le dice **qué atender primero**. El diferencial no es la herramienta, es la **atención dirigida**: combate la parálisis de tener todo disperso en cinco apps distintas.

**Target:** freelancers, emprendedores y estudiantes con múltiples frentes simultáneos que necesitan un único punto de verdad.

---

## 2. Stack técnico

| Capa | Tecnología | Notas |
|---|---|---|
| Frontend web | **Vanilla JavaScript** (sin framework) | SPA con router por hash, sin build step, servido como estático |
| CSS | **CSS plano modular** | 7 archivos (`tokens`, `base`, `layout`, `components`, `views`, `auth`, `chatbot`) con design tokens |
| Backend / BaaS | **InsForge** | Postgres con Row Level Security por usuario, auth, storage, edge functions, AI gateway |
| Edge functions | **Deno / TypeScript** | AI brief + Google Calendar sync |
| Auth | Email + password con verificación por código | Sesión manejada por SDK de InsForge |
| IA | **OpenRouter** (modelo configurable vía env, default `openai/gpt-4o-mini`) | Con fallback heurístico local cuando no hay API key o falla |
| Storage | InsForge Storage (S3-compatible) | Bucket privado `task-attachments` con RLS por usuario |
| Deploy frontend | **Vercel** | Sirve `apps/desktop/public`; root/output configurado en Vercel |
| Deploy backend | **InsForge CLI** | `migrations/` + `functions/` desde la raíz |
| App móvil | **WebView nativa** (placeholder) | Carga el web actual; pensada para evolucionar a código nativo |
| Moneda | MXN (base) con conversión a USD/EUR | Tasas hardcodeadas en cliente |

### Estructura del repo (monorepo)

```
aliester/
├── apps/
│   ├── desktop/public/        # Frontend web de producción (Vercel root)
│   │   ├── index.html
│   │   ├── css/               # 7 hojas de estilo
│   │   └── js/
│   │       ├── app.js         # Router + settings + helpers
│   │       ├── data/store.js  # Capa de datos (~500 líneas)
│   │       ├── services/insforge.js
│   │       └── views/         # 10 vistas, una por módulo
│   └── mobile/app/            # Shell nativa mínima
├── functions/                 # Edge functions (Deno)
│   ├── ai-brief.ts
│   └── google-calendar-sync.ts
├── migrations/                # 7 migraciones SQL aplicadas con InsForge CLI
├── docs/                      # Documentación
├── vercel.json                # Config de URLs de Vercel
├── insforge.toml              # Config de InsForge (auth, SMTP, storage, etc.)
└── .env.local                 # Secretos locales (gitignored)
```

---

## 3. Módulos funcionales (lo que el usuario ve y hace)

### 3.1 Dashboard

- Vista panorámica: balance del mes, tareas urgentes, próximos eventos, gasto total en suscripciones.
- Punto de entrada a cada módulo.

### 3.2 Asistente IA (centro de atención)

- **Dos modos**:
  - **Motor heurístico local**: sin conexión a internet, sin costo, sin clave. Genera prioridad + acciones + contexto + alertas + diferibles a partir de los datos del usuario.
  - **Modo IA (OpenRouter)**: envía un **snapshot completo** de la vida del usuario (tareas, finanzas, calendario, suscripciones, notas, cuentas) y devuelve un brief estructurado en JSON estricto.
- Estructura de respuesta garantizada:

  ```json
  {
    "priority": { "title", "reason", "route?", "label?" },
    "next":     [ { "title", "reason", "route?", "label?" } ],   // máx 2
    "context":  [ { "label", "value", "detail?", "route?" } ],   // máx 5
    "defer":    [ "string" ],                                     // máx 3
    "alerts":   [ { "title", "detail?", "severity" } ]            // máx 3
  }
  ```

- **Fallback automático**: si la API de OpenRouter falla o no hay clave, el motor local toma el relevo sin interrumpir la experiencia.

### 3.3 Cuentas

- Alta de tarjetas y cuentas bancarias con: banco, terminación, tipo (débito/crédito), red (Visa/MC/Amex), saldo, color.
- CRUD completo con persistencia en la nube.

### 3.4 Finanzas

- Registro de **ingresos y gastos** por categoría.
- Cada movimiento puede vincularse a una cuenta bancaria.
- Cálculo automático de balance, totales por categoría, gasto mensual.

### 3.5 Proyectos

- Proyectos con nombre, descripción y estado (`activo`, `hecho`).
- **Tareas anidadas** con título, estado (`pendiente` / `en-progreso` / `hecha`), prioridad (`alta` / `media` / `baja`) y **fecha de terminado**.
- **Adjuntos por tarea**: PDF, TXT e imágenes vía storage privado con RLS (límite 50 MB por archivo).
- Vista tipo kanban simplificado.

### 3.6 Calendario

- Eventos con título, fecha, hora y color.
- **Sincronización bidireccional con Google Calendar** (OAuth, refresh tokens, sync por cursor incremental, manejo de `etag`).
- Soporta múltiples cuentas Google por usuario (unique index `user_id + provider`).

### 3.7 Notas

- Notas con título, contenido, fecha.
- Listado cronológico.

### 3.8 Suscripciones

- Servicios activos con: nombre, descripción, costo, estado (`activa` / `cancelada`), **fecha de corte** (día del mes), cuenta asociada.
- **Alertas de cobro inminente** (ventana de 5 días) consumidas por el Asistente.
- Registro de **fecha y motivo de cancelación** al dar de baja.

### 3.9 Autenticación

- Registro, login, logout, verificación de email por código, recuperación de contraseña por código.
- Verificación de email **obligatoria** para acceder (`require_email_verification = true`).

### 3.10 Settings (persistencia local)

- Modo oscuro / claro.
- Moneda (MXN, USD, EUR).
- Tamaño de fuente (normal / grande).
- Notificaciones on/off.
- Persistidos en `localStorage`.

---

## 4. Componentes técnicos que se cotizan

### 4.1 Frontend web (10 vistas, router, store, helpers)

- **`views/auth.js`** — pantallas de login, registro, verificación de email, recuperación de contraseña (~600 líneas).
- **`views/dashboard.js`** — agregaciones y resumen.
- **`views/asistente.js`** — integración con edge function, render del brief, modo heurístico local (~700 líneas).
- **`views/cuentas.js`** — CRUD de cuentas (~600 líneas).
- **`views/finanzas.js`** — CRUD de transacciones con gráficos y filtros (~850 líneas).
- **`views/proyectos.js`** — proyectos + tareas + adjuntos (~800 líneas).
- **`views/calendario.js`** — vista mensual, eventos, sync con Google (~550 líneas).
- **`views/notas.js`** — CRUD de notas (~450 líneas).
- **`views/suscripciones.js`** — CRUD de suscripciones con alertas (~400 líneas).
- **`views/chatbot.js`** — interfaz de chat libre (legacy / experimental) (~800 líneas).
- **`data/store.js`** — capa de datos unificada con caché, mappers, CRUD por entidad (~500 líneas).
- **`app.js`** — router por hash, settings, utilidades de formateo, sidebar, modales.
- **`services/insforge.js`** — wrapper del SDK de InsForge.

**Total JS frontend (producción): ~7.000 líneas de JS + ~2.500 líneas de CSS en 7 hojas.**

### 4.2 Backend / InsForge

**Base de datos (Postgres) — 9 tablas, todas con RLS por usuario:**

| Tabla | Propósito |
|---|---|
| `accounts` | Cuentas bancarias del usuario |
| `transactions` | Ingresos y gastos, vinculados opcionalmente a cuenta y tarea |
| `projects` | Proyectos del usuario |
| `tasks` | Tareas con estado, prioridad, fecha de terminado, proyecto |
| `events` | Eventos de calendario, con columnas para sync con Google |
| `notes` | Notas |
| `subscriptions` | Suscripciones con ciclo de cobro |
| `calendar_connections` | Tokens OAuth de Google Calendar por usuario |
| `task_attachments` | Metadata de adjuntos subidos a Storage |

**Triggers, índices y policies:** `updated_at` automático en cada tabla, índices por `user_id` y FKs, RLS `users_own_*` con `auth.uid()` en SELECT/INSERT/UPDATE/DELETE.

**Storage:** 1 bucket privado (`task-attachments`) con policies de RLS por `uploaded_by` para SELECT/INSERT/UPDATE/DELETE.

**Edge functions (Deno):**

- **`ai-brief.ts`** — recibe snapshot del usuario, llama a OpenRouter, sanitiza la respuesta, garantiza la estructura. Modelos y claves vía env vars.
- **`google-calendar-sync.ts`** — sync bidireccional con Google Calendar, manejo de OAuth (access + refresh), cursor incremental, `etag`, mapeo de colores, ventana configurable.

**Migraciones:** 7 archivos SQL versionados, aplicados con `insforge` CLI.

### 4.3 Deploy / infra

- **Vercel** sirviendo `apps/desktop/public` como estático (sin build step).
- Root/output configurado en el proyecto de Vercel.
- **InsForge** con proyecto en `us-east` (`https://47br95d3.us-east.insforge.app`).
- **App móvil** como WebView del sitio (placeholder; lista para evolución a código nativo).
- Configuración declarativa en `insforge.toml`; `vercel.json` sólo define comportamiento de URLs.

---

## 5. Lo que el producto hace hoy (estado funcional)

✅ Autenticación completa con verificación de email por código
✅ 8 módulos con CRUD persistente en la nube
✅ Datos aislados por usuario (RLS en todas las tablas)
✅ Asistente con IA con fallback heurístico local (offline-first)
✅ Sincronización bidireccional con Google Calendar
✅ Adjuntos privados en tareas (PDF, TXT, imágenes, hasta 50 MB)
✅ Settings con persistencia local
✅ Modo oscuro, multi-moneda, tamaño de fuente
✅ Deploy en producción (Vercel + InsForge)

---

## 6. Lo que aún no está (próximos pasos ya listados)

Estos ítems están documentados como roadmap en el README, **no incluidos** en el alcance actual:

- Exportación de datos (CSV / PDF).
- Recordatorios y notificaciones push.
- Presupuestos por categoría con límites.
- Vista de **timeline unificada** (eventos + tareas + cobros en una sola línea de tiempo).
- Onboarding guiado para nuevos usuarios.
- Evolución de la app móvil de WebView a código nativo (iOS / Android).

---

## 7. Consideraciones de seguridad

- **Aislamiento por usuario**: Row Level Security en Postgres garantiza que un usuario solo ve y modifica sus propios registros.
- **Storage privado**: las políticas de RLS en `storage.objects` filtran por `uploaded_by` (id del JWT) y por bucket.
- **Auth reforzada**: email verificado obligatorio, códigos de un solo uso, recuperación por código.
- **Secrets** fuera del repo: claves en `.env.local` (gitignored) y en vars de entorno del edge function.
- **API key de OpenRouter**: solo se usa server-side en la edge function; el frontend nunca la ve.

---

## 8. Estimación — qué se cotiza

Para cotizar este producto se puede descomponer en **líneas de trabajo** claras:

### A) Producto ya entregado (tal como está hoy)

- **8 módulos funcionales** + auth + asistente IA + sync Google Calendar + adjuntos.
- Aproximadamente **~10.000 líneas de código** entre JS, CSS, SQL y Deno.
- Estimación de esfuerzo ya invertido: **~8–10 semanas de un dev full-stack senior** (orden de magnitud, ajustable según cómo se haya desarrollado).

### B) Roadmap inmediato (para referencia, no incluido en el estado actual)

| Feature | Esfuerzo estimado |
|---|---|
| Exportación CSV/PDF | 1–2 semanas |
| Notificaciones push | 1–2 semanas (más setup de provider) |
| Presupuestos por categoría | 1 semana |
| Timeline unificada | 1–2 semanas |
| Onboarding guiado | 1 semana |
| App móvil nativa (iOS + Android) | 6–10 semanas adicionales |

### C) Mantenimiento / evolución (mensual sugerida)

- **Soporte y bugs**: ~10–15 h/mes.
- **Hosting**: Vercel (plan gratuito o pro) + InsForge (plan según usuarios activos) + costo de OpenRouter (consumo por tokens).
- **Iteraciones de producto**: paquetes de 2–4 semanas por cada nueva funcionalidad.

---

## 9. Cómo probarlo en local

```bash
# Frontend
cd apps/desktop/public && python3 -m http.server 8080

# Backend (con InsForge CLI)
npx @insforge/cli functions deploy
npx @insforge/cli db push
```

URL de producción: **<https://aliester.vercel.app>**

---

## 10. Resumen ejecutivo (para el que cotiza)

**Aliester es un SaaS de gestión personal** con asistente IA, **listo para producción**, multi-idioma potencial (hoy en español), multi-moneda, con sync de Google Calendar, storage privado de adjuntos, y arquitectura segura por usuario. El stack es **liviano en frontend** (vanilla JS, sin React ni build), **pesado en backend gestionado** (InsForge = Postgres + auth + storage + edge functions en una sola plataforma). Esto reduce drásticamente el costo de mantenimiento respecto a una app equivalente con stack tradicional (Node + Express + S3 + Auth0 + Vercel Functions + etc.).

**Pregunta clave para cotizar:** ¿se está cotizando el producto como está, una evolución concreta, o un servicio mensual de mantenimiento + roadmap?
