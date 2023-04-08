



import inference
import queueHandler
import json
import requests
import os
import uuid
import time
import shutil

sampleFile = "C:\\Users\\zhiyan114\\Desktop\\whisperSample\\untitled.mp3"
sampleLongFile = "C:\\Users\\zhiyan114\\Desktop\\whisperSample\\Long.mp3"
sampleCnFile = "C:\\Users\\zhiyan114\\Desktop\\whisperSample\\cn.mp3"

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
    data = json.loads(inference.convert(body.decode("utf-8")))
    print(data["interactID"]+": Processing for user "+data["userID"]+" with interactID "+"...")
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
    print(data["interactID"]+": Processed in "+str(end-start)+" seconds")
    # Send the result back
    queueHandler.sendToQueue(json.dumps({
        "success": True,
        "userID": data["userID"],
        "interactID": data["interactID"],
        "result": result.text,
        "processTime": end-start
    }))
    # Delete the file
    os.remove(fileName)
    print(data["interactID"]+": File deleted")
    # Acknowledge the message
    ch.basic_ack(delivery_tag = method.delivery_tag)




if __name__ == '__main__':
    print("Starting OpenAI Whisper ML Server...")
    queueHandler.receiveFromQueue(callback)