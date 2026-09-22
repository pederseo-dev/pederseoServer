from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from pydantic import BaseModel
from sqlmodel import Field, SQLModel


class Mesa(SQLModel, table=True):
    __tablename__ = "mesa"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str


class Item(SQLModel, table=True):
    __tablename__ = "item"

    id: Optional[int] = Field(default=None, primary_key=True)
    description: str


class Player(SQLModel, table=True):
    __tablename__ = "player"

    user_id: UUID = Field(primary_key=True)
    mesa_id: int = Field(foreign_key="mesa.id")
    display_name: str


class Photo(SQLModel, table=True):
    __tablename__ = "photo"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(foreign_key="item.id")
    mesa_id: int = Field(foreign_key="mesa.id")
    uploaded_by: UUID = Field(foreign_key="player.user_id")
    url: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ItemVote(SQLModel, table=True):
    """Voto interno: qué foto de mi propia mesa representa mejor un item."""

    __tablename__ = "item_vote"

    voter_id: UUID = Field(foreign_key="player.user_id", primary_key=True)
    item_id: int = Field(foreign_key="item.id", primary_key=True)
    photo_id: int = Field(foreign_key="photo.id")


class MesaVote(SQLModel, table=True):
    """Voto cruzado: un único voto por persona a favor de la vidriera de otra mesa."""

    __tablename__ = "mesa_vote"

    voter_id: UUID = Field(foreign_key="player.user_id", primary_key=True)
    target_mesa_id: int = Field(foreign_key="mesa.id")


# --- Schemas de request (no son tablas) ---


class MesaCreate(BaseModel):
    name: str


class ItemCreate(BaseModel):
    description: str


class PlayerRegister(BaseModel):
    mesa_id: int
    display_name: str


class PhotoCreate(BaseModel):
    item_id: int
    url: str


class ItemVoteCreate(BaseModel):
    item_id: int
    photo_id: int


class MesaVoteCreate(BaseModel):
    target_mesa_id: int


# --- Schemas de respuesta (no son tablas) ---


class ItemLeaderboardEntry(BaseModel):
    item_id: int
    item_description: str
    photo: Optional[Photo]
    vote_count: int


class MesaLeaderboardEntry(BaseModel):
    mesa_id: int
    mesa_name: str
    vote_count: int


class PhotoWithVotes(BaseModel):
    id: int
    item_id: int
    mesa_id: int
    uploaded_by: UUID
    url: str
    created_at: datetime
    vote_count: int
