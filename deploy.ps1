# Script para automatizar o deploy do LiteraConnect via Git + SSH
# Execute no PowerShell local com: .\deploy.ps1

Write-Host "🚀 Iniciando deploy automático via Git..." -ForegroundColor Cyan

# 1. Verificar se há alterações não commitadas
$status = git status --porcelain
if ($status) {
    Write-Host "📝 Alterações locais detectadas. Criando commit..." -ForegroundColor Yellow
    git add .
    $commitMsg = Read-Host "Digite a mensagem do commit (ou pressione Enter para: 'deploy automatico')"
    if ([string]::IsNullOrEmpty($commitMsg)) {
        $commitMsg = "deploy automatico"
    }
    git commit -m $commitMsg
} else {
    Write-Host "✅ Nenhuma alteração local pendente de commit." -ForegroundColor Green
}

# 2. Enviar alterações para o repositório remoto (GitHub/GitLab)
Write-Host "📤 Enviando alterações para o repositório remoto (git push)..." -ForegroundColor Cyan
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao enviar alterações para o Git remoto. Abortando deploy." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Executar o Git Pull e Rebuild no servidor de produção
Write-Host "🌐 Conectando ao servidor SSH para puxar atualizações e rodar rebuild..." -ForegroundColor Cyan
ssh jpadmin@ssh.jpdev.uk "cd /home/jpadmin/literaconnect && git pull origin main && docker compose up -d --build nextjs"

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deploy finalizado com sucesso no servidor jpdev.uk!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Ocorreu um erro durante a atualização no servidor." -ForegroundColor Red
}
