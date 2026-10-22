$ErrorActionPreference = "Continue"
$maxExecucoes = 8
$progresso = "docs/PROGRESSO-REA.md"
$resumo = "docs/RESUMO-REA.md"
$log = "logs/execucao-rea.log"
$limiteContexto = 100
$projeto = Get-Location

New-Item -ItemType Directory -Force -Path "docs", "logs", "scripts" | Out-Null

function Gerar-Resumo {
    param([string]$motivo)

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $conteudoProgreso = if (Test-Path $progresso) { Get-Content $progresso -Raw } else { "N/A" }

    @"
# Resumo - Execucao REA

**Projeto:** $projeto
**Data/Hora:** $timestamp
**Motivo:** $motivo

## Conteudo de docs/PROGRESSO-REA.md

```
$conteudoProgreso
```

## Log de execucao

```
$(if (Test-Path $log) { Get-Content $log -Raw } else { "N/A" } )

## Proximos passos

- Revisar o resumo acima antes de continuar.
- Verificar se STATUS: CONCLUIDO esta presente em docs/PROGRESSO-REA.md.
- Se o contexto atingiu 100%, continuar em um novo terminal com kilo.

"@ | Set-Content -Path $resumo -Encoding UTF8

    Write-Host "Resumo gerado em $resumo"
}

function Abrir-Novo-Terminal-Kilo {
    param([string]$motivo)

    $cmd = "kilo run --auto `"Leia docs/PROGRESSO-REA.md, se existir. Continue a engenharia reversa do Encarte Fácil com REA. Execute tarefas concretas, valide resultados e salve cada etapa. Atualize docs/PROGRESSO-REA.md com evidencias, erros e proximos passos. Se o trabalho ainda estiver incompleto, nao escreva STATUS: CONCLUIDO. Somente marque STATUS: CONCLUIDO quando todos os criterios definidos no projeto estiverem efetivamente atendidos e testados. Nao invente resultados nem repita tarefas concluídas sem necessidade. Motivo da nova sessao: $motivo`""

    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$projeto`"; $cmd" -WorkingDirectory $projeto

    Write-Host "Novo terminal com kilo aberto no projeto: $projeto"
}

$contextoAtingido = $false
$motivoContexto = ""

for ($i = 1; $i -le $maxExecucoes; $i++) {
    if (Test-Path $progresso) {
        $conteudo = Get-Content $progresso -Raw
        if ($conteudo -match "STATUS:\s*CONCLUIDO") {
            Write-Host "Projeto marcado como concluído."
            break
        }
    }

    Write-Host "Execucao $i de $maxExecucoes"

    $prompt = @"
Leia docs/PROGRESSO-REA.md, se existir.
Continue a engenharia reversa do Encarte Fácil com REA.
Execute tarefas concretas, valide resultados e salve cada etapa.
Atualize docs/PROGRESSO-REA.md com evidencias, erros e proximos passos.
Se o trabalho ainda estiver incompleto, nao escreva STATUS: CONCLUIDO.
Somente marque STATUS: CONCLUIDO quando todos os criterios definidos no projeto
estiverem efetivamente atendidos e testados.
Nao invente resultados nem repita tarefas concluídas sem necessidade.
"@

    $saida = & kilo run --auto $prompt 2>&1 |
        Tee-Object -FilePath $log -Append

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Execucao terminou com erro: $LASTEXITCODE"
    }

    $textoSaida = ($saida | Out-String)

    if ($textoSaida -match "(?i)contexto.*(\d+)\s*%|(\d+)\s*%.*contexto|janela.*contexto.*(\d+)\s*%|tokens.*(\d+)\s*%|limite.*contexto.*(\d+)\s*%|100\s*%") {
        foreach ($match in [regex]::Matches($textoSaida, "(?i)(\d+)\s*%")) {
            $valor = [int]$match.Groups[1].Value
            if ($valor -ge $limiteContexto) {
                $contextoAtingido = $true
                $motivoContexto = "Contexto atingiu $valor% na execucao $i."
                break
            }
        }
    }

    if ($contextoAtingido) {
        Gerar-Resumo -motivo $motivoContexto
        Abrir-Novo-Terminal-Kilo -motivo $motivoContexto
        break
    }

    Start-Sleep -Seconds 10
}

if (-not $contextoAtingido) {
    Write-Host "Limite de execucoes atingido sem contexto em 100%."
    if (-not (Test-Path $progresso) -or !(Get-Content $progresso -Raw -ErrorAction SilentlyContinue) -match "STATUS:\s*CONCLUIDO") {
        Gerar-Resumo -motivo "Limite de execucoes atingido sem conclusao."
    }
}
