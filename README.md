# Pederseo Server

Un servidor FastAPI básico listo para desplegar en Render, gestionado con [uv](https://docs.astral.sh/uv/).

https://pederseoserver.onrender.com

## Desarrollo local

```bash
uv sync
uv run uvicorn main:app --reload --app-dir app
```

## Producción

```bash
uv run uvicorn main:app --app-dir app --host 0.0.0.0 --port $PORT
```
