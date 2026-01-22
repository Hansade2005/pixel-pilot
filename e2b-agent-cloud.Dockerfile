# PiPilot Agent Cloud E2B Template
# Combines Claude Code CLI + Playwright with Chromium for autonomous coding agents

FROM node:20-slim

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV DEBCONF_NONINTERACTIVE_SEEN=true

# Pre-configure keyboard settings to avoid prompts
RUN echo 'keyboard-configuration keyboard-configuration/layout select English (US)' | debconf-set-selections
RUN echo 'keyboard-configuration keyboard-configuration/layoutcode select us' | debconf-set-selections

# Install system dependencies required for Playwright/Chromium
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
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxkbcommon0 \
    libxrandr2 \
    libxrender1 \
    libxshmfence1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    && rm -rf /var/lib/apt/lists/*

# Install npm and pnpm globally
RUN npm install -g npm@latest
RUN npm install -g pnpm@9

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Install Playwright and MCP servers globally so they're available to the user
RUN npm install -g @anthropic-ai/mcp-server-filesystem @playwright/mcp playwright

# Create a user with proper setup (matching E2B conventions)
RUN useradd -m -s /bin/bash user

# Create necessary directories with correct ownership
RUN mkdir -p /home/user/.npm /home/user/.cache /home/user/project /home/user/.claude /home/user/.cache/ms-playwright \
    && chown -R user:user /home/user

# Pre-configure MCP servers (Tavily for web search, Playwright for browser automation, Filesystem for local files)
# GitHub MCP is added dynamically at runtime with the user's token
RUN echo '{"mcpServers":{"tavily":{"type":"http","url":"https://mcp.tavily.com/mcp/?tavilyApiKey=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"},"playwright":{"command":"npx","args":["-y","@playwright/mcp@latest"]},"filesystem":{"command":"npx","args":["-y","@anthropic-ai/mcp-server-filesystem","/home/user/project"]}}}' > /home/user/.claude/mcp.json \
    && chown user:user /home/user/.claude/mcp.json

# Switch to user for Playwright browser installation
USER user
WORKDIR /home/user

# Install Playwright browsers as user (Chromium only to save space)
ENV PLAYWRIGHT_BROWSERS_PATH=/home/user/.cache/ms-playwright
RUN npx playwright install chromium

# Set environment variables
ENV NODE_ENV=development
ENV PLAYWRIGHT_BROWSERS_PATH=/home/user/.cache/ms-playwright

# Expose common development ports
EXPOSE 3000 5173 8080

# Default command
CMD ["/bin/bash"]
