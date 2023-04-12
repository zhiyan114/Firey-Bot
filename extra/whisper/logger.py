import logging
LOG_FORMAT = ('%(levelname) -10s %(asctime)s %(name) -30s %(funcName) '
              '-35s %(lineno) -5d: %(message)s')
LOGGER = logging.getLogger(__name__)

# Keep it disable when not debugging
#logging.basicConfig(level=logging.DEBUG, format=LOG_FORMAT, filename="whisper.log")