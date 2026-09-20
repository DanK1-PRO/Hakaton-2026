# train.py

import yaml
from pathlib import Path


def load_config(config_path: str = "../config/training_config.yaml"):
    with open(config_path) as f:
        return yaml.safe_load(f)

# Placeholder for training logic; actual implementation uses torch, transformers and peft.
if __name__ == "__main__":
    cfg = load_config()
    print("Loaded config: ", cfg)