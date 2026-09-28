# Base Front

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
NEXT_PUBLIC_BACKEND_URL=http://localhost:8080
AI_CHAT_ENDPOINT=
AI_CHAT_API_KEY=
```

`BACKEND_URL` solo se utiliza en el servidor de Next.js. `NEXT_PUBLIC_BACKEND_URL` se usa para iniciar la redirección del login de Google.

El chat funciona en modo de preparación cuando `AI_CHAT_ENDPOINT` está vacío. Para conectarlo, configura un endpoint server-side que reciba `{ messages }` y devuelva `{ message }` o `{ text }`; `AI_CHAT_API_KEY` se envía como Bearer token sin exponerse al navegador. Esta frontera permite agregar después un adaptador con `@mastra/client-js` o streaming con `@mastra/ai-sdk` sin modificar el panel.

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
npm run lint
npm run typecheck
npm run build
```
