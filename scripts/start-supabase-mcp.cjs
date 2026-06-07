const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function readTokenFromEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized || normalized.startsWith('#')) continue;

    const match = normalized.match(/^SUPABASE_ACCESS_TOKEN\s*=\s*(.+)$/);
    if (match) {
      return stripQuotes(match[1]);
    }
  }

  return null;
}

function resolveToken(repoRoot) {
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    return process.env.SUPABASE_ACCESS_TOKEN;
  }

  const candidates = ['.env.mcp.local', '.env.local', '.env'];

  for (const candidate of candidates) {
    const token = readTokenFromEnvFile(path.join(repoRoot, candidate));
    if (token) return token;
  }

  return null;
}

function start() {
  const repoRoot = process.cwd();
  const token = resolveToken(repoRoot);

  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN nao encontrado em .env.mcp.local, .env.local ou .env deste repositorio.');
    process.exit(1);
  }

  const serverEntrypoint = path.join(
    repoRoot,
    'node_modules',
    '@supabase',
    'mcp-server-supabase',
    'dist',
    'transports',
    'stdio.js'
  );

  const child = spawn(
    process.execPath,
    [serverEntrypoint, '--project-ref', 'wgdkxdsumfufcmpvzfpe'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        SUPABASE_ACCESS_TOKEN: token,
      },
    }
  );

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code || 0);
  });
}

start();
