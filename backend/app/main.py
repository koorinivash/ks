import logging
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.middleware.gzip import GZipMiddleware

from app.config import get_settings
from app.database.mongodb import close_mongo_connection, connect_to_mongo, get_database
from pymongo.errors import PyMongoError
from app.routes import dashboard, monthly_records, people, reports

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ks_finance")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    try:
        yield
    finally:
        await close_mongo_connection()


app = FastAPI(
    title="KS API",
    description="Backend API for KS - a simple monthly finance management app.",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(GZipMiddleware, minimum_size=1000, compresslevel=5)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Server-Timing"],
)


@app.middleware("http")
async def request_timing(request: Request, call_next):
    started = perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["Server-Timing"] = f"app;dur={(perf_counter() - started) * 1000:.1f}"
        return response
    finally:
        route = request.scope.get("route")
        # Route templates exclude IDs, search strings, bodies and credentials.
        logger.info("%s %s %s - %.1fms", request.method,
                    getattr(route, "path", "unmatched"), status,
                    (perf_counter() - started) * 1000)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Validation error. Please check your input."})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled request error (%s)", type(exc).__name__)
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


@app.get("/health/db")
async def database_health():
    try:
        await get_database().command("ping")
    except PyMongoError:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return {"status": "ok"}
