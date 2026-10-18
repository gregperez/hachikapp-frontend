# Roadmap de Base Console

Los planes 001–008 están cerrados. El contrato vigente está en el código, los
ADRs y los diagramas; este índice solo registra lo entregado.

| Resultado | Dónde |
|---|---|
| Baseline de pruebas frontend | Vitest en `src/**/*.test.ts` |
| Navegación modular por permisos | Registro de módulos y sidebar |
| Menú de cuenta accesible | Menú de perfil |
| Sesiones activas | Perfil → sesiones |
| Auditoría administrativa | `/dashboard/settings/audit` |
| Configuración tipificada | `/dashboard/settings` |
| Catálogo de integraciones | `/dashboard/settings/integrations` |
| API Mastra independiente | sibling `base-agent` + BFF `/api/ai/chat` |

Quedan fuera: organizaciones, facturación, reportes genéricos, notificaciones
multicanal y API keys/webhooks como núcleo de la plantilla.

Diagramas: [docs/diagrams/README.md](../docs/diagrams/README.md).
Decisión Mastra: [docs/mastra-api-integration.md](../docs/mastra-api-integration.md).
