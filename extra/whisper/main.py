import inference
import queueHandler
import json
import requests
import os
import uuid
import time
import shutil
import sentry_sdk

sentryData = os.environ.get("SENTRY_DSN", None)
if(sentryData is not None):
    sentry_sdk.init(
    dsn=sentryData,
    traces_sample_rate=0
    )

def SaveFileToDisk(url: str) -> str:
    # Get the file name
    fileName = url.split("/")[-1]

    # Create a temp directory
    tempDir = os.path.join(os.getcwd(), "temp")
    if not os.path.exists(tempDir):
        os.mkdir(tempDir)

    # Create a temp file
    tempFile = os.path.join(tempDir, str(uuid.uuid4()) + fileName)

    # Download the file
    r = requests.get(url, stream=True)
    if r.status_code == 200:
        with open(tempFile, 'wb') as f:
            r.raw.decode_content = True
            shutil.copyfileobj(r.raw, f)

        return tempFile
    else:
        return None

# Callback body documentation:
# Receive Request
# {
# userID: string
# interactID: string
# cost: number
# mediaLink: string
# language: string
# }
# Send Response
# {
# success: True
# userID: string
# interactID: string
# result: string
# processTime: number
# } |
# {
# success: False
# userID: string
# interactID: string
# refund: number
# reason: string
# }

def callback(ch, method, properties, body):
    data = json.loads(body.decode("utf-8"))
    print(data["interactID"]+": Processing for user "+data["userID"]+" with interactID...")
    # Download the audio file and start processing it
    fileName = SaveFileToDisk(data["mediaLink"])
    if fileName is None:
        print(data["interactID"]+": Failed to download file")
        return queueHandler.sendToQueue(json.dumps({
            "success": False,
            "userID": data["userID"],
            "interactID": data["interactID"],
            "refund": data["cost"],
            "reason": "Failed to download file"
        }))
    print(data["interactID"]+": File downloaded")
    # Process the file
    start = time.time()
    result = inference.convert(fileName, data["language"])
    end = time.time()
    os.remove(fileName)
    print(data["interactID"]+": Processed in "+str(end-start)+" seconds")
    # Send the result back
    queueHandler.sendToQueue(json.dumps({
        "success": True,
        "userID": data["userID"],
        "interactID": data["interactID"],
        "result": result['text'],
        "processTime": end-start
    }))
    print(data["interactID"]+": File deleted")
    # Acknowledge the message
    ch.basic_ack(delivery_tag = method.delivery_tag)




if __name__ == '__main__':
    print("Starting OpenAI Whisper ML Server...")
    queueHandler.receiveFromQueue(callback)