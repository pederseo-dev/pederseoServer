from fastapi import APIRouter

from app.modules.status_server.controller import get_status
from app.modules.status_server.schema import StatusResponse

router = APIRouter(prefix="/status", tags=["status"])


@router.get("", response_model=StatusResponse)
def status():
    return get_status()
