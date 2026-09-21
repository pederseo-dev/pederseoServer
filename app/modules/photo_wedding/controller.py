from uuid import UUID

from fastapi import HTTPException

from app.modules.photo_wedding import service
from app.modules.photo_wedding.schema import (
    Item,
    ItemCreate,
    Mesa,
    MesaCreate,
    Player,
    PlayerRegister,
)


def list_mesas() -> list[Mesa]:
    return list(service.list_mesas())


def create_mesa(data: MesaCreate) -> Mesa:
    return service.create_mesa(data)


def list_items() -> list[Item]:
    return list(service.list_items())


def create_item(data: ItemCreate) -> Item:
    return service.create_item(data)


def get_me(user_id: UUID) -> Player:
    player = service.get_player(user_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Todavía no te registraste")
    return player


def register_me(user_id: UUID, data: PlayerRegister) -> Player:
    try:
        return service.register_player(user_id, data)
    except ValueError:
        raise HTTPException(status_code=404, detail="La mesa indicada no existe")
