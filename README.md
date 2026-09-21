# Pederseo Server

Un servidor FastAPI básico listo para desplegar en Render, gestionado con [uv](https://docs.astral.sh/uv/).

https://pederseoserver.onrender.com

## Desarrollo local

```bash
uv sync
uv run uvicorn app.main:app --reload
```

## Producción

```bash
uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
