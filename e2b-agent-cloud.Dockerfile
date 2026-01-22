# PiPilot Agent Cloud E2B Template
# Combines Claude Code CLI + Playwright with Chromium for autonomous coding agents

FROM node:20-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN=true

# Pre-configure keyboard settings to avoid prompts
RUN echo 'keyboard-configuration keyboard-configuration/layout select English (US)' | debconf-set-selections
RUN echo 'keyboard-configuration keyboard-configuration/layoutcode select us' | debconf-set-selections

# Install system dependencies required for Playwright and general development
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    git \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Install npm and pnpm globally
RUN npm install -g npm@latest
RUN npm install -g pnpm@9

# Install Claude Code CLI globally
# This is Anthropic's official CLI for autonomous coding
RUN npm install -g @anthropic-ai/claude-code

# Create a user with proper setup (matching E2B conventions)
RUN useradd -m -s /bin/bash user

# Create necessary directories with correct ownership
RUN mkdir -p /home/user/.npm /home/user/.cache /home/user/project /app /home/user/.claude \
    && chown -R user:user /home/user /app

# Pre-configure Tavily MCP HTTP server (API key embedded for web search capabilities)
# This creates the base MCP config that will be extended at runtime with GitHub MCP
RUN echo '{"mcpServers":{"tavily":{"type":"http","url":"https://mcp.tavily.com/mcp/?tavilyApiKey=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"},"filesystem":{"command":"npx","args":["-y","@anthropic/mcp-server-filesystem","/home/user/project"]}}}' > /home/user/.claude/mcp.json \
    && chown user:user /home/user/.claude/mcp.json

# Set up Playwright in /app directory (required by Playwright)
WORKDIR /app

# Copy package files for Playwright installation
COPY --chown=user:user e2b-agent-cloud-template/package.json ./

# Install Playwright dependencies
RUN pnpm install

# Set Playwright browsers path and install Chromium
ENV PLAYWRIGHT_BROWSERS_PATH=0
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Make /app readable and executable by all users
RUN chmod -R a+rwX /app

# Switch to user for security
USER user

# Set working directory to user home
WORKDIR /home/user

# Set environment variables
ENV NODE_ENV=development
ENV PLAYWRIGHT_BROWSERS_PATH=0
# ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL will be set at runtime

# Expose common development ports
EXPOSE 3000 5173 8080

# Default command
CMD ["/bin/bash"]
