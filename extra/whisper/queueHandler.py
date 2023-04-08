import pika
import os
import ssl
import re


sendQName = "WhisperRes"
receiveQName = "WhisperReq"


def strtobool (val):
    """Convert a string representation of truth to true (1) or false (0).
    True values are 'y', 'yes', 't', 'true', 'on', and '1'; false values
    are 'n', 'no', 'f', 'false', 'off', and '0'.  Raises ValueError if
    'val' is anything else.
    """
    val = val.lower()
    if val in ('y', 'yes', 't', 'true', 'on', '1'):
        return 1
    elif val in ('n', 'no', 'f', 'false', 'off', '0'):
        return 0
    else:
        raise ValueError("invalid truth value %r" % (val,))


pikaCred = pika.PlainCredentials(os.environ.get('AMQP_USER', 'guest'), os.environ.get('AMQP_PASS', 'guest'))
sslContext = ssl.create_default_context()
pikaParams = pika.ConnectionParameters(
    host=os.environ.get('AMQP_HOST', 'localhost'),
    port=int(os.environ.get('AMQP_PORT', 5672)),
    virtual_host=os.environ.get("AMQP_VHOST", "/"),
    credentials=pikaCred,
    ssl_options=pika.SSLOptions(sslContext) if strtobool(os.environ.get("AMQP_TLS", "false")) else None,
    heartbeat=60
)




def sendToQueue(message):
    connection = pika.BlockingConnection(pikaParams)
    channel = connection.channel()
    channel.queue_declare(queue=sendQName)
    channel.basic_publish(exchange='', routing_key=sendQName, body=message)
    connection.close()
def receiveFromQueue(callback):
    connection = pika.BlockingConnection(pikaParams)
    channel = connection.channel()
    channel.queue_declare(queue=receiveQName)
    channel.basic_consume(queue=receiveQName, on_message_callback=callback, auto_ack=False) # Acknowledge the message after processing
    channel.start_consuming()
    connection.close()