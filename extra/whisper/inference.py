
import whisper
# tiny, base, small, medium, and large are the available options. For nVidia Tegra X1 chips, use the small model.
model = "small"

model = whisper.load_model(model)
print("Inference running on "+str(model.device))

def convert(fileName: str, lang: str = None):
    #, task="translate"
    return model.transcribe(fileName, task="trascribe", language=lang)