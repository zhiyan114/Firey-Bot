import functools
import sys
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
# cost: number
# result: string
# processTime: number
# } |
# {
# success: False
# userID: string
# interactID: string
# cost: number
# reason: string
# }

def cbAck(ch, delivery_tag, data):
    if ch.is_open:
        queueHandler.sendToQueue(data)
        ch.basic_ack(delivery_tag)

def callback(ch, method, properties, body, conn):
    data = json.loads(body.decode("utf-8"))
    print(data["interactID"]+": Processing for user "+data["userID"]+"...", flush=True)
    # Download the audio file and start processing it
    fileName = SaveFileToDisk(data["mediaLink"])
    if fileName is None:
        print(data["interactID"]+": Failed to download file", flush=True)
        return conn.add_callback_threadsafe(functools.partial(cbAck, method.delivery_tag, json.dumps({
            "success": False,
            "userID": data["userID"],
            "interactID": data["interactID"],
            "cost": data["cost"],
            "reason": "Failed to download file"
        })))
    print(data["interactID"]+": File downloaded", flush=True)
    # Process the file
    start = time.time()
    result = inference.convert(fileName, data["language"])
    end = time.time()
    os.remove(fileName)
    print(data["interactID"]+": Processed in "+str(end-start)+" seconds", flush=True)
    # Send the result back and Acknowledge the message
    conn.add_callback_threadsafe(functools.partial(cbAck, method.delivery_tag, json.dumps({
        "success": True,
        "userID": data["userID"],
        "interactID": data["interactID"],
        "cost": data["cost"],
        "result": result['text'],
        "processTime": end-start
    })))




if __name__ == '__main__':
    try:
        print("Starting OpenAI Whisper ML Server...")
        queueHandler.receiveFromQueue(callback)
    except KeyboardInterrupt:
        print("Shutting down OpenAI Whisper ML Server...")
        try:
            sys.exit(0)
        except SystemExit:
            os._exit(0)
