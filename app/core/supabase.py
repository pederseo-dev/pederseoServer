import os

from dotenv import load_dotenv
from sqlalchemy import text
from supabase import Client, create_client

from app.core.database import engine

load_dotenv()

PHOTOS_BUCKET = "photos"

# Supabase limita cuántos archivos se pueden borrar en una sola llamada
_REMOVE_BATCH = 1000

_client: Client | None = None


def _get_client() -> Client:
    # Con la secret key (service role): puede borrar archivos aunque no haya policy de DELETE
    global _client
    if _client is None:
        _client = create_client(os.environ["SUPABASE_URL"], os.environ["SECRET_KEY"])
    return _client


def path_from_public_url(url: str) -> str | None:
    marker = f"/storage/v1/object/public/{PHOTOS_BUCKET}/"
    _, found, path = url.partition(marker)
    return path if found and path else None


def list_all_photo_paths() -> list[str]:
    # Todos los archivos del bucket, también los que no quedaron en ninguna fila (ej. subidas a medias)
    with engine.connect() as conn:
        rows = conn.execute(
            text("select name from storage.objects where bucket_id = :bucket"),
            {"bucket": PHOTOS_BUCKET},
        )
        return list(rows.scalars())


def remove_photos(paths: list[str]) -> None:
    bucket = _get_client().storage.from_(PHOTOS_BUCKET)
    for i in range(0, len(paths), _REMOVE_BATCH):
        bucket.remove(paths[i : i + _REMOVE_BATCH])
