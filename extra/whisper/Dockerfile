FROM python:3.9.18-slim-bookworm

# Setup the environment?
WORKDIR /source/
ENV ISDOCKER=true

RUN apt-get update
RUN apt-get install make g++ git ffmpeg -y

# Install python packages

RUN pip install pika openai-whisper