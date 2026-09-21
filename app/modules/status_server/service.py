from datetime import datetime, timezone

from sqlmodel import Session, select

from app.core.database import engine
from app.modules.status_server.schema import ServerStatus, StatusResponse

SEED_MESSAGE = "base de datos y servidor corriendo correctamente"


def check_status() -> StatusResponse:
    try:
        with Session(engine) as session:
            row = session.exec(select(ServerStatus)).first()
            if row is None:
                row = ServerStatus(message=SEED_MESSAGE)
                session.add(row)
                session.commit()
                session.refresh(row)
        database_status = "ok"
        message = row.message
    except Exception:
        database_status = "error"
        message = "no se pudo conectar a la base de datos"

    return StatusResponse(
        status="ok" if database_status == "ok" else "degraded",
        database=database_status,
        message=message,
        timestamp=datetime.now(timezone.utc),
    )
