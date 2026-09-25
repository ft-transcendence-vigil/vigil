


from fastapi import APIRouter
import logging
import json
from collections.abc import AsyncIterator 
from fastapi.responses import StreamingResponse
from app.schemas import ChatMessage, ChatRequest, ForwardRequest
from app.prompts import chat_prompt, alert_prompt

from app.ollama import OllamaException, stream_chat 

router = APIRouter()

logger = logging.getLogger(__name__)


async def _fromatter(messages: list[dict[str, str]])-> AsyncIterator:
    try:
        async for token in stream_chat(messages):
            #turn this plain dict {'token': token} to json
            payload: dict = {'token': token}
            #second new line to terminate the single data
            yield f"token: {json.dumps(payload)}\n\n"
    except OllamaException:
        logger.exception("llm stream failed")
    done = {'done' : True}
    yield f"token: {json.dumps(done)}\n\n"

@router.post("/internal/llm/forward")
async def forward(req: ForwardRequest) -> StreamingResponse:
    messages = alert_prompt(req.context, req.triggered_at, req.service)
    return StreamingResponse(_fromatter(messages), media_type="text/event-stream")


@router.post("/internal/llm/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    return StreamingResponse(_fromatter(chat_prompt(req.messages)), media_type="text/event-stream")
