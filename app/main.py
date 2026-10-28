from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.modules.instacam.router import router as instacam_router
from app.modules.status_server.router import router as status_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(instacam_router)
app.include_router(status_router)

INSTACAM_STATIC_DIR = Path(__file__).parent / "modules" / "instacam" / "static"
app.mount("/", StaticFiles(directory=INSTACAM_STATIC_DIR, html=True), name="instacam_static")
