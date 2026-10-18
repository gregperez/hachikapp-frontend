# Diagramas (Archify)

Diagramas interactivos de Base Front. Abra los `.html` en un navegador para
usar tema claro/oscuro, pan/zoom, búsqueda y vistas guiadas.

> El contenido está autorado en español. La UI fija del visor Archify permanece
> en inglés (`html lang` fallback).

| Diagrama | Tipo | HTML | Especificación |
|----------|------|------|----------------|
| Procesos de Base Console | architecture | [base-front-architecture.html](./base-front-architecture.html) | [JSON](./base-front-architecture.json) |
| Chat SSE | sequence | [base-front-chat.html](./base-front-chat.html) | [JSON](./base-front-chat.sequence.json) |

## Regenerar

```sh
ARCHIFY="$HOME/.agents/skills/archify/bin/archify.mjs"
REPO="$(pwd)"
DIR=docs/diagrams

node "$ARCHIFY" deliver architecture "$DIR/base-front-architecture.json" \
  "$DIR/base-front-architecture.html" --quality showcase --repo-root "$REPO"

node "$ARCHIFY" deliver sequence "$DIR/base-front-chat.sequence.json" \
  "$DIR/base-front-chat.html" --quality showcase
```
