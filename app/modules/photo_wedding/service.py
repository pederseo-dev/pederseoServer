from typing import Sequence
from uuid import UUID

from sqlalchemy import func
from sqlmodel import Session, delete, select

from app.core.database import engine
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


def create_photo(user_id: UUID, data: PhotoCreate) -> Photo:
    with Session(engine) as session:
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        item = session.get(Item, data.item_id)
        if item is None:
            raise ValueError("item_not_found")

        photo = Photo(
            item_id=data.item_id,
            mesa_id=player.mesa_id,
            uploaded_by=user_id,
            url=data.url,
        )
        session.add(photo)
        session.commit()
        session.refresh(photo)
        return photo


def list_my_mesa_photos(user_id: UUID) -> list[PhotoWithVotes]:
    with Session(engine) as session:
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        statement = (
            select(Photo, func.count(ItemVote.voter_id).label("votes"))
            .outerjoin(ItemVote, ItemVote.photo_id == Photo.id)
            .where(Photo.mesa_id == player.mesa_id)
            .group_by(Photo.id)
            .order_by(func.count(ItemVote.voter_id).desc(), Photo.id.asc())
        )
        rows = session.exec(statement).all()
        return [
            PhotoWithVotes(
                id=photo.id,
                item_id=photo.item_id,
                mesa_id=photo.mesa_id,
                uploaded_by=photo.uploaded_by,
                url=photo.url,
                created_at=photo.created_at,
                vote_count=votes,
            )
            for photo, votes in rows
        ]


def delete_photo(user_id: UUID, photo_id: int) -> None:
    with Session(engine) as session:
        photo = session.get(Photo, photo_id)
        if photo is None:
            raise ValueError("photo_not_found")

        if photo.uploaded_by != user_id:
            raise ValueError("not_owner")

        session.exec(delete(ItemVote).where(ItemVote.photo_id == photo_id))
        session.delete(photo)
        session.commit()


def get_my_item_votes(user_id: UUID) -> Sequence[ItemVote]:
    with Session(engine) as session:
        return session.exec(select(ItemVote).where(ItemVote.voter_id == user_id)).all()


def get_my_mesa_vote(user_id: UUID) -> MesaVote | None:
    with Session(engine) as session:
        return session.get(MesaVote, user_id)


def retract_item_vote(user_id: UUID, item_id: int) -> None:
    with Session(engine) as session:
        vote = session.get(ItemVote, (user_id, item_id))
        if vote is None:
            raise ValueError("vote_not_found")

        session.delete(vote)
        session.commit()


def cast_item_vote(user_id: UUID, data: ItemVoteCreate) -> ItemVote:
    with Session(engine) as session:
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        photo = session.get(Photo, data.photo_id)
        if photo is None or photo.item_id != data.item_id:
            raise ValueError("photo_not_found")

        if photo.mesa_id != player.mesa_id:
            raise ValueError("photo_not_own_mesa")

        vote = session.get(ItemVote, (user_id, data.item_id))
        if vote is None:
            vote = ItemVote(voter_id=user_id, item_id=data.item_id, photo_id=data.photo_id)
        else:
            vote.photo_id = data.photo_id

        session.add(vote)
        session.commit()
        session.refresh(vote)
        return vote


def retract_mesa_vote(user_id: UUID) -> None:
    with Session(engine) as session:
        vote = session.get(MesaVote, user_id)
        if vote is None:
            raise ValueError("vote_not_found")

        session.delete(vote)
        session.commit()


def cast_mesa_vote(user_id: UUID, data: MesaVoteCreate) -> MesaVote:
    with Session(engine) as session:
        player = session.get(Player, user_id)
        if player is None:
            raise ValueError("player_not_registered")

        if data.target_mesa_id == player.mesa_id:
            raise ValueError("self_vote_not_allowed")

        target_mesa = session.get(Mesa, data.target_mesa_id)
        if target_mesa is None:
            raise ValueError("mesa_not_found")

        vote = session.get(MesaVote, user_id)
        if vote is None:
            vote = MesaVote(voter_id=user_id, target_mesa_id=data.target_mesa_id)
        else:
            vote.target_mesa_id = data.target_mesa_id

        session.add(vote)
        session.commit()
        session.refresh(vote)
        return vote


def get_mesa_vidriera(mesa_id: int) -> list[ItemLeaderboardEntry]:
    with Session(engine) as session:
        items = session.exec(select(Item)).all()

        results: list[ItemLeaderboardEntry] = []
        for item in items:
            statement = (
                select(Photo, func.count(ItemVote.voter_id).label("votes"))
                .join(ItemVote, ItemVote.photo_id == Photo.id)
                .where(Photo.mesa_id == mesa_id, Photo.item_id == item.id)
                .group_by(Photo.id)
                .order_by(func.count(ItemVote.voter_id).desc())
            )
            top = session.exec(statement).first()

            if top is None:
                results.append(
                    ItemLeaderboardEntry(
                        item_id=item.id,
                        item_description=item.description,
                        photo=None,
                        vote_count=0,
                    )
                )
            else:
                photo, votes = top
                results.append(
                    ItemLeaderboardEntry(
                        item_id=item.id,
                        item_description=item.description,
                        photo=photo,
                        vote_count=votes,
                    )
                )

        return results


def get_general_vidriera() -> list[MesaLeaderboardEntry]:
    with Session(engine) as session:
        statement = (
            select(Mesa, func.count(MesaVote.voter_id).label("votes"))
            .join(MesaVote, MesaVote.target_mesa_id == Mesa.id, isouter=True)
            .group_by(Mesa.id)
            .order_by(func.count(MesaVote.voter_id).desc())
        )
        rows = session.exec(statement).all()
        return [
            MesaLeaderboardEntry(mesa_id=mesa.id, mesa_name=mesa.name, vote_count=votes or 0)
            for mesa, votes in rows
        ]


def get_all_mesas_vidriera() -> dict[int, list[ItemLeaderboardEntry]]:
    with Session(engine) as session:
        mesas = session.exec(select(Mesa)).all()
        items = session.exec(select(Item)).all()

        statement = (
            select(Photo, func.count(ItemVote.voter_id).label("votes"))
            .outerjoin(ItemVote, ItemVote.photo_id == Photo.id)
            .group_by(Photo.id)
        )
        rows = session.exec(statement).all()

        best_photo: dict[tuple[int, int], tuple[Photo, int]] = {}
        for photo, votes in rows:
            key = (photo.mesa_id, photo.item_id)
            current = best_photo.get(key)
            if current is None or votes > current[1]:
                best_photo[key] = (photo, votes)

        result: dict[int, list[ItemLeaderboardEntry]] = {}
        for mesa in mesas:
            entries = []
            for item in items:
                found = best_photo.get((mesa.id, item.id))
                if found is None:
                    entries.append(
                        ItemLeaderboardEntry(
                            item_id=item.id,
                            item_description=item.description,
                            photo=None,
                            vote_count=0,
                        )
                    )
                else:
                    photo, votes = found
                    entries.append(
                        ItemLeaderboardEntry(
                            item_id=item.id,
                            item_description=item.description,
                            photo=photo,
                            vote_count=votes,
                        )
                    )
            result[mesa.id] = entries

        return result


def reset_game() -> None:
    with Session(engine) as session:
        session.exec(delete(ItemVote))
        session.exec(delete(MesaVote))
        session.exec(delete(Photo))
        session.exec(delete(Player))
        session.exec(delete(Item))
        session.exec(delete(Mesa))
        session.commit()
