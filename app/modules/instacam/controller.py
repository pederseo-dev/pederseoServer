from uuid import UUID

from fastapi import HTTPException

from app.modules.instacam import service
from app.core.admin import is_admin_user
from app.modules.instacam.schema import (
    Board,
    BoardCreate,
    BoardRanking,
    BoardVote,
    BoardVoteCreate,
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


def is_admin(user_id: UUID) -> bool:
    return is_admin_user(user_id)


def list_boards() -> list[Board]:
    return list(service.list_boards())


def create_board(data: BoardCreate) -> Board:
    return service.create_board(data)


def rename_board(board_id: int, data: BoardCreate) -> Board:
    try:
        return service.rename_board(board_id, data)
    except ValueError:
        raise HTTPException(status_code=404, detail="El mural indicado no existe")


def delete_board(board_id: int) -> None:
    try:
        service.delete_board(board_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="El mural indicado no existe")


def list_prompts() -> list[Prompt]:
    return list(service.list_prompts())


def create_prompt(data: PromptCreate) -> Prompt:
    return service.create_prompt(data)


def update_prompt(prompt_id: int, data: PromptCreate) -> Prompt:
    try:
        return service.update_prompt(prompt_id, data)
    except ValueError:
        raise HTTPException(status_code=404, detail="La consigna indicada no existe")


def delete_prompt(prompt_id: int) -> None:
    try:
        service.delete_prompt(prompt_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="La consigna indicada no existe")


def get_me(user_id: UUID) -> Player:
    player = service.get_player(user_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Todavía no te registraste")
    return player


def register_me(user_id: UUID, data: PlayerRegister) -> Player:
    try:
        return service.register_player(user_id, data)
    except ValueError:
        raise HTTPException(status_code=404, detail="El mural indicado no existe")


def create_photo(user_id: UUID, data: PhotoCreate) -> Photo:
    try:
        return service.create_photo(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en un mural")
        if str(e) == "prompt_not_found":
            raise HTTPException(status_code=404, detail="La consigna indicada no existe")
        raise


def list_my_board_photos(user_id: UUID) -> list[PhotoWithVotes]:
    try:
        return service.list_my_board_photos(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Todavía no te registraste en un mural")


def delete_photo(user_id: UUID, photo_id: int) -> None:
    try:
        service.delete_photo(user_id, photo_id, is_admin_user(user_id))
    except ValueError as e:
        if str(e) == "photo_not_found":
            raise HTTPException(status_code=404, detail="La foto no existe")
        if str(e) == "not_owner":
            raise HTTPException(status_code=403, detail="Solo podés borrar tus propias fotos")
        raise


def get_my_prompt_votes(user_id: UUID) -> list[PromptVote]:
    return list(service.get_my_prompt_votes(user_id))


def get_my_board_vote(user_id: UUID) -> BoardVote | None:
    return service.get_my_board_vote(user_id)


def retract_prompt_vote(user_id: UUID, prompt_id: int) -> None:
    try:
        service.retract_prompt_vote(user_id, prompt_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="No tenés un voto para esa consigna")


def cast_prompt_vote(user_id: UUID, data: PromptVoteCreate) -> PromptVote:
    try:
        return service.cast_prompt_vote(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en un mural")
        if str(e) == "photo_not_found":
            raise HTTPException(status_code=404, detail="La foto indicada no existe para esa consigna")
        if str(e) == "photo_not_own_board":
            raise HTTPException(status_code=403, detail="Solo podés votar fotos de tu propio mural")
        raise


def retract_board_vote(user_id: UUID) -> None:
    try:
        service.retract_board_vote(user_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="No tenés un voto de mural")


def cast_board_vote(user_id: UUID, data: BoardVoteCreate) -> BoardVote:
    try:
        return service.cast_board_vote(user_id, data)
    except ValueError as e:
        if str(e) == "player_not_registered":
            raise HTTPException(status_code=404, detail="Todavía no te registraste en un mural")
        if str(e) == "self_vote_not_allowed":
            raise HTTPException(status_code=403, detail="No podés votar por tu propio mural")
        if str(e) == "board_not_found":
            raise HTTPException(status_code=404, detail="El mural indicado no existe")
        raise


def get_board_highlights(board_id: int) -> list[PromptHighlight]:
    try:
        return service.get_board_highlights(board_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="El mural indicado no existe")


def get_all_highlights() -> dict[int, list[PromptHighlight]]:
    return service.get_all_highlights()


def get_board_ranking() -> list[BoardRanking]:
    return service.get_board_ranking()


def list_all_photos() -> list[PhotoExport]:
    return service.list_all_photos()


def reset_game() -> None:
    service.reset_game()
