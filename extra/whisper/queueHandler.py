import pika
import os
import ssl
import threading


sendQName = "WhisperRes"
receiveQName = "WhisperReq"

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

pikaParam = {
    "connection": None,
    "sendChannel": None,
    "receiveChannel": None
}
def init():
    pikaParam['connection'] = pika.BlockingConnection(pikaParams)
    sendChannel = pikaParam['connection'].channel()
    sendChannel.queue_declare(queue=sendQName, durable=True)
    receiveChannel = pikaParam['connection'].channel()
    receiveChannel.queue_declare(queue=receiveQName, durable=True)
    receiveChannel.basic_qos(prefetch_count=1) # Only receive one message at a time
init()
def sendToQueue(message):
    pikaParams['sendChannel'].basic_publish(exchange='', routing_key=sendQName, body=message)
def receiveFromQueue(callback):
    def internal_callback(ch, method, properties, body):
        threading.Thread(target=callback, args=(ch,method,properties,body,pikaParam['connection'])).start()
    while True:
        pikaParams['receiveChannel'].basic_consume(queue=receiveQName, on_message_callback=internal_callback, auto_ack=False) # Acknowledge the message after processing
        try:
            pikaParams['receiveChannel'].start_consuming()
        except pika.exceptions.StreamLostError:
            print("Network dropped, reconnecting...")
            init()
            print("Reconnected")