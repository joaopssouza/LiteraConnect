<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/cd4a1f65-7ded-418d-a2ce-0c80d1fc5723

## Run Locally

**Prerequisites:**  Node.js

Correção rápida só para a sessão atual do terminal:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. Access from another PC (same network):
   `http://SEU_IP_LOCAL:3000` (exemplo: `http://192.168.205.249:3000`)

Se ainda nao abrir em outro PC, libere a porta 3000 no Firewall do Windows
para rede privada e confirme se ambos dispositivos estao na mesma sub-rede.

## MCP Supabase no VS Code

Este repositório já inclui configuração em `.vscode/mcp.json` e o pacote `@supabase/mcp-server-supabase`.

Configuração atual:
- `project-ref` já fixado para este projeto
- token lido apenas de arquivos locais deste repositório (`.env.mcp.local`, `.env.local` ou `.env`)

Para usar somente neste repositório, adicione em `.env.mcp.local`:

`SUPABASE_ACCESS_TOKEN="seu_personal_access_token"`

Se precisar gerar token:
- Supabase Dashboard -> Account -> Access Tokens
