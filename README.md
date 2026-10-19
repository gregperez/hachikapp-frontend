# hachikapp-frontend
Frontend - Pet identity and health platform with medical records, vaccination tracking, and NFC identification.

> Basado en la plantilla [base-front](https://github.com/WilsonSayago/base-front).

Frontend administrativo para [`base-golang`](../../golang/base-golang), construido con Next.js, React y TypeScript.

## Funcionalidades

- Inicio y cierre de sesión con JWT.
- Tokens almacenados en cookies `HttpOnly`; no se exponen a JavaScript del navegador.
- Rotación automática del refresh token y reintento de solicitudes expiradas.
- Login opcional con Google OIDC.
- Panel de estado, usuarios recientes y accesos rápidos.
- Administración de usuarios, estado, privilegios de administrador y roles.
- Creación y edición de roles con matriz de permisos CRUD.
- Edición del perfil y cambio seguro de contraseña.
- Manejo de errores `application/problem+json` de la API.
- Diseño responsivo para escritorio, tablet y móvil.
- Panel lateral de asistente IA, desacoplado y listo para conectar con Mastra.

## Requisitos

- Node.js 20 o superior.
- Backend `base-golang` ejecutándose en `http://localhost:8080`.

## Configuración

```bash
cp .env.example .env.local
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Variables disponibles:

```env
BACKEND_URL=http://localhost:8080
CLIENT_IP_HEADER=
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
AI_CHAT_ENDPOINT=http://localhost:4111/v1/chat
AI_CHAT_API_KEY=
ACTOR_CONTEXT_SECRET=
```

`BACKEND_URL` solo se utiliza en el servidor de Next.js. `NEXT_PUBLIC_BACKEND_URL` se usa para iniciar la redirección del login de Google.

`CLIENT_IP_HEADER` indica de qué cabecera sale la IP del visitante, que Next reenvía a la API en `X-Forwarded-For` para sus límites por visitante (ficha pública `/t/...` y login). Vacía o `x-forwarded-for`: se usa la **última** entrada de `x-forwarded-for` (la que agrega el proxy más cercano). Otro nombre (por ejemplo `x-real-ip` o `cf-connecting-ip`): se usa esa cabecera tal cual, sin recurrir a otra. **El frontend debe correr detrás de un proxy que fije o sobrescriba esa cabecera**; si no, cada cliente puede elegir su IP. Además, el backend debe incluir la dirección de este servidor en `AUTH_TRUSTED_PROXY_CIDRS`, o todos los visitantes compartirán la misma cuota.

El chat funciona en modo de preparación cuando `AI_CHAT_ENDPOINT` está vacío. Para conectarlo, arranca `base-agent` y copia `MASTRA_SERVICE_TOKEN` en `AI_CHAT_API_KEY` y el mismo `ACTOR_CONTEXT_SECRET`. El BFF `POST /api/ai/chat` valida la sesión, firma el actor y reenvía SSE; el navegador nunca recibe la clave del modelo ni la credencial de servicio.

La decisión, el runbook y los diagramas están en [docs/mastra-api-integration.md](docs/mastra-api-integration.md), [docs/runbook-ai.md](docs/runbook-ai.md) y [docs/diagrams/README.md](docs/diagrams/README.md).

## Integración con el backend

Todas las llamadas del navegador pasan por `/api/backend/*`. Esta capa de Next.js:

1. reenvía las solicitudes a la API Go;
2. agrega el access token desde una cookie `HttpOnly`;
3. rota los tokens al recibir un `401` en una ruta protegida;
4. vuelve a intentar una vez la solicitud original;
5. limpia la sesión si la renovación falla.

Para Google OIDC, agrega `http://localhost:3000/auth/callback` a los destinos permitidos del backend.

## Verificación

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

`npm test` ejecuta Vitest en modo no interactivo. Usa `npm run test:watch` para el modo observador.

## Diagramas

- [Procesos de Base Console](docs/diagrams/base-front-architecture.html)
- [Chat SSE](docs/diagrams/base-front-chat.html)
- [Índice y regeneración](docs/diagrams/README.md)

