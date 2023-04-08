# Whisper
This service is used to operate bot's whisper command by performing ML inferencing on a high performance (or GPU dedicated) system.

## Repository
https://github.com/openai/whisper

## Broken pytorch
In some instances, mytorch will install a corrupted version; thus, not utilizing the GPU for inferencing. Use this to fix it:
```sh
pip uninstall torch
pip cache purge
pip install torch -f https://download.pytorch.org/whl/torch_stable.html
```