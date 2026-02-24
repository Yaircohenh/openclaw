ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-bookworm

ARG DEBIAN_FRONTEND=noninteractive

# System packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    git git-lfs less procps sudo jq nano vim unzip \
    gnupg2 ca-certificates \
    zsh fzf \
    python3 python3-pip python3-venv \
    curl wget \
    && curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
       | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
    && chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
       | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && apt-get update && apt-get install -y gh \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# npm global directory for node user
RUN mkdir -p /usr/local/share/npm-global && \
    chown -R node:node /usr/local/share/npm-global

# Persist shell history
RUN mkdir /commandhistory && \
    touch /commandhistory/.bash_history && \
    chown -R node /commandhistory

# Create workspace and Claude config directories
RUN mkdir -p /workspace /home/node/.claude && \
    chown -R node:node /workspace /home/node/.claude

WORKDIR /workspace

# Switch to non-root user
USER node

ENV NPM_CONFIG_PREFIX=/usr/local/share/npm-global
ENV PATH=$PATH:/usr/local/share/npm-global/bin
ENV SHELL=/bin/zsh

# Zsh setup
ARG ZSH_IN_DOCKER_VERSION=1.2.0
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v${ZSH_IN_DOCKER_VERSION}/zsh-in-docker.sh)" -- \
    -p git -p fzf -x

# Install Claude Code
RUN npm install -g @anthropic-ai/claude-code

# Alias: cc = claude with full permissions
RUN echo 'alias cc="claude --dangerously-skip-permissions"' >> /home/node/.zshrc && \
    echo 'alias cc="claude --dangerously-skip-permissions"' >> /home/node/.bashrc && \
    echo 'export HISTFILE=/commandhistory/.bash_history' >> /home/node/.zshrc
