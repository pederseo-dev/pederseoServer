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
- `app/core/auth.py`: dependencia `get_current_user_id` que valida el JWT de Supabase contra `SUPABASE_JWT_SECRET` (HS256, audience "authenticated") y devuelve el UUID del usuario.
- `app/core/admin.py`: dependencia `require_admin`, compara el user_id contra `ADMIN_USER_ID` (env var, hoy vacía — falta que el admin real se loguee y pase su UUID).
- Fotos: se suben directo del navegador a Supabase Storage (bucket `wedding-photos`, público, con policies de SELECT público + INSERT solo autenticado) — el backend nunca recibe el archivo, solo la URL resultante.

## Módulos
- **`status_server`**: `GET /status` — siembra una fila en `server_status` la primera vez y reporta salud de server+DB. Pensado para pings de cronjob.org (keep-alive del free tier de Render).
- **`photo_wedding`**: la app real. Es un juego de fotos para una boda:
  - 80 invitados repartidos en **mesas**. Hay una lista fija de **items** (consignas/temas, ej. 5).
  - **Fase 1 (interna)**: cualquiera de tu mesa saca fotos para cualquier item. Los de tu propia mesa votan (`ItemVote`, se puede votar la propia foto) cuál representa mejor cada item — la vidriera de la mesa muestra en vivo la foto con más votos internos por item.
  - **Fase 2 (cruzada)**: cada persona tiene un solo voto total (`MesaVote`, no auto-voto) a favor de la vidriera de OTRA mesa. Gana la mesa con más votos.
  - Sin estados de "cerrado/finalizado": todo se recalcula en vivo, los votos son reemplazables (no hay historial, un voto por voter_id en cada tabla).
  - Modelo: `Mesa`, `Item`, `Player` (conecta user_id de Supabase con su mesa+nombre elegidos), `Photo`, `ItemVote`, `MesaVote`.
  - `/` (raíz del dominio) sirve el `index.html` estático de este módulo (`app/modules/photo_wedding/static/`), montado con `StaticFiles`. Hoy es un placeholder simple.

## Estado actual (lo último hecho)
- Rutas listas: `GET/POST /photo-wedding/mesas`, `GET/POST /photo-wedding/items` (creación admin-only), `GET/POST /photo-wedding/players/me` (registro de jugador).
- Falta: endpoint de creación de `Photo` (recibe la URL ya subida a Storage, valida item/mesa/que coincida con la mesa del jugador), endpoints de voto (`ItemVote`, `MesaVote`), UI real del frontend (hoy solo hay un placeholder), panel de admin (CRUD de mesas/items desde UI, hoy solo existen las rutas), compresión de imagen client-side antes de subir a Storage (se habló, no implementado).

## Preferencia del usuario (importante)
El usuario pidió explícitamente que, de acá en adelante, el código se le pase en el chat en bloques para que él lo copie y pegue — no editar sus archivos directamente con las herramientas. Las excepciones razonables: archivos de documentación/contexto como este, y comandos que corren herramientas (alembic, tests, etc.) que no son código de la app.
