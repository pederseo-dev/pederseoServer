# Contexto del proyecto — pederseoServer

## Qué es esto
Backend FastAPI + uv, desplegado en Render, base de datos Supabase (Postgres). Originalmente era un server Express básico, se migró completo a FastAPI.

## Convenciones de arquitectura
- **Estructura**: todo el código vive en `app/`. Sin `__init__.py` (namespace packages implícitos de Python 3 — decisión deliberada, más limpio).
- **Ejecución**: siempre `uv run uvicorn app.main:app` desde la raíz del repo (nunca `--app-dir`). Los imports internos usan siempre el prefijo `app.` (ej. `from app.core.database import engine`), tanto en el código de la app como en `migrations/env.py` — es la misma convención en todos lados.
- **Patrón de módulo**: cada carpeta en `app/modules/<nombre>/` tiene `schema.py` (modelos SQLModel de tabla + schemas Pydantic de request), `service.py` (lógica de negocio, acceso a DB), `controller.py` (maneja errores HTTP, llama al service), `router.py` (rutas FastAPI, wiring de dependencias). Cada módulo se registra en `app/main.py` con `app.include_router(...)`.
- **DB**: SQLModel + Alembic. `app/core/database.py` centraliza el engine, normaliza `postgresql://` → `postgresql+psycopg://` (usamos psycopg3, no psycopg2). `migrations/env.py` importa el `DATABASE_URL` desde ahí (no duplica lógica) y debe importar el `schema` de cada módulo nuevo para que autogenerate detecte sus tablas.
- **Gotcha conocido**: el template de Alembic (`migrations/script.py.mako`) tiene `import sqlmodel` agregado a mano porque el autogenerate de SQLModel no lo agrega solo y sin eso las migraciones generadas fallan (`NameError: sqlmodel`).

## Auth
- Supabase Auth (email + password, sin confirmación de email para no trabar el flujo el día del evento).
- `app/core/auth.py`: dependencia `get_current_user_id` que valida el JWT de Supabase con las claves públicas del JWKS (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, ES256, audience "authenticated") y devuelve el UUID del usuario.
- `app/core/admin.py`: dependencia `require_admin`, compara el user_id contra `ADMIN_USER_ID` (env var).
- Fotos: se suben directo del navegador a Supabase Storage (bucket `photos`, público, con policy de INSERT solo autenticado) — el backend nunca recibe el archivo, solo la URL resultante. El bucket viejo `wedding-photos` tiene las fotos del primer evento (ya descargadas).

## Módulos
- **`status_server`**: `GET /status` — siembra una fila en `server_status` la primera vez y reporta salud de server+DB. Pensado para pings de cronjob.org (keep-alive del free tier de Render).
- **`instacam`**: la app real, **Instacam**. Juego de fotos genérico para eventos (empezó para una boda). La idea es usarlo por períodos y reiniciar todo entre uno y otro. API en `/api/...`. Código en inglés, interfaz en español:
  - Jugadores repartidos en **murales** (`Board`, es un equipo). Hay una lista fija de **consignas** (`Prompt`).
  - **Fase 1 (interna)**: cualquiera de tu mural saca fotos para cualquier consigna. Los de tu propio mural votan (`PromptVote`, se puede votar la propia foto) cuál representa mejor cada consigna — el mural muestra en vivo la foto ganadora de cada consigna.
  - **Fase 2 (cruzada)**: cada persona tiene un solo voto total (`BoardVote`, no auto-voto) a favor de OTRO mural. Gana el mural con más votos.
  - **Desempate**: con votos iguales gana la foto más vieja (y entre murales, el de menor id). `_highlights()` en `service.py` es la única fuente de "foto ganadora".
  - Sin estados de "cerrado/finalizado": todo se recalcula en vivo, los votos son reemplazables (no hay historial, un voto por voter_id en cada tabla).
  - Modelo: `Board`, `Prompt`, `Player` (conecta user_id de Supabase con su mural+nombre), `Photo`, `PromptVote`, `BoardVote`.
  - `/` (raíz del dominio) sirve el frontend estático de este módulo (`app/modules/instacam/static/`), montado con `StaticFiles`: JS vanilla sin módulos (scripts globales). Páginas: `index.html` (login/registro de cuenta), `registro.html` (elegir mural y nombre), `mi-mural.html` ("Mi mural": sacar fotos con `camera.js`, votar por consigna), `murales.html` ("Otros murales": corcho con las ganadoras, voto cruzado), `admin.html` (murales/consignas, QR, cierre, moderación, reinicio), `resultados.html` (podio al cerrar), `pantalla.html` (proyector, solo admin).
  - Las fotos ya salen comprimidas de `camera.js`: recorte cuadrado de hasta 1280 px, JPEG 0.7 (~50–200 KB).
  - Tira estilo cabina de fotos (`static/js/strip.js`): se arma en un canvas en el navegador (foto ganadora de cada consigna + la consigna debajo; pie con logo, mural y fecha) y se exporta como JPG. En "Otros murales" cada mural tiene "Descargar tira"; en admin, "Descargar todas las fotos" arma un ZIP (JSZip) con una carpeta por mural (todas sus fotos + su tira) como respaldo antes de reiniciar, usando `GET /api/admin/photos`. Supabase Storage responde `Access-Control-Allow-Origin: *`, por eso el canvas puede exportar.

