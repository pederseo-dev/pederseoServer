from uuid import UUID

from fastapi import APIRouter, Depends, Response

from app.core.admin import require_admin
from app.core.auth import get_current_user_id
from app.modules.instacam import controller
from app.modules.instacam.schema import (
    Board,
    BoardCreate,
    BoardRanking,
    BoardVote,
    BoardVoteCreate,
    GameState,
    GameUpdate,
    Photo,
    PhotoCreate,
    PhotoExport,
    PhotoWithVotes,
    Player,
    PlayerRegister,
    Prompt,
    PromptCreate,
    PromptHighlight,
    PromptVote,
    PromptVoteCreate,
)

router = APIRouter(prefix="/api", tags=["instacam"])


@router.get("/boards", response_model=list[Board])
def list_boards(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_boards()


@router.post("/boards", response_model=Board)
def create_board(data: BoardCreate, _: UUID = Depends(require_admin)):
    return controller.create_board(data)


@router.put("/boards/{board_id}", response_model=Board)
def rename_board(board_id: int, data: BoardCreate, _: UUID = Depends(require_admin)):
    return controller.rename_board(board_id, data)


@router.delete("/boards/{board_id}")
def delete_board(board_id: int, _: UUID = Depends(require_admin)):
    controller.delete_board(board_id)
    return Response(status_code=204)


@router.get("/boards/highlights", response_model=dict[int, list[PromptHighlight]])
def get_all_highlights(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_all_highlights()


@router.get("/boards/ranking", response_model=list[BoardRanking])
def get_board_ranking(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_board_ranking()


@router.get("/boards/{board_id}/highlights", response_model=list[PromptHighlight])
def get_board_highlights(board_id: int, user_id: UUID = Depends(get_current_user_id)):
    return controller.get_board_highlights(board_id)


@router.get("/prompts", response_model=list[Prompt])
def list_prompts(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_prompts()


@router.post("/prompts", response_model=Prompt)
def create_prompt(data: PromptCreate, _: UUID = Depends(require_admin)):
    return controller.create_prompt(data)


@router.put("/prompts/{prompt_id}", response_model=Prompt)
def update_prompt(prompt_id: int, data: PromptCreate, _: UUID = Depends(require_admin)):
    return controller.update_prompt(prompt_id, data)


@router.delete("/prompts/{prompt_id}")
def delete_prompt(prompt_id: int, _: UUID = Depends(require_admin)):
    controller.delete_prompt(prompt_id)
    return Response(status_code=204)


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
def list_my_board_photos(user_id: UUID = Depends(get_current_user_id)):
    return controller.list_my_board_photos(user_id)


@router.delete("/photos/{photo_id}")
def delete_photo(photo_id: int, user_id: UUID = Depends(get_current_user_id)):
    controller.delete_photo(user_id, photo_id)
    return Response(status_code=204)


@router.get("/prompt-votes/mine", response_model=list[PromptVote])
def get_my_prompt_votes(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_my_prompt_votes(user_id)


@router.post("/prompt-votes", response_model=PromptVote)
def cast_prompt_vote(data: PromptVoteCreate, user_id: UUID = Depends(get_current_user_id)):
    return controller.cast_prompt_vote(user_id, data)


@router.delete("/prompt-votes/{prompt_id}")
def retract_prompt_vote(prompt_id: int, user_id: UUID = Depends(get_current_user_id)):
    controller.retract_prompt_vote(user_id, prompt_id)
    return Response(status_code=204)


@router.get("/board-votes/mine", response_model=BoardVote | None)
def get_my_board_vote(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_my_board_vote(user_id)


@router.post("/board-votes", response_model=BoardVote)
def cast_board_vote(data: BoardVoteCreate, user_id: UUID = Depends(get_current_user_id)):
    return controller.cast_board_vote(user_id, data)


@router.delete("/board-votes")
def retract_board_vote(user_id: UUID = Depends(get_current_user_id)):
    controller.retract_board_vote(user_id)
    return Response(status_code=204)


@router.get("/is-admin")
def is_admin(user_id: UUID = Depends(get_current_user_id)):
    return {"is_admin": controller.is_admin(user_id)}


@router.get("/game", response_model=GameState)
def get_game(user_id: UUID = Depends(get_current_user_id)):
    return controller.get_game()


@router.put("/admin/game", response_model=GameState)
def update_game(data: GameUpdate, _: UUID = Depends(require_admin)):
    return controller.update_game(data)


@router.get("/admin/photos", response_model=list[PhotoExport])
def list_all_photos(_: UUID = Depends(require_admin)):
    return controller.list_all_photos()


@router.delete("/admin/reset")
def reset_game(_: UUID = Depends(require_admin)):
    controller.reset_game()
    return Response(status_code=204)
