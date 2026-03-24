FROM rocker/r-ver:4.4.1

# Install system dependencies for ADMIXTOOLS2 + Node.js + Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgsl-dev \
    libopenblas-dev \
    liblapack-dev \
    libxml2-dev \
    libssl-dev \
    libcurl4-openssl-dev \
    libgit2-dev \
    curl \
    ca-certificates \
    cmake \
    make \
    g++ \
    autoconf \
    automake \
    libtool \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install AWS Lambda RIC
RUN npm install -g aws-lambda-ric

# Install R dependencies then ADMIXTOOLS2
RUN R -e "install.packages('remotes', repos='https://cloud.r-project.org/')"
RUN R -e "install.packages(c('Rcpp', 'RcppArmadillo', 'igraph', 'dplyr', 'tidyr', 'magrittr', 'rlang', 'tibble', 'purrr'), repos='https://cloud.r-project.org/', Ncpus=4)"
RUN R -e "remotes::install_github('uqrmaie1/admixtools@2f6957a36224c15884abf84c543aefddf46352f0')"

# Verify ADMIXTOOLS2 installed
RUN R -e "library(admixtools); cat('ADMIXTOOLS2 loaded successfully\n')"

# Copy PLINK binary
COPY plink /opt/bin/plink
RUN chmod +x /opt/bin/plink

# Set up bootstrap loader (real handler is fetched from S3 at runtime)
WORKDIR /var/task
COPY bootstrap.mjs ./
RUN npm init -y && npm install @aws-sdk/client-s3 @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

ENV NODE_PATH=/var/task/node_modules

# Run as non-root for defense-in-depth
RUN useradd -r -s /bin/false appuser \
    && chown -R appuser:appuser /var/task /tmp
USER appuser

ENTRYPOINT ["npx", "aws-lambda-ric"]
CMD ["bootstrap.handler"]
