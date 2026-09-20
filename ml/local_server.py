"""
Локальный LLM-сервер на базе llama-cpp-python.
Загружает GGUF-модель и отдаёт OpenAI-совместимый API.

Запуск:
    python ml/local_server.py

После запуска API доступен на http://localhost:8080/v1
"""

import json
import sys
from pathlib import Path

# ============================================================
# НАСТРОЙКИ (измени под свою модель)
# ============================================================

# Путь к GGUF-модели
MODEL_PATH = r"C:\Users\Пользователь\.lmstudio\models\ai-sage\GigaChat3.1-10B-A1.8B-GGUF\GigaChat3.1-10B-A1.8B-q4_K_M.gguf"

# Параметры сервера
HOST = "127.0.0.1"
PORT = 8080
N_CTX = 4096       # Размер контекста (зависит от модели)
N_GPU_LAYERS = -1  # -1 = все слои на GPU (если есть), 0 = только CPU


def check_dependencies():
    """Проверяет и устанавливает зависимости."""
    try:
        from llama_cpp import Llama
        print("llama-cpp-python уже установлен")
        return True
    except ImportError:
        print("Устанавливаю llama-cpp-python...")
        import subprocess
        subprocess.check_call([
            sys.executable, "-m", "pip", "install",
            "llama-cpp-python[server]",
            "--quiet"
        ])
        return True


def create_server():
    """Создаёт OpenAI-совместимый сервер."""
    from llama_cpp import Llama
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse, StreamingResponse
    import uvicorn

    print(f"Загружаю модель: {MODEL_PATH}")
    print(f"Контекст: {N_CTX} токенов")

    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=N_CTX,
        n_gpu_layers=N_GPU_LAYERS,
        verbose=False,
    )

    app = FastAPI(title="Local LLM Server")

    @app.get("/v1/models")
    def list_models():
        return {
            "data": [{
                "id": "local-model",
                "object": "model",
                "owned_by": "local",
            }]
        }

    @app.get("/health")
    def health():
        return {"status": "ok", "model": MODEL_PATH}

    @app.post("/v1/chat/completions")
    async def chat_completions(request: Request):
        body = await request.json()
        messages = body.get("messages", [])
        temperature = body.get("temperature", 0.7)
        max_tokens = body.get("max_tokens", 2048)

        # Конвертируем messages в prompt
        prompt = ""
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "system":
                prompt += f"[INST] <<SYS>>\n{content}\n<</SYS>>\n\n"
            elif role == "user":
                prompt += f"{content} [/INST] "
            elif role == "assistant":
                prompt += f"{content} </s><s>[INST] "

        # Генерация
        output = llm(
            prompt,
            max_tokens=max_tokens,
            temperature=temperature,
            stop=["</s>"],
        )

        text = output["choices"][0]["text"]

        return {
            "id": "chatcmpl-local",
            "object": "chat.completion",
            "choices": [{
                "index": 0,
                "message": {"role": "assistant", "content": text},
                "finish_reason": "stop",
            }],
            "usage": {
                "prompt_tokens": output.get("usage", {}).get("prompt_tokens", 0),
                "completion_tokens": output.get("usage", {}).get("completion_tokens", 0),
                "total_tokens": output.get("usage", {}).get("total_tokens", 0),
            },
        }

    return app


if __name__ == "__main__":
    import uvicorn

    check_dependencies()

    if not Path(MODEL_PATH).exists():
        print(f"ОШИБКА: Модель не найдена: {MODEL_PATH}")
        print("Измените MODEL_PATH в начале файла")
        sys.exit(1)

    app = create_server()
    print(f"\nСервер запущен: http://{HOST}:{PORT}/v1")
    print("Используйте --api-url http://localhost:8080/v1 в scenario_generator.py\n")
    uvicorn.run(app, host=HOST, port=PORT)
