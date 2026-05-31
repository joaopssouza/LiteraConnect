# 🏛️ Architecture Snapshot: OptiPlex Server (Produção)

## 1. Hardware & Bare Metal (Fundação)
* **Host:** Dell OptiPlex 3080 Micro (Headless, Zero-Touch Boot ativo via GRUB).
* **CPU:** Intel Core i5-10500T (6 Cores / 12 Threads) @ 2.30GHz - 3.80GHz.
* **GPU:** Intel UHD Graphics 630 (Driver `i915` carregado nativamente).
* **RAM:** 16 GB (14.86 GiB utilizáveis pelo Docker).
* **Storage:** NVMe (Boot/OS) + SSD SATA TXRUI 256GB (Swap de 4GB + Dados).
* **OS:** Ubuntu Server (Kernel 7.0.0-22-generic). BIOS otimizada (Wi-Fi, Bluetooth e Áudio desativados para economia de energia/IRQs).

## 2. Network & SecOps (Borda e Segurança)
A infraestrutura não expõe nenhuma porta pública para a internet, mitigando ataques de força bruta e varreduras (DDoS/Zero-days). Toda a comunicação passa por um túnel criptografado.
* **Ingress:** Cloudflare Zero Trust (Tunnels).
* **Reverse Proxy:** Nginx Proxy Manager (NPM) gerenciando a rede interna `proxy_network`.
* **Autenticação de Borda:** Cloudflare Access (Autenticação via OTP por e-mail isolado).
* **Acesso Remoto (SSH):** Renderizado via Web Terminal ou via CLI usando `cloudflared ProxyCommand` no domínio `ssh.jpdev.uk`.

## 3. Observabilidade e Telemetria (Lean)
* **Motor:** Netdata (em modo edge, acoplado ao host).
* **Tuning:** Atualização de 3 em 3 segundos, Machine Learning desativado.
* **Coletores Ativos:** `proc` (Hardware/Watts), `apps` (Processos), `cgroups` (Docker) e `go.d` (Rastreio de Aplicações/Bancos de Dados).
* **Rota Externa:** `monitor.jpdev.uk` (Blindado pelo Cloudflare Access).

## 4. Orquestração e IA (Stack de Infraestrutura)
Localizados no manifesto base: `~/infra/docker-compose.yml`
* **Portainer:** Orquestração visual (Local/Blindado).
* **Ollama:** Motor de LLM executando na CPU via instruções AVX2 (Local/Isolado).
* **Open-WebUI:** Interface de chat da IA, conectada ao Ollama (Local).
* **NPM & Cloudflared:** Camada de roteamento descrita acima.

## 5. Aplicações de Negócio (Camada de Dados)
A arquitetura de dados segue o princípio de separação de responsabilidades (Clean Architecture). Os bancos de dados rodam em stacks isoladas e redes dedicadas, nunca expostos à internet.

### 5.1 LiteraConnect (Rede Social Acadêmica)
* **Manifesto:** `~/literaconnect/database/docker-compose.yml`
* **Stack:** PostgreSQL 15 (Alpine) compatível com ecossistema Supabase.
* **Otimização:** `shm_size: 1g` (Alta performance em memória).
* **Segurança:** Porta `5432` bindada estritamente em `127.0.0.1` (Acesso via Túnel SSH).
* **Rede Isolada:** `literaconnect_network`.

### 5.2 Auto-EDA-SPX (Automação de Logística) - *[Planejado]*
* **Objetivo:** Processamento de planilhas pesadas, Python ETL e integração de métricas operacionais e logísticas.
* **Infraestrutura Futura:** Preparado para receber bancos NoSQL (MongoDB) ou scripts cron dentro da rede interna.

## 6. Logs de Operação (Status Atual)
Abaixo está o estado atual da infraestrutura, medido em 30/05/2026:

### 6.1 Docker & Hardware Utilization (30/05/2026)
NAME                 CPU %     MEM USAGE / LIMIT
literaconnect_db     0.00%     29.67MiB / 14.86GiB
netdata              1.77%     295.6MiB / 14.86GiB
open-webui           0.43%     1001MiB / 14.86GiB
ollama               0.00%     57.01MiB / 14.86GiB
cloudflared_tunnel   0.51%     42.75MiB / 14.86GiB
nginx_proxy          0.11%     170.4MiB / 14.86GiB
portainer            0.03%     85.92MiB / 14.86GiB

Disco Livre:
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda2       233G   31G  190G  15% /
jpadmin@jpserver:~$