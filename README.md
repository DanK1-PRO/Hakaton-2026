# HHT – Human‑to‑Text Generation Pipeline

## Project Purpose

The **HHT** (Human‑to‑Text) repository contains the full machine‑learning pipeline that turns raw interview transcripts into a fine‑tuned language model and exposes inference functions for downstream services.  It is built to:

1. **Clean** and pre‑process raw JSONL transcripts.
2. **Fine‑tune** a base causal LLM (currently GPT‑Neo‑2.7B) using LoRA adapters so that the core weights stay frozen while only lightweight matrices are updated.
3. **Save** checkpoints that can be loaded by an inference service.
4. **Provide utilities** (`generate.py`, `evaluate.py`) to generate scenarios and evaluate model quality.

## Directory Layout
```
hht/
├── data/                # raw / processed data
│   ├── raw/              # un‑modified transcripts (JSONL)
│   └── processed/         # cleaned parquet files used for training
├── models/
│   ├── base_model/          # pre‑trained checkpoint from HF
│   ├── lora_adapters/       # LoRA weights after each epoch
│   └── difficulty_classifier/  # small MLP that predicts scenario difficulty
├── src/
│   ├── preprocessing.py    # data cleaning utilities
│   ├── train.py             # training harness (uses torch & peft)
│   ├── generate.py         # inference wrapper used by LocalAPI
│   └── classifier.py       # difficulty prediction model
├── prompts/
│   └── templates.py        # prompt templates for generation
├── config/
│   └── training_config.yaml  # hyper‑parameters & LoRA settings
└── requirements.txt
```

## Installation
```bash
cd hht
pip install -r requirements.txt
```

## Quick Start
1. **Prepare data** – place raw JSONL files into `data/raw/`.
2. Run preprocessing:
   ```python
   python src/preprocessing.py
   ```
3. Edit `config/training_config.yaml` with your hyper‑parameters.
4. Train the model:
   ```bash
   python train.py
   ```
5. The LoRA checkpoints will be saved to `models/lora_adapters/`.
6. To generate scenarios (used by LocalAPI):
   ```python
   from src.generate import generate_scenario
   text = generate_scenario("sample input")
   print(text)
   ```

## Troubleshooting
- **Engine protocol error** – Ensure `generate.py` returns a dict with keys matching the PEG‑native schema (`{"text": "…", "metadata": {…}}`).  The FastAPI engine expects this format.
- **GPU not detected** – Verify `torch.cuda.is_available()` prints `True`.  If not, install proper CUDA drivers and ensure `pip install torch --index-url https://download.pytorch.org/whl/cu118` (replace cu118 with your version).

## Contribution
Feel free to open issues or PRs.  Please keep the data pipeline deterministic (no random seeds unless explicitly set) and document any new prompt templates in `prompts/templates.py`.
