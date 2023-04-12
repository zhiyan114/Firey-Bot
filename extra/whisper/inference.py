import os
import whisper
# tiny, base, small, medium, and large are the available options. For nVidia Tegra X1 chips, use the small model.

isPremiumProcessing = os.environ.get("isPremium", "false").lower() == "true"
model = "large-v2" if isPremiumProcessing else "base"

model = whisper.load_model(model)
print("Inference running on "+str(model.device))

def convert(fileName: str, lang: str = None):
    #, task="translate" & "transcribe"
    return model.transcribe(fileName, language=lang)