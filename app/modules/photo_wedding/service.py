from typing import Sequence
from uuid import UUID

from sqlmodel import Session, select

from app.core.database import engine
from app.modules.photo_wedding.schema import (
    Item,
    ItemCreate,
    Mesa,
    MesaCreate,
    Player,
    PlayerRegister,
)


def list_mesas() -> Sequence[Mesa]:
    with Session(engine) as session:
        return session.exec(select(Mesa)).all()


def create_mesa(data: MesaCreate) -> Mesa:
    with Session(engine) as session:
        mesa = Mesa(name=data.name)
        session.add(mesa)
        session.commit()
        session.refresh(mesa)
        return mesa


def list_items() -> Sequence[Item]:
    with Session(engine) as session:
        return session.exec(select(Item)).all()


def create_item(data: ItemCreate) -> Item:
    with Session(engine) as session:
        item = Item(description=data.description)
        session.add(item)
        session.commit()
        session.refresh(item)
        return item


def get_player(user_id: UUID) -> Player | None:
    with Session(engine) as session:
        return session.get(Player, user_id)


def register_player(user_id: UUID, data: PlayerRegister) -> Player:
    with Session(engine) as session:
        existing = session.get(Player, user_id)
        if existing is not None:
            return existing

        mesa = session.get(Mesa, data.mesa_id)
        if mesa is None:
            raise ValueError("mesa_not_found")

        player = Player(
            user_id=user_id,
            mesa_id=data.mesa_id,
            display_name=data.display_name,
        )
        session.add(player)
        session.commit()
        session.refresh(player)
        return player
