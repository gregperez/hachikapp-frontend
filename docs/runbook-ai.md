# Runbook — chat Mastra desde Base Front

## Configuración local

En `.env.local`:

```env
AI_CHAT_ENDPOINT=http://localhost:4111/v1/chat
AI_CHAT_API_KEY=<mismo valor que MASTRA_SERVICE_TOKEN>
ACTOR_CONTEXT_SECRET=<mismo valor que en base-agent>
```

El navegador no debe ver estas variables. El catálogo
`/dashboard/settings/integrations` sonda `GET /health/live` y no imprime
endpoints ni claves.

## Rotar secretos

1. Generar nuevos `MASTRA_SERVICE_TOKEN` y `ACTOR_CONTEXT_SECRET`.
2. Actualizar `base-agent` y `.env.local` de Base Front en el mismo cambio.
3. Reiniciar ambos procesos.
4. Verificar el catálogo: Mastra pasa a Configurada si `/health/live` responde.

`OPENAI_API_KEY` no se configura aquí.

## Fallo de Mastra

Si `base-agent` está caído, el panel muestra un error recuperable. Usuarios,
roles, auditoría y perfil siguen funcionando porque no comparten proceso ni
base de datos con el agente.
