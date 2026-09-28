"""Start an already installed local GGUF server, without runtime downloads."""

import argparse
import os
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", default=os.getenv("DDS_MODEL_PATH"))
    parser.add_argument("--server", default=os.getenv("DDS_LLAMA_SERVER"), help="Path to llama-server executable")
    parser.add_argument("--port", type=int, default=8091)
    parser.add_argument("--context", type=int, default=4096)
    parser.add_argument("--gpu-layers", type=int, default=-1)
    args = parser.parse_args()
    if not args.model or not Path(args.model).is_file():
        parser.error("Set --model / DDS_MODEL_PATH to a local assembled GGUF file")
    if args.server:
        if not Path(args.server).is_file():
            parser.error("llama-server executable not found")
        command = [
            args.server,
            "--model",
            args.model,
            "--host",
            "127.0.0.1",
            "--port",
            str(args.port),
            "--ctx-size",
            str(args.context),
            "--n-gpu-layers",
            str(args.gpu_layers),
            "--alias",
            "local-model",
            "--parallel",
            "1",
        ]
    else:
        try:
            __import__("llama_cpp.server")
        except ImportError:
            parser.error("Install llama-cpp-python[server] in .venv-ml during preparation, or pass --server")
        command = [
            sys.executable,
            "-m",
            "llama_cpp.server",
            "--model",
            args.model,
            "--host",
            "127.0.0.1",
            "--port",
            str(args.port),
            "--n_ctx",
            str(args.context),
            "--n_gpu_layers",
            str(args.gpu_layers),
            "--model_alias",
            "local-model",
        ]
    # The model's own chat template is selected by the runtime.
    raise SystemExit(subprocess.call(command))


if __name__ == "__main__":
    main()