## Estado actual (lo último hecho)
- Plan por etapas acordado con el usuario:
  1. **Hecho**: renombre mesa→mural (`Board`), item→consigna (`Prompt`), módulo `photo_wedding`→`instacam`, rutas `/photo-wedding`→`/api`, bucket `wedding-photos`→`photos`; desempate; compresión (ya existía).
  2. **Hecho**: admin sólido. `app/core/supabase.py` usa la `SECRET_KEY` (service role) para borrar archivos del bucket `photos`. Se borran después del commit y sin romper si Storage falla (`_remove_files` en el service solo loguea). Borrar foto (la persona que la subió o el admin), consigna o mural también borra los archivos. El reinicio vacía el bucket entero, leyendo `storage.objects`, así también limpia huérfanos. Moderación: `PUT`/`DELETE /api/boards/{id}` y `/api/prompts/{id}`. Borrar un mural borra sus fotos y votos, los votos hacia él y sus jugadores, que vuelven a elegir mural. El admin tiene una sección "Fotos" para borrar cualquier foto.
  3. **Hecho**: período con fecha de cierre y podio. La tabla `game_settings` tiene una sola fila (id 1) con `ends_at` (timestamptz, null significa sin cierre). `GET /api/game` devuelve `{ends_at, closed, now}`: `now` es la hora del servidor, para que la cuenta regresiva no dependa del reloj del celular. `PUT /api/admin/game` exige hora con zona. Con el juego cerrado, `_ensure_open` hace que fotos, borrar foto propia y votos devuelvan 409; el admin puede seguir moderando. `renderNav()` devuelve el estado del juego y muestra el banner (cuenta regresiva o "terminó"). `reloadIfGameClosed()` (en api.js) maneja el 409. `resultados.html` muestra el podio: los empatados comparten puesto, y entran los puestos 1–3 con al menos un voto. `corkboard.js` tiene el corcho y el botón de tira que comparten "Otros murales" y "Resultados". El reinicio borra el cierre.
  4. **Hecho**: extras, todo en el frontend (sin cambios de backend ni de base):
     - **Refresco automático** (no Supabase Realtime: las tablas no tienen RLS y todo pasa por el backend). En `api.js`, `autoRefresh(load, segundos)` refresca solo con la pestaña visible y enseguida al volver a ella, y `hasChanged(key, data)` evita redibujar si los datos no cambiaron. Mi mural cada 10 s (no refresca mientras sube una foto), Otros murales cada 15 s, la pantalla cada 5 s.
     - **QR por mural**: el admin tiene un botón "QR" por mural (lo muestra en el lightbox; usa qrcode-generator de cdnjs) e "Imprimir todos los QR" (abre una hoja imprimible). El QR apunta a `registro.html?mural=ID`. `registro-page.js` guarda el ID en localStorage antes de pedir sesión, porque el login vuelve sin el parámetro, y lo usa para preseleccionar el mural. Si la persona ya tenía mural, la manda directo a `mi-mural.html`.
     - **Pantalla grande** (`pantalla.html`, solo admin, porque muestra todas las fotos y no solo las ganadoras): banner de cierre, murales ordenados por ranking con medallas y corcho, y "Últimas fotos" (las 6 más nuevas, que entran con animación). Botón de pantalla completa. Se abre desde el admin.

## Preferencia del usuario (importante)
El asistente hace los cambios directamente en los archivos (antes se pasaba el código en el chat para copiar y pegar; el usuario lo cambió).
