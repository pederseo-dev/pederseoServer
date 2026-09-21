from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.admin import require_admin
from app.core.auth import get_current_user_id
from app.modules.photo_wedding import controller
from app.modules.photo_wedding.schema import (
    Item,
    ItemCreate,
    Mesa,
    MesaCreate,
    Player,
    PlayerRegister,
)

router = APIRouter(prefix="/photo-wedding", tags=["photo-wedding"])


@router.get("/mesas", response_model=list[Mesa])
def list_mesas(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_mesas()


@router.post("/mesas", response_model=Mesa)
def create_mesa(data: MesaCreate, _: UUID = Depends(require_admin)):
    return controller.create_mesa(data)


@router.get("/items", response_model=list[Item])
def list_items(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_items()


@router.post("/items", response_model=Item)
def create_item(data: ItemCreate, _: UUID = Depends(require_admin)):
    return controller.create_item(data)


@router.get("/players/me", response_model=Player)
def get_me(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_me(user_id)


@router.post("/players/me", response_model=Player)
def register_me(data: PlayerRegister, user_id: UUID = Depends(get_current_user_id)):
    return controller.register_me(user_id, data)
