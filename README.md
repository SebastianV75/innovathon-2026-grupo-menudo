# Aliester

**Tu vida organizada en un solo lugar. Calma por claridad, no por ausencia de pendientes.**

Aliester es una app de gestión personal que reúne finanzas, proyectos, calendario, notas y suscripciones en un panel unificado. Su valor central: un asistente inteligente que analiza todo tu contexto y te dice **qué atender primero**, eliminando la parálisis de tener información dispersa.

## El problema

La gente no se desorganiza por falta de herramientas — se desorganiza porque cada área de su vida vive en una app distinta. El banco en una, las tareas en otra, el calendario en otra, las suscripciones en ninguna. El resultado: decisiones reactivas, cobros sorpresa, y la sensación constante de que algo se te escapa.

## Para quién

Personas que manejan múltiples frentes simultáneos — freelancers, emprendedores, estudiantes con proyectos paralelos — que necesitan un solo punto de verdad sin configurar cinco herramientas diferentes.

## Cómo funciona

| Módulo | Qué resuelve |
|--------|-------------|
| **Dashboard** | Vista panorámica: balance del mes, tareas urgentes, próximos eventos, gasto en suscripciones |
| **Asistente IA** | Centro de atención. Analiza tus datos y te dice qué priorizar, qué puede esperar, y qué alertas merecen acción |
| **Finanzas** | Registro de ingresos y gastos por categoría, vinculados a cuentas bancarias |
| **Cuentas** | Tarjetas y cuentas con saldo, tipo, red y terminación |
| **Proyectos** | Proyectos con tareas, prioridades y estados (kanban simplificado) |
| **Calendario** | Eventos y citas con fecha, hora y color |
| **Notas** | Ideas y apuntes con fecha |
| **Suscripciones** | Servicios activos con costo, fecha de corte y cuenta asociada. Alertas antes del cobro |

El asistente tiene dos modos: un **motor heurístico local** que funciona sin conexión, y un **modelo de IA** vía OpenRouter que genera análisis más sofisticados a partir del snapshot completo de tu vida.

## Personalización

- Modo oscuro / claro
- Moneda configurable (MXN, USD, EUR)
- Tamaño de fuente ajustable
- Notificaciones on/off

## Stack técnico

El repo es un monorepo con un único backend compartido y dos frontends:

- **`apps/desktop/`** — frontend web vanilla JS (sin framework) con router por hash, servido como sitio estático.
- **`apps/mobile/`** — app móvil nativa (placeholder por ahora, carga el web actual vía WebView).
- **Backend InsForge en la raíz** — Postgres con Row Level Security por usuario, autenticación con email/password, y edge functions en Deno para la integración con IA.

### Levantar el desktop local

```
cd apps/desktop/public && python3 -m http.server 8080
```

### Deploy

Vercel sirve `apps/desktop/public` como sitio estático. El root/output directory se configura en el proyecto de Vercel; `vercel.json` sólo define comportamiento de URLs.

Antes de promover a producción, validar en Vercel que el root/output apunte a `apps/desktop/public`. Si un deploy sale mal por esa configuración, revertir al último deploy estable en Vercel y corregir el root/output antes de redeployar.

El backend se deploya por separado con el CLI de InsForge desde la raíz.

## Estado actual

- Autenticación completa (registro, login, verificación de email)
- Los 7 módulos funcionales con CRUD persistente en la nube
- Asistente IA con fallback heurístico local
- Datos aislados por usuario (RLS en todas las tablas)
- Settings con persistencia en localStorage

## Siguientes pasos

- Exportación de datos (CSV/PDF)
- Recordatorios y notificaciones push
- Presupuestos por categoría con límites
- Vista de timeline unificada (eventos + tareas + cobros)
- Onboarding guiado para nuevos usuarios
