from fastapi import HTTPException

from app.modules.status_server.schema import StatusResponse
from app.modules.status_server.service import check_status


def get_status() -> StatusResponse:
    result = check_status()
    if result.database != "ok":
        raise HTTPException(status_code=503, detail=result.model_dump(mode="json"))
    return result
