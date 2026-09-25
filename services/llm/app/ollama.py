import json
import httpx
from app.config import settings
from collections.abc import AsyncIterator


class OllamaException(Exception):
    pass

def _Options() -> dict:
    return {
        "model": settings.ollama_model,
        "num_ctx": settings.ollama_num_ctx,
        "num_predict": settings.ollama_num_predict,
        "temperature": settings.ollama_temperature,
    }
# AsyncIterator: this produces strings, one at a time, asynchronously."
async def stream_chat(messages: list[dict[str]]) -> AsyncIterator[str]:
    payload = {
        "model": settings.ollama_model,
        "messages": messages,
        #we need to stream each chunk of messages in stead of waiting for the whole message to be complete
        "stream": True,
        "options": _Options(),
    }
# 1. open a TCP connection to the server        <- connect
# 2. send your request body                     <- write
# 3. wait for response data to arrive           <- read
# 4. (before all that) wait for a free slot     <- pool
# we sit each config a timout for the http request
    timeout = httpx.Timeout(

        connect = 5.0,
        read= settings.llm_timeout_seconds,
        write= 10.0,
        pool= 5.0,

    )
#     you call client.stream(...)
#   ↓  request sent
#   ↓  server thinks
#   ↓  HTTP/1.1 200 OK              <- headers arrive
#   ↓  Content-Type: application/x-ndjson
#   ↓
# `response` object now exists, `async with` block body starts running
#   ↓
#   body still streaming in, one line at a time, over the next 13 seconds
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            async with client.stream(
                "POST",
                f"{settings.ollama_host}/api/chat",
                json=payload,

            ) as response:
                if response.status_code != 200:
                    #aread async version of read. we wait for body because it comes in chunks
                    body = await response.aread()
                    raise OllamaException(
                        f"Ollama returned{response.status_code}: "
                        #we slice the first 200 chars of the body to avoid too much datain the error message.
                        #errors='replace' we replace bad data with � so we wont fail on bad data 
                        #HTTP bodies are raw bytes, not text. To read them you must decode them,
                        f"{body.decode(errors='replace')[:200]}"
                    )
                #aiter_lines is an async iterator that yields each line of the response body as it arrives, without waiting for the entire body to be received.
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                        #if json is not valid we skip to next line
                    except json.JSONDecodeError:
                        continue
                    if chunk.get("error"):
                        raise OllamaException(chunk["error"])
                    #the {} and "" are just fallbacks if we dont find messages and content
                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield token
                    if chunk.get("done"):
                        return
    except httpx.TimeoutException as exc:
        raise OllamaException(
            f"ollama timed out after {settings.llm_timeout_seconds}s"
        ) from exc
    except httpx.RequestError as exc:
        raise OllamaException(f"cannot reach ollama at {settings.ollama_host}") from exc
    
async def warmUp() -> None:

    payload={
    "model": settings.ollama_model,
    "messages": [{"role": "user", "content": "hi"}],
    "stream": False,
    #force model to stop at one token
    "options": {"num_predict": 1},
    }
    async with  httpx.AsyncClient(timeout=httpx.Timeout(120.0)) as client:
        response = await client.post(
                f"{settings.ollama_host}/api/chat",
                json=payload,
            )
    response.raise_for_status()



        




