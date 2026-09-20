# preprocessing.py

import os, re
from pathlib import Path

def load_and_clean_raw(raw_path: str, output_dir: str):
    """
    Load raw transcripts from `raw_path`, perform basic cleaning (remove empty lines,
    normalize whitespace, etc.), and write cleaned files to `output_dir`.

    Parameters
    ----------
    raw_path : str
        Path to the directory with raw transcript files.
    output_dir : str
        Destination for cleaned files.  If not exists, it will be created.

    """
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    for fname in Path(raw_path).glob("*.txt"):
        with open(fname) as f:
            lines = [re.sub(r"\s+", " ", l.strip())
                      for l in f if l.strip()]
        out_file = Path(output_dir)/fname.name
        out_file.write_text("\n".join(lines))