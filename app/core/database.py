import os

from dotenv import load_dotenv
from sqlmodel import Session, create_engine

load_dotenv()


def _normalize_url(url: str) -> str:
    # Supabase/Postgres give "postgresql://", which SQLAlchemy defaults to
    # the psycopg2 dialect. We install psycopg 3, so force that dialect.
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


_raw_url = os.environ.get("DATABASE_URL")
if not _raw_url:
    raise RuntimeError("DATABASE_URL environment variable is not set")

DATABASE_URL = _normalize_url(_raw_url)

engine = create_engine(DATABASE_URL, echo=False)


def get_session():
    with Session(engine) as session:
        yield session
