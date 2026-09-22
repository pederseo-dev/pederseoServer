from uuid import UUID

from fastapi import HTTPException

from app.modules.photo_wedding import service
from app.core.admin import is_admin_user
from app.modules.photo_wedding.schema import (
    Item,
    ItemCreate,
    ItemLeaderboardEntry,
    ItemVote,
    ItemVoteCreate,
    Mesa,
    MesaCreate,
    MesaLeaderboardEntry,
    MesaVote,
    MesaVoteCreate,
    Photo,
    PhotoCreate,
    PhotoWithVotes,
    Player,
    PlayerRegister,
)


def is_admin(user_id: UUID) -> bool:
    return is_admin_user(user_id)


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


def create_photo(user_id: UUID, data: PhotoCreate) -> Photo:
    try:
        return service.create_photo(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en una mesa")
        if str(e) == "item_not_found":
            raise HTTPException(status_code=404, detail="El item indicado no existe")
        raise


def list_my_mesa_photos(user_id: UUID) -> list[PhotoWithVotes]:
    try:
        return service.list_my_mesa_photos(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Todavía no te registraste en una mesa")

def delete_photo(user_id: UUID, photo_id: int) -> None:
    try:
        service.delete_photo(user_id, photo_id)
    except ValueError as e:
        if str(e) == "photo_not_found":
            raise HTTPException(status_code=404, detail="La foto no existe")
        if str(e) == "not_owner":
            raise HTTPException(status_code=403, detail="Solo podés borrar tus propias fotos")
        raise


def get_my_item_votes(user_id: UUID) -> list[ItemVote]:
    return list(service.get_my_item_votes(user_id))


def get_my_mesa_vote(user_id: UUID) -> MesaVote | None:
    return service.get_my_mesa_vote(user_id)


def retract_item_vote(user_id: UUID, item_id: int) -> None:
    try:
        service.retract_item_vote(user_id, item_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="No tenés un voto para ese item")


def cast_item_vote(user_id: UUID, data: ItemVoteCreate) -> ItemVote:
    try:
        return service.cast_item_vote(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en una mesa")
        if str(e) == "photo_not_found":
            raise HTTPException(status_code=404, detail="La foto indicada no existe para ese item")
        if str(e) == "photo_not_own_mesa":
            raise HTTPException(status_code=403, detail="Solo podés votar fotos de tu propia mesa")
        raise


def retract_mesa_vote(user_id: UUID) -> None:
    try:
        service.retract_mesa_vote(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="No tenés un voto de mesa")


def cast_mesa_vote(user_id: UUID, data: MesaVoteCreate) -> MesaVote:
    try:
        return service.cast_mesa_vote(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en una mesa")
        if str(e) == "self_vote_not_allowed":
            raise HTTPException(status_code=403, detail="No podés votar por tu propia mesa")
        if str(e) == "mesa_not_found":
            raise HTTPException(status_code=404, detail="La mesa indicada no existe")
        raise


def get_mesa_vidriera(mesa_id: int) -> list[ItemLeaderboardEntry]:
    return service.get_mesa_vidriera(mesa_id)


def get_general_vidriera() -> list[MesaLeaderboardEntry]:
    return service.get_general_vidriera()


def reset_game() -> None:
    service.reset_game()
