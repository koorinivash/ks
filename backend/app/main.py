import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database.mongodb import close_mongo_connection, connect_to_mongo
from app.routes import dashboard, monthly_records, people, reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ks_finance")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    yield
    await close_mongo_connection()


app = FastAPI(
    title="KS API",
    description="Backend API for KS - a simple monthly finance management app.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Validation error. Please check your input."})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error while processing %s %s", request.method, request.url)
    return JSONResponse(status_code=500, content={"detail": "An unexpected error occurred. Please try again."})


app.include_router(people.router)
app.include_router(monthly_records.router)
app.include_router(dashboard.router)
app.include_router(reports.router)


@app.get("/")
async def root():
    return {"service": "KS API", "status": "running", "docs": "/docs"}


@app.get("/health")
async def health():
    return {"status": "ok", "service": "KS API"}
