# Roadmap de evolución de Base Console

Generado el 2026-09-28 contra `base-front@31f5a7f` y
`base-golang@cffecc9`. Este directorio es el contrato de trabajo para agentes:
cada ejecución debe leer primero [STANDARDS.md](./STANDARDS.md), después el plan
asignado completo, comprobar deriva y respetar alcance y dependencias.

## Orden y estado

| Plan | Resultado | Prioridad | Esfuerzo | Depende de | Estado |
|---|---|---:|---:|---|---|
| [001](./001-establecer-baseline-pruebas-frontend.md) | Baseline de pruebas frontend | P1 | M | — | DONE — spot-check 2026-09-28 |
| [002](./002-modularizar-navegacion-por-permisos.md) | Navegación modular y autorizada | P1 | M | 001 | DONE — spot-check 2026-09-28 |
| [003](./003-crear-menu-cuenta-accesible.md) | Menú de cuenta accesible | P1 | S | 001, 002 | DONE — spot-check 2026-09-28 |
| [004](./004-gestionar-sesiones-activas.md) | Sesiones activas autogestionables | P1 | L | 001, 002 | DONE — spot-check 2026-09-28 |
| [005](./005-persistir-y-consultar-auditoria.md) | Auditoría administrativa consultable | P1 | L | 002 | DONE — spot-check 2026-09-28 |
| [006](./006-agregar-configuracion-tipificada.md) | Configuración general tipificada | P2 | L | 002, 005 | DONE — spot-check 2026-09-28 |
| [007](./007-crear-catalogo-integraciones.md) | Catálogo modular de integraciones | P2 | M | 002, 006 | DONE |
| [008](./008-integrar-api-mastra.md) | API Mastra independiente integrada | P2 | L | 001, 002, 005, 007 | IN PROGRESS |

Estados válidos: `TODO`, `IN PROGRESS`, `DONE`, `DEFERRED: <motivo>`,
`BLOCKED: <motivo>` y `REJECTED: <motivo>`.

## Última reconciliación

El 2026-09-28 se realizó un spot-check de los planes 001–006 sobre
`base-front@9cadf64` y `base-golang@a984805`:

- Frontend: `npm test` (63 pruebas), `npm run lint`, `npm run typecheck` y
  `npm run build`, todos con exit 0.
- Backend: `make fmt-check`, `make test` y `make openapi-lint`, todos con exit 0.

El plan 007 aterrizó el catálogo `/dashboard/settings/integrations` con
adaptadores sanitizados de Google OIDC y Mastra. El plan 008 está en curso
en `base-agent` (OpenAI) y el BFF de Base Front.

## Dependencias

```text
001 ──► 002 ──► 003
        ├─────► 004
        ├─────► 005 ──► 006 ──► 007 ──► 008
        └───────────────────────────────► 008
```

- `001` debe aterrizar primero: sin pruebas de componentes, los siguientes
  cambios de navegación no tienen una barrera de regresión automática.
- `002` define el registro de módulos y permisos consumido por todos los menús.
- `004` puede avanzar en paralelo con `005` después de `002`, coordinando si
  ambos agregan entidades de autorización, migrations u OpenAPI.
- `006` depende de auditoría porque todo cambio administrativo de configuración
  debe dejar evidencia.
- `008` reutiliza el catálogo de integraciones y la auditoría para mostrar el
  estado de Mastra y registrar herramientas sensibles.

## Forma de asignar un plan a otro agente

```text
Implementa únicamente plans/NNN-<slug>.md. Lee primero plans/STANDARDS.md y
plans/README.md. Ejecuta el drift check antes de editar y detente ante cualquier
STOP condition. No amplíes el alcance ni debilites autorización, validación,
auditoría o pruebas. Ejecuta todos los gates y entrega: archivos modificados,
commits locales, comandos/resultados, riesgos residuales y pasos operativos.
No hagas push ni marques DONE si queda un gate rojo.
```

Para planes multirrepositorio, usar el mismo slug de rama en cada repositorio y
commits separados por responsabilidad. La publicación remota, despliegue,
rotación de secretos y migración de bases reales requieren autorización humana.

## Decisiones descartadas por ahora

- Organizaciones/workspaces: introduce multitenancy y aislamiento de datos sin
  que exista todavía un requisito de producto.
- Facturación: depende del modelo comercial del proyecto consumidor.
- Reportes genéricos: cada dominio necesita métricas propias.
- Notificaciones multicanal: requiere catálogo de eventos, preferencias y
  proveedores; reevaluar cuando exista un caso de uso concreto.
- API keys y webhooks: agregarlos como integración opcional, nunca como núcleo
  vacío de la plantilla.
- Tres niveles de sidebar: usar como máximo sección, enlace y tabs dentro de la
  página para evitar navegación profunda.
