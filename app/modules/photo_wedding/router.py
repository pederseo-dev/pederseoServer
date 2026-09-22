from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.core.admin import require_admin
from app.core.auth import get_current_user_id
from app.modules.photo_wedding import controller
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


@router.post("/photos", response_model=Photo)
def create_photo(data: PhotoCreate, user_id: UUID = Depends(get_current_user_id)):
    return controller.create_photo(user_id, data)


@router.get("/photos/mine", response_model=list[PhotoWithVotes])
def list_my_mesa_photos(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_my_mesa_photos(user_id)

@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, user_id: UUID = Depends(get_current_user_id)):
    controller.delete_photo(user_id, photo_id)
    return Response(status_code=204)


@router.get("/item-votes/mine", response_model=list[ItemVote])
def get_my_item_votes(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_my_item_votes(user_id)


@router.get("/mesa-votes/mine", response_model=MesaVote | None)
def get_my_mesa_vote(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_my_mesa_vote(user_id)


@router.delete("/item-votes/{item_id}")
def retract_item_vote(item_id: int, user_id: UUID = Depends(get_current_user_id)):
    controller.retract_item_vote(user_id, item_id)
    return Response(status_code=204)


@router.post("/item-votes", response_model=ItemVote)
def cast_item_vote(data: ItemVoteCreate, user_id: UUID = Depends(get_current_user_id)):
    return controller.cast_item_vote(user_id, data)


@router.delete("/mesa-votes")
def retract_mesa_vote(user_id: UUID = Depends(get_current_user_id)):
    controller.retract_mesa_vote(user_id)
    return Response(status_code=204)


@router.post("/mesa-votes", response_model=MesaVote)
def cast_mesa_vote(data: MesaVoteCreate, user_id: UUID = Depends(get_current_user_id)):
    return controller.cast_mesa_vote(user_id, data)


@router.get("/vidriera/mesa/{mesa_id}", response_model=list[ItemLeaderboardEntry])
def get_mesa_vidriera(mesa_id: int, user_id: UUID = Depends(get_current_user_id)):
    return controller.get_mesa_vidriera(mesa_id)


@router.get("/vidriera/mesas", response_model=dict[int, list[ItemLeaderboardEntry]])
def get_all_mesas_vidriera(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_all_mesas_vidriera()


@router.get("/vidriera/general", response_model=list[MesaLeaderboardEntry])
def get_general_vidriera(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_general_vidriera()

@router.get("/is-admin")
def is_admin(user_id: UUID = Depends(get_current_user_id)):
    return {"is_admin": controller.is_admin(user_id)}


@router.delete("/admin/reset")
def reset_game(_: UUID = Depends(require_admin)):
    controller.reset_game()
    return Response(status_code=204)
