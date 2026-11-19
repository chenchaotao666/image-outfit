ARG BASE_IMAGE_PREFIX=docker.io/library/
FROM ${BASE_IMAGE_PREFIX}node:22-bookworm-slim AS node
FROM ${BASE_IMAGE_PREFIX}python:3.12-slim-bookworm

WORKDIR /app
COPY --from=node /usr/local/bin/node /usr/local/bin/node
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 libstdc++6 \
    && rm -rf /var/lib/apt/lists/*
COPY models/vision/requirements-cutout.txt models/vision/
RUN python -m pip install --no-cache-dir -r models/vision/requirements-cutout.txt
COPY scripts/setup-cutout.py scripts/
COPY models/vision/ models/vision/
RUN python scripts/setup-cutout.py && python -c "import numpy, onnxruntime, PIL"

COPY config/ config/
COPY miniprogram/packages/analysis/utils/ miniprogram/packages/analysis/utils/
COPY miniprogram/shared/ miniprogram/shared/
COPY server/ server/
RUN node -e "require('node:sqlite'); require('./server/api'); require('./server/config').config()"
ENV PYTHONDONTWRITEBYTECODE=1
CMD ["node", "server/index.js"]
