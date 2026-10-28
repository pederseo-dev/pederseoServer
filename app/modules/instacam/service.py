import logging
from datetime import datetime, timezone
from typing import Sequence
from uuid import UUID

from sqlalchemy import func, or_
from sqlmodel import Session, delete, select

from app.core import supabase
from app.core.database import engine
from app.modules.instacam.schema import (
    Board,
    BoardCreate,
    BoardRanking,
    BoardVote,
    BoardVoteCreate,
    GameSettings,
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

logger = logging.getLogger(__name__)

GAME_SETTINGS_ID = 1


def _ends_at(session: Session) -> datetime | None:
    settings = session.get(GameSettings, GAME_SETTINGS_ID)
    if settings is None or settings.ends_at is None:
        return None
    # Postgres devuelve la hora con zona; por las dudas, una hora sin zona se toma como UTC
    if settings.ends_at.tzinfo is None:
        return settings.ends_at.replace(tzinfo=timezone.utc)
    return settings.ends_at


def _is_closed(ends_at: datetime | None) -> bool:
    return ends_at is not None and datetime.now(timezone.utc) >= ends_at


def _ensure_open(session: Session) -> None:
    if _is_closed(_ends_at(session)):
        raise ValueError("game_closed")


def get_game() -> GameState:
    with Session(engine) as session:
        ends_at = _ends_at(session)
        return GameState(ends_at=ends_at, closed=_is_closed(ends_at), now=datetime.now(timezone.utc))


def update_game(data: GameUpdate) -> GameState:
    with Session(engine) as session:
        settings = session.get(GameSettings, GAME_SETTINGS_ID) or GameSettings(id=GAME_SETTINGS_ID)
        settings.ends_at = data.ends_at
        session.add(settings)
        session.commit()
    return get_game()


def _remove_files(paths: list[str]) -> None:
    # Se llama después del commit: si Storage falla, la base ya quedó bien y los archivos
    # huérfanos se limpian en el próximo reinicio (que vacía el bucket entero)
    if not paths:
        return
    try:
        supabase.remove_photos(paths)
    except Exception:
        logger.exception("No se pudieron borrar %d archivos del bucket", len(paths))


def _delete_photos(session: Session, photos: Sequence[Photo]) -> list[str]:
    """Borra las fotos y sus votos (sin commit). Devuelve los archivos a borrar del bucket."""
    photo_ids = [photo.id for photo in photos]
    paths = [path for photo in photos if (path := supabase.path_from_public_url(photo.url))]
    if photo_ids:
        session.exec(delete(PromptVote).where(PromptVote.photo_id.in_(photo_ids)))
        session.exec(delete(Photo).where(Photo.id.in_(photo_ids)))
    return paths


def list_boards() -> Sequence[Board]:
    with Session(engine) as session:
        return session.exec(select(Board).order_by(Board.id)).all()


def create_board(data: BoardCreate) -> Board:
    with Session(engine) as session:
        board = Board(name=data.name)
        session.add(board)
        session.commit()
        session.refresh(board)
        return board


def rename_board(board_id: int, data: BoardCreate) -> Board:
    with Session(engine) as session:
        board = session.get(Board, board_id)
        if board is None:
            raise ValueError("board_not_found")

        board.name = data.name
        session.add(board)
        session.commit()
        session.refresh(board)
        return board


def delete_board(board_id: int) -> None:
    """Borra el mural con sus fotos y votos. Sus jugadores vuelven a elegir mural."""
    with Session(engine) as session:
        board = session.get(Board, board_id)
        if board is None:
            raise ValueError("board_not_found")

        photos = session.exec(select(Photo).where(Photo.board_id == board_id)).all()
        paths = _delete_photos(session, photos)

        player_ids = session.exec(select(Player.user_id).where(Player.board_id == board_id)).all()
        session.exec(
            delete(BoardVote).where(
                or_(BoardVote.target_board_id == board_id, BoardVote.voter_id.in_(player_ids))
            )
        )
        session.exec(delete(PromptVote).where(PromptVote.voter_id.in_(player_ids)))
        session.exec(delete(Player).where(Player.board_id == board_id))
        session.delete(board)
        session.commit()

    _remove_files(paths)


def list_prompts() -> Sequence[Prompt]:
    with Session(engine) as session:
        return session.exec(select(Prompt).order_by(Prompt.id)).all()


def create_prompt(data: PromptCreate) -> Prompt:
    with Session(engine) as session:
        prompt = Prompt(text=data.text)
        session.add(prompt)
        session.commit()
        session.refresh(prompt)
        return prompt


def update_prompt(prompt_id: int, data: PromptCreate) -> Prompt:
    with Session(engine) as session:
        prompt = session.get(Prompt, prompt_id)
        if prompt is None:
            raise ValueError("prompt_not_found")

        prompt.text = data.text
        session.add(prompt)
        session.commit()
        session.refresh(prompt)
        return prompt


def delete_prompt(prompt_id: int) -> None:
    """Borra la consigna con todas sus fotos y votos."""
    with Session(engine) as session:
        prompt = session.get(Prompt, prompt_id)
        if prompt is None:
            raise ValueError("prompt_not_found")

        photos = session.exec(select(Photo).where(Photo.prompt_id == prompt_id)).all()
        paths = _delete_photos(session, photos)
        session.exec(delete(PromptVote).where(PromptVote.prompt_id == prompt_id))
        session.delete(prompt)
        session.commit()

    _remove_files(paths)


def get_player(user_id: UUID) -> Player | None:
    with Session(engine) as session:
        return session.get(Player, user_id)


def register_player(user_id: UUID, data: PlayerRegister) -> Player:
    with Session(engine) as session:
        existing = session.get(Player, user_id)
        if existing is not None:
            return existing

        board = session.get(Board, data.board_id)
        if board is None:
            raise ValueError("board_not_found")

        player = Player(
            user_id=user_id,
            board_id=data.board_id,
            display_name=data.display_name,
        )
        session.add(player)
        session.commit()
        session.refresh(player)
        return player


def create_photo(user_id: UUID, data: PhotoCreate) -> Photo:
    with Session(engine) as session:
        _ensure_open(session)
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        prompt = session.get(Prompt, data.prompt_id)
        if prompt is None:
            raise ValueError("prompt_not_found")

        photo = Photo(
            prompt_id=data.prompt_id,
            board_id=player.board_id,
            uploaded_by=user_id,
            url=data.url,
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
        return photo


def list_my_board_photos(user_id: UUID) -> list[PhotoWithVotes]:
    with Session(engine) as session:
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        # Con votos iguales va primero la foto más vieja (mismo desempate que el mural)
        statement = (
            select(Photo, func.count(PromptVote.voter_id).label("votes"))
            .outerjoin(PromptVote, PromptVote.photo_id == Photo.id)
            .where(Photo.board_id == player.board_id)
            .group_by(Photo.id)
            .order_by(func.count(PromptVote.voter_id).desc(), Photo.created_at, Photo.id)
        )
        rows = session.exec(statement).all()
        return [
            PhotoWithVotes(
                id=photo.id,
                prompt_id=photo.prompt_id,
                board_id=photo.board_id,
                uploaded_by=photo.uploaded_by,
                url=photo.url,
                created_at=photo.created_at,
                vote_count=votes,
            )
            for photo, votes in rows
        ]


def delete_photo(user_id: UUID, photo_id: int, is_admin: bool) -> None:
    with Session(engine) as session:
        photo = session.get(Photo, photo_id)
        if photo is None:
            raise ValueError("photo_not_found")

        if photo.uploaded_by != user_id and not is_admin:
            raise ValueError("not_owner")

        # El admin puede moderar aunque el juego haya cerrado
        if not is_admin:
            _ensure_open(session)

        paths = _delete_photos(session, [photo])
        session.commit()

    _remove_files(paths)


def get_my_prompt_votes(user_id: UUID) -> Sequence[PromptVote]:
    with Session(engine) as session:
        return session.exec(select(PromptVote).where(PromptVote.voter_id == user_id)).all()


def get_my_board_vote(user_id: UUID) -> BoardVote | None:
    with Session(engine) as session:
        return session.get(BoardVote, user_id)


def retract_prompt_vote(user_id: UUID, prompt_id: int) -> None:
    with Session(engine) as session:
        _ensure_open(session)
        vote = session.get(PromptVote, (user_id, prompt_id))
        if vote is None:
            raise ValueError("vote_not_found")

        session.delete(vote)
        session.commit()


def cast_prompt_vote(user_id: UUID, data: PromptVoteCreate) -> PromptVote:
    with Session(engine) as session:
        _ensure_open(session)
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        photo = session.get(Photo, data.photo_id)
        if photo is None or photo.prompt_id != data.prompt_id:
            raise ValueError("photo_not_found")

        if photo.board_id != player.board_id:
            raise ValueError("photo_not_own_board")

        vote = session.get(PromptVote, (user_id, data.prompt_id))
        if vote is None:
            vote = PromptVote(voter_id=user_id, prompt_id=data.prompt_id, photo_id=data.photo_id)
        else:
            vote.photo_id = data.photo_id

        session.add(vote)
        session.commit()
        session.refresh(vote)
        return vote


def retract_board_vote(user_id: UUID) -> None:
    with Session(engine) as session:
        _ensure_open(session)
        vote = session.get(BoardVote, user_id)
        if vote is None:
            raise ValueError("vote_not_found")

        session.delete(vote)
        session.commit()


def cast_board_vote(user_id: UUID, data: BoardVoteCreate) -> BoardVote:
    with Session(engine) as session:
        _ensure_open(session)
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        if data.target_board_id == player.board_id:
            raise ValueError("self_vote_not_allowed")

        target_board = session.get(Board, data.target_board_id)
        if target_board is None:
            raise ValueError("board_not_found")

        vote = session.get(BoardVote, user_id)
        if vote is None:
            vote = BoardVote(voter_id=user_id, target_board_id=data.target_board_id)
        else:
            vote.target_board_id = data.target_board_id

        session.add(vote)
        session.commit()
        session.refresh(vote)
        return vote


def _highlights(session: Session, boards: Sequence[Board]) -> dict[int, list[PromptHighlight]]:
    prompts = session.exec(select(Prompt).order_by(Prompt.id)).all()

    # Ordenadas de la más vieja a la más nueva: con votos iguales gana la primera que se subió
    statement = (
        select(Photo, func.count(PromptVote.voter_id).label("votes"))
        .outerjoin(PromptVote, PromptVote.photo_id == Photo.id)
        .where(Photo.board_id.in_([board.id for board in boards]))
        .group_by(Photo.id)
        .order_by(Photo.created_at, Photo.id)
    )
    rows = session.exec(statement).all()

    best_photo: dict[tuple[int, int], tuple[Photo, int]] = {}
    for photo, votes in rows:
        key = (photo.board_id, photo.prompt_id)
        current = best_photo.get(key)
        if current is None or votes > current[1]:
            best_photo[key] = (photo, votes)

    result: dict[int, list[PromptHighlight]] = {}
    for board in boards:
        entries = []
        for prompt in prompts:
            photo, votes = best_photo.get((board.id, prompt.id), (None, 0))
            entries.append(
                PromptHighlight(
                    prompt_id=prompt.id,
                    prompt_text=prompt.text,
                    photo=photo,
                    vote_count=votes,
                )
            )
        result[board.id] = entries
    return result


def get_board_highlights(board_id: int) -> list[PromptHighlight]:
    with Session(engine) as session:
        board = session.get(Board, board_id)
        if board is None:
            raise ValueError("board_not_found")
        return _highlights(session, [board])[board.id]


def get_all_highlights() -> dict[int, list[PromptHighlight]]:
    with Session(engine) as session:
        boards = session.exec(select(Board).order_by(Board.id)).all()
        return _highlights(session, boards)


def get_board_ranking() -> list[BoardRanking]:
    with Session(engine) as session:
        statement = (
            select(Board, func.count(BoardVote.voter_id).label("votes"))
            .outerjoin(BoardVote, BoardVote.target_board_id == Board.id)
            .group_by(Board.id)
            .order_by(func.count(BoardVote.voter_id).desc(), Board.id)
        )
        rows = session.exec(statement).all()
        return [
            BoardRanking(board_id=board.id, board_name=board.name, vote_count=votes)
            for board, votes in rows
        ]


def list_all_photos() -> list[PhotoExport]:
    with Session(engine) as session:
        statement = (
            select(Photo, Board.name, Prompt.text)
            .join(Board, Board.id == Photo.board_id)
            .join(Prompt, Prompt.id == Photo.prompt_id)
            .order_by(Board.id, Prompt.id, Photo.created_at)
        )
        rows = session.exec(statement).all()
        return [
            PhotoExport(
                id=photo.id,
                url=photo.url,
                board_id=photo.board_id,
                board_name=board_name,
                prompt_id=photo.prompt_id,
                prompt_text=prompt_text,
                created_at=photo.created_at,
            )
            for photo, board_name, prompt_text in rows
        ]


def reset_game() -> None:
    with Session(engine) as session:
        session.exec(delete(PromptVote))
        session.exec(delete(BoardVote))
        session.exec(delete(Photo))
        session.exec(delete(Player))
        session.exec(delete(Prompt))
        session.exec(delete(Board))
        session.exec(delete(GameSettings))
        session.commit()

    _remove_files(supabase.list_all_photo_paths())
