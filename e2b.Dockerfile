FROM ubuntu:22.04

# Install system dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    git \
    python3 \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
RUN npm install -g yarn pnpm

# Set up Python environment
RUN python3 -m pip install --upgrade pip

# Install desktop environment components
RUN apt-get update && apt-get install -y \
    xfce4 \
    xfce4-goodies \
    tightvncserver \
    && rm -rf /var/lib/apt/lists/*

# Create a user
RUN useradd -m -s /bin/bash developer
USER developer
WORKDIR /home/developer

# Copy package files for dependency installation
COPY --chown=developer:developer e2b-template/package.json ./
COPY --chown=developer:developer e2b-template/pnpm-lock.yaml* ./

# Install Node.js dependencies
RUN pnpm install

# Set environment variables
ENV DISPLAY=:99
ENV NODE_ENV=development

# Expose port for VNC if needed
EXPOSE 5900

# Default command
CMD ["/bin/bash"]
