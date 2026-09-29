# Decisión de arquitectura: API independiente con Mastra

- Estado: aceptada
- Fecha: 2026-09-28
- Alcance: asistente IA de Base Console

## Contexto

Base Console cuenta con un panel lateral de chat y una ruta server-side en Next.js (`POST /api/ai/chat`). Si `AI_CHAT_ENDPOINT` está vacío, el chat permanece en modo de preparación; con `base-agent` en marcha el BFF reenvía el stream.

El sistema ya separa dos responsabilidades principales:

- `base-front`: experiencia web, sesión mediante cookies `HttpOnly` y proxy hacia servicios internos.
- `base-golang`: identidad, autorización, usuarios, roles y reglas de negocio.

La funcionalidad de IA necesitará evolucionar de un chat básico hacia agentes, herramientas, memoria, streaming, trazabilidad y posiblemente RAG. Incluir estas responsabilidades en la API Go o directamente dentro del runtime de Next.js aumentaría el acoplamiento entre dominios con ciclos de despliegue y escalabilidad diferentes.

## Decisión

Se creará una API independiente construida con Mastra. El chat de `base-front` consumirá esa API a través de su ruta server-side `/api/ai/chat`.

Mastra no se instalará dentro de `base-front`. Vivirá en un proyecto y proceso separado, con despliegue, configuración y escalado propios.

```text
Navegador
   │
   │ sesión HttpOnly
   ▼
base-front (Next.js)
   │
   ├──► base-golang ──► PostgreSQL
   │    identidad, permisos y negocio
   │
   └──► API Mastra ──► proveedor de modelos
        agentes, herramientas, memoria y streaming
             │
             └──► base-golang mediante APIs autorizadas
```

## Responsabilidades

### Base Front

- Renderizar el panel de chat.
- Validar que exista una sesión activa antes de aceptar mensajes.
- Enviar el historial necesario a la API Mastra sin exponer secretos.
- Mostrar respuestas, streaming, estados de herramientas y errores recuperables.
- Mantener `AI_CHAT_API_KEY` y cualquier credencial exclusivamente en el servidor.
- No implementar reglas de autorización de negocio en componentes React.

### API Mastra

- Definir y ejecutar agentes, instrucciones y herramientas.
- Conectarse al proveedor de modelos seleccionado.
- Implementar streaming de respuestas.
- Gestionar memoria conversacional cuando sea necesaria.
- Aplicar límites de tiempo, tamaño, concurrencia y consumo.
- Emitir trazas y métricas sin registrar información sensible innecesaria.
- Consumir datos de negocio exclusivamente mediante endpoints autorizados de `base-golang`.

### Base Golang

- Continuar como fuente de verdad para usuarios, roles, permisos y datos de negocio.
- Validar toda operación solicitada por una herramienta de Mastra.
- No confiar en instrucciones del modelo como autorización.
- Mantener auditoría de las acciones sensibles iniciadas desde el asistente.

## Integración actual

El runtime vive en el repositorio sibling `base-agent` (TypeScript/Mastra, OpenAI
`openai/gpt-5-mini` por defecto). Base Front valida la sesión y firma un contexto
de actor HMAC de 5 minutos. El access token viaja como `X-Actor-Authorization`;
el refresh token no se envía.

```env
AI_CHAT_ENDPOINT=http://localhost:4111/v1/chat
AI_CHAT_API_KEY=replace-with-the-same-MASTRA_SERVICE_TOKEN
ACTOR_CONTEXT_SECRET=replace-with-the-same-secret-as-base-agent
```

`POST /v1/chat` acepta `{ messages, conversationId? }`. Con `X-Base-Stream: v1`
responde SSE (`event: delta|done|error`). Sin esa cabecera responde JSON
`{ configured, message }` para el modo de preparación y compatibilidad.

La primera herramienta es `list-roles` (`GET /v1/roles`). Go revalida JWT y
`ROLES:read`. No hay tools mutables ni acceso a PostgreSQL.

Rotación y fallo: [docs/runbook-ai.md](runbook-ai.md) y el runbook de
`base-agent`.

## Identidad y autorización

- El navegador nunca enviará credenciales del proveedor de IA.
- Next.js validará la sesión con `base-golang` antes de invocar Mastra.
- La comunicación entre Base Front y Mastra utilizará autenticación de servicio.
- Cuando Mastra necesite actuar en nombre de un usuario, recibirá un contexto de identidad breve, firmado y limitado; no se reutilizará el refresh token del usuario.
- Cada herramienta volverá a validar permisos en `base-golang` antes de leer o modificar datos.
- Las acciones destructivas o sensibles requerirán confirmación explícita en la interfaz.
- Los prompts, trazas y memorias no almacenarán contraseñas, tokens ni secretos.

## Fuera de alcance

- Instalar Mastra dentro del proyecto Next.js.
- Dar acceso directo de Mastra a las tablas de PostgreSQL de `base-golang`.
- Tools mutables, RAG y memoria durable: requieren un ADR nuevo.
- Seleccionar un proveedor o modelo distinto de OpenAI sin un ADR nuevo.

## Referencias

- [Integrating Mastra with Next.js: Two Approaches](https://mastra.ai/blog/nextjs-integration-guide)
- [Mastra Client SDK](https://mastra.ai/en/docs/deployment/client)
- [AI SDK support in Mastra](https://mastra.ai/blog/ai-sdk-v7-support)
