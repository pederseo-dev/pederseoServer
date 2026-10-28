from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Board(SQLModel, table=True):
    """Un mural: el equipo al que pertenece cada jugador."""

    __tablename__ = "board"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str


class Prompt(SQLModel, table=True):
    """Una consigna: el tema de una foto."""

    __tablename__ = "prompt"

    id: Optional[int] = Field(default=None, primary_key=True)
    text: str


class Player(SQLModel, table=True):
    __tablename__ = "player"

    user_id: UUID = Field(primary_key=True)
    board_id: int = Field(foreign_key="board.id")
    display_name: str


class Photo(SQLModel, table=True):
    __tablename__ = "photo"

    id: Optional[int] = Field(default=None, primary_key=True)
    prompt_id: int = Field(foreign_key="prompt.id")
    board_id: int = Field(foreign_key="board.id")
    uploaded_by: UUID = Field(foreign_key="player.user_id")
    url: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PromptVote(SQLModel, table=True):
    """Voto interno: qué foto de mi propio mural representa mejor una consigna."""

    __tablename__ = "prompt_vote"

    voter_id: UUID = Field(foreign_key="player.user_id", primary_key=True)
    prompt_id: int = Field(foreign_key="prompt.id", primary_key=True)
    photo_id: int = Field(foreign_key="photo.id")


class BoardVote(SQLModel, table=True):
    """Voto cruzado: un único voto por persona a favor de otro mural."""

    __tablename__ = "board_vote"

    voter_id: UUID = Field(foreign_key="player.user_id", primary_key=True)
    target_board_id: int = Field(foreign_key="board.id")


# --- Schemas de request (no son tablas) ---


class BoardCreate(BaseModel):
    name: str


class PromptCreate(BaseModel):
    text: str


class PlayerRegister(BaseModel):
    board_id: int
    display_name: str


class PhotoCreate(BaseModel):
    prompt_id: int
    url: str


class PromptVoteCreate(BaseModel):
    prompt_id: int
    photo_id: int


class BoardVoteCreate(BaseModel):
    target_board_id: int


# --- Schemas de respuesta (no son tablas) ---


class PromptHighlight(BaseModel):
    """La foto ganadora de una consigna dentro de un mural (None si nadie subió una)."""

    prompt_id: int
    prompt_text: str
    photo: Optional[Photo]
    vote_count: int


class BoardRanking(BaseModel):
    board_id: int
    board_name: str
    vote_count: int


class PhotoWithVotes(BaseModel):
    id: int
    prompt_id: int
    board_id: int
    uploaded_by: UUID
    url: str
    created_at: datetime
    vote_count: int


class PhotoExport(BaseModel):
    id: int
    url: str
    board_id: int
    board_name: str
    prompt_id: int
    prompt_text: str
    created_at: datetime
