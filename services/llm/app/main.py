import logging

from fastapi import FastAPI
from app.ollama import warmUp
from app.routes.llm import router as llm_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Virgil llm service", version="0.1.0")
#router isnt an endpoint so we need to include the routes here
app.include_router(llm_router)

@app.on_event("startup")
async def startup_event():
    try:
        await warmUp()
        logger.info("ollama warm up ok")
    except Exception:
        logger.exception("ollama warm up failed, continuing anyway")





@app.get("/health")
async def health_checkk()-> dict[str, str]:
    return {"status": "ok"} 