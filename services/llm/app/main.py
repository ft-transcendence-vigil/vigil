import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.ollama import warmUp
from app.routes.llm import router as llm_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

#@asynccontextmanager It’s more general: it turns a function into something with a “before” and an “after”, split by yield.
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await warmUp()
        logger.info("ollama warm up ok")
    except Exception:
        logger.exception("ollama warm up failed, continuing anyway")
    yield

#router isnt an endpoint so we need to include the routes here
app = FastAPI(title="Virgil llm service", version="0.1.0", lifespan=lifespan)
app.include_router(llm_router)


#needs more attention!!!
@app.exception_handler(RequestValidationError)
async def validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    first = exc.errors()[0]
    if first["type"] == "json_invalid":
        message = "invalid JSON body"
    else:
        field = ".".join(str(part) for part in first["loc"][1:]) or "request"
        message = f"invalid {field}: {first['msg']}"
    return JSONResponse(status_code=400, content={"message": message})

@app.get("/health")
async def health_checkk()-> dict[str, str]:
    return {"status": "ok"} 