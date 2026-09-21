from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.modules.photo_wedding.router import router as photo_wedding_router
from app.modules.status_server.router import router as status_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(photo_wedding_router)
app.include_router(status_router)

PHOTO_WEDDING_STATIC_DIR = Path(__file__).parent / "modules" / "photo_wedding" / "static"
app.mount("/", StaticFiles(directory=PHOTO_WEDDING_STATIC_DIR, html=True), name="photo_wedding_static")
