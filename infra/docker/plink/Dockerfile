FROM public.ecr.aws/docker/library/python:3.11-slim

# Install build tools for Lambda RIC + Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    cmake \
    make \
    g++ \
    autoconf \
    automake \
    libtool \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install AWS Lambda RIC
RUN npm install -g aws-lambda-ric

# Copy PLINK binary
COPY plink /opt/bin/plink
RUN chmod +x /opt/bin/plink

# Copy conversion scripts
COPY scripts/ /opt/scripts/

# Set up Lambda handler
WORKDIR /var/task
COPY handler.mjs ./
RUN npm init -y && npm install @aws-sdk/client-s3

ENTRYPOINT ["npx", "aws-lambda-ric"]
CMD ["handler.handler"]
