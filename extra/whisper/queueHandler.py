import pika
import os
import ssl
import threading
import time
import inference


sendQName = "WhisperRes"
receiveQName = "WhisperReq_Pro" if inference.isPremiumProcessing else "WhisperReq"

def strtobool (val):
    val = val.lower()
    if val in ('y', 'yes', 't', 'true', 'on', '1'):
        return True
    elif val in ('n', 'no', 'f', 'false', 'off', '0'):
        return False
    else:
        raise ValueError("invalid truth value %r" % (val,))


pikaCred = pika.PlainCredentials(os.environ.get('AMQP_USER', 'guest'), os.environ.get('AMQP_PASS', 'guest'))
sslContext = ssl.create_default_context()
pikaParams = pika.ConnectionParameters(
    host=os.environ.get('AMQP_HOST', 'localhost'),
    port=int(os.environ.get('AMQP_PORT', "5672")),
    virtual_host=os.environ.get("AMQP_VHOST", "/"),
    credentials=pikaCred,
    ssl_options=pika.SSLOptions(sslContext) if strtobool(os.environ.get("AMQP_TLS", "false")) else None,
    heartbeat=60
)

pikaConnDat = {
    "connection": None,
    "mainChannel": None,
}
def init():
    pauseTime = 5
    while True:
        try:
            pikaConnDat['connection'] = pika.BlockingConnection(pikaParams)
            pikaConnDat['mainChannel'] = pikaConnDat['connection'].channel()
            pikaConnDat['mainChannel'].queue_declare(queue=sendQName, durable=True)
            pikaConnDat['mainChannel'].queue_declare(queue=receiveQName, durable=True)
            pikaConnDat['mainChannel'].basic_qos(prefetch_count=1) # Only receive one message at a time
            break
        except pika.exceptions.AuthenticationError:
            print("Authentication error, check your AMQP credentials")
            exit(1)
        except Exception:
            print(f"Failed to connect to RabbitMQ, retrying in {pauseTime} seconds...")
            time.sleep(pauseTime)
            if(pauseTime < 30):
                pauseTime += 5


def sendToQueue(message):
    pikaConnDat['mainChannel'].basic_publish(exchange='', routing_key=sendQName, body=message)
def receiveFromQueue(callback):
    def internal_callback(ch, method, properties, body):
        threading.Thread(target=callback, args=(ch, method, properties, body, pikaConnDat['connection'])).start()
    while True:
        pikaConnDat['mainChannel'].basic_consume(queue=receiveQName, on_message_callback=internal_callback, auto_ack=False) # Acknowledge the message after processing
        try:
            pikaConnDat['mainChannel'].start_consuming()
        except (pika.exceptions.StreamLostError, pika.exceptions.AMQPHeartbeatTimeout):
            print("Network dropped, reconnecting...")
            init()
            print("Reconnected")