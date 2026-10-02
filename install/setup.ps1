<#
.SYNOPSIS
    Script d'automatisation de l'environnement de développement local Windows pour RAGTIME.
.DESCRIPTION
    Vérifie l'ensemble des prérequis matériels et logiciels (PowerShell 7+, Node 20+, Python 3.12+, Docker, Ollama),
    initialise la configuration locale .env avec secrets générés, télécharge les modèles LLM requis et vérifie
    l'accessibilité des services.
.PARAMETER CheckOnly
    Mode diagnostic en lecture seule : inspecte les dépendances sans modifier aucun fichier ni lancer de conteneurs.
.PARAMETER SkipModels
    Passe le téléchargement des modèles Ollama (llama3.2:3b et nomic-embed-text).
.PARAMETER SkipDocker
    Passe le démarrage des conteneurs Docker (PostgreSQL et Redis).
.PARAMETER ForceEnv
    Force la régénération du fichier .env même s'il existe déjà.
.EXAMPLE
    .\install\setup.ps1 -CheckOnly
.EXAMPLE
    .\install\setup.ps1
#>

[CmdletBinding()]
param (
    [switch]$CheckOnly,
    [switch]$SkipModels,
    [switch]$SkipDocker,
    [switch]$ForceEnv
)

# Configuration de l'encodage de la console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Localisation du répertoire racine du projet RAGTIME
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location -Path $ProjectRoot

# Couleurs et helpers d'affichage
function Write-Header {
    param([string]$Text)
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host "  $Text" -ForegroundColor Cyan -NoNewline
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-Step {
    param([string]$Num, [string]$Text)
    Write-Host "[$Num] " -ForegroundColor DarkCyan -NoNewline
    Write-Host "$Text" -ForegroundColor White
}

function Write-Success {
    param([string]$Text)
    Write-Host "  [OK] " -ForegroundColor Green -NoNewline
    Write-Host "$Text" -ForegroundColor Gray
}

function Write-WarningMsg {
    param([string]$Text)
    Write-Host "  [ATTENTION] " -ForegroundColor Yellow -NoNewline
    Write-Host "$Text" -ForegroundColor Yellow
}

function Write-ErrorMsg {
    param([string]$Text)
    Write-Host "  [ERREUR] " -ForegroundColor Red -NoNewline
    Write-Host "$Text" -ForegroundColor Red
}

function Test-PortAvailable {
    param([int]$Port)
    $listener = $null
    try {
        $ip = [System.Net.IPAddress]::Loopback
        $listener = [System.Net.Sockets.TcpListener]::new($ip, $Port)
        $listener.Start()
        $listener.Stop()
        return $true
    } catch {
        return $false
    }
}

# Bannière RAGTIME
Write-Host ""
Write-Host "  ____             ____ _____ ___ __  __ _____ " -ForegroundColor DarkCyan
Write-Host " |  _ \   /\      / ___|_   _|_ _|  \/  | ____|" -ForegroundColor DarkCyan
Write-Host " | |_) | /  \    | |  _  | |  | || |\/| |  _|  " -ForegroundColor Cyan
Write-Host " |  _ < / /\ \   | |_| | | |  | || |  | | |___ " -ForegroundColor Cyan
Write-Host " |_| \_/_/  \_\   \____| |_| |___|_|  |_|_____|" -ForegroundColor White
Write-Host " Architecture RAG Souveraine & On-Premise (Beat & Pgvector)" -ForegroundColor Gray
Write-Host ""

$GlobalErrors = 0
$GlobalWarnings = 0

Write-Header "DIAGNOSTIC DES PRÉREQUIS SYSTÈME (US-DEVOPS-01)"

# 1. Vérification PowerShell
Write-Step "1/6" "Vérification de la version PowerShell..."
$PSVer = $PSVersionTable.PSVersion
if ($PSVer.Major -ge 7) {
    Write-Success "PowerShell Core 7+ détecté : v$PSVer"
} elseif ($PSVer.Major -ge 5 -and $PSVer.Minor -ge 1) {
    Write-Success "Windows PowerShell 5.1 détecté (Recommandation : migrer vers PowerShell 7+ pour un confort optimal)"
} else {
    Write-ErrorMsg "Version PowerShell trop ancienne : v$PSVer (Minimum requis : 5.1, recommandé : 7+)"
    $GlobalErrors++
}

# 2. Vérification Node.js & npm
Write-Step "2/6" "Vérification de l'environnement Node.js..."
try {
    $NodeVersionRaw = (node --version 2>&1).Trim()
    if ($NodeVersionRaw -match 'v(\d+)\.(\d+)') {
        $NodeMajor = [int]$Matches[1]
        if ($NodeMajor -ge 20) {
            Write-Success "Node.js $NodeVersionRaw détecté (Conforme >= 20.0)"
        } else {
            Write-WarningMsg "Node.js $NodeVersionRaw détecté. RAGTIME requiert Node.js 20 LTS ou supérieur."
            $GlobalWarnings++
        }
    } else {
        Write-WarningMsg "Impossible de déterminer la version exacte de Node.js."
    }
} catch {
    Write-ErrorMsg "Node.js n'est pas installé ou n'est pas dans le PATH système."
    $GlobalErrors++
}

# 3. Vérification Python
Write-Step "3/6" "Vérification de l'environnement Python..."
$PythonCmd = $null
foreach ($cmd in @("python", "py", "python3")) {
    try {
        $ver = (& $cmd --version 2>&1).Trim()
        if ($ver -match "Python (\d+)\.(\d+)") {
            $PyMajor = [int]$Matches[1]
            $PyMinor = [int]$Matches[2]
            if ($PyMajor -ge 3 -and $PyMinor -ge 12) {
                $PythonCmd = $cmd
                Write-Success "$ver détecté ($cmd) - Conforme >= 3.12"
                break
            } else {
                Write-WarningMsg "$ver détecté via $cmd. Le backend FastAPI recommande Python 3.12+."
                $GlobalWarnings++
                $PythonCmd = $cmd
                break
            }
        }
    } catch { }
}
if (-not $PythonCmd) {
    Write-ErrorMsg "Python 3.12+ n'a pas été trouvé dans le PATH. Veuillez installer Python 3.12 64-bit."
    $GlobalErrors++
}

# 4. Vérification Docker Desktop
Write-Step "4/6" "Vérification de Docker Desktop et du moteur de conteneurs..."
$DockerRunning = $false
try {
    $DockerVersion = (docker --version 2>&1).Trim()
    Write-Success "Client Docker présent : $DockerVersion"
    $DockerInfo = docker info --format '{{.ServerVersion}}' 2>$null
    if ($LASTEXITCODE -eq 0 -and $DockerInfo) {
        Write-Success "Démon Docker opérationnel (Serveur v$DockerInfo)"
        $DockerRunning = $true
    } else {
        Write-WarningMsg "Docker Desktop est installé mais le démon ne semble pas être démarré."
        Write-WarningMsg "Veuillez lancer Docker Desktop depuis le menu Démarrer de Windows."
        $GlobalWarnings++
    }
} catch {
    Write-WarningMsg "Docker CLI n'est pas détecté. PostgreSQL/pgvector et Redis nécessitent Docker Desktop."
    $GlobalWarnings++
}

# 5. Vérification Ollama (Inférence LLM locale)
Write-Step "5/6" "Vérification du service d'inférence Ollama..."
$OllamaReachable = $false
try {
    $OllamaVer = (ollama --version 2>&1).Trim()
    Write-Success "Client Ollama détecté : $OllamaVer"
} catch {
    Write-WarningMsg "Ollama n'est pas dans le PATH. Assurez-vous qu'Ollama pour Windows est installé."
    $GlobalWarnings++
}

try {
    $OllamaCheck = Invoke-RestMethod -Uri "http://localhost:11434/api/tags" -Method Get -TimeoutSec 3 -ErrorAction Stop
    Write-Success "Démon Ollama accessible et actif sur http://localhost:11434"
    $OllamaReachable = $true
    $ExistingModels = $OllamaCheck.models | ForEach-Object { $_.name }
    if ($ExistingModels) {
        Write-Host "    Modèles locaux recensés : $($ExistingModels -join ', ')" -ForegroundColor DarkGray
    }
} catch {
    Write-WarningMsg "Ollama ne répond pas sur http://localhost:11434. Veuillez lancer l'application Ollama."
    $GlobalWarnings++
}

# 6. Vérification des conflits de ports locaux
Write-Step "6/6" "Vérification de la disponibilité des ports réseau locaux..."
$PortsToCheck = @(
    @{ Port = 3000; Service = "Frontend Vite" },
    @{ Port = 8000; Service = "Backend FastAPI" },
    @{ Port = 5432; Service = "PostgreSQL pgvector" },
    @{ Port = 6379; Service = "Redis 7" }
)

foreach ($p in $PortsToCheck) {
    $isFree = Test-PortAvailable -Port $p.Port
    if ($isFree) {
        Write-Success "Port $($p.Port) disponible ($($p.Service))"
    } else {
        Write-WarningMsg "Port $($p.Port) déjà occupé par un autre processus ($($p.Service))."
    }
}

# Gestion du mode Diagnostic seul (-CheckOnly)
if ($CheckOnly) {
    Write-Header "RÉSUMÉ DU DIAGNOSTIC (-CheckOnly)"
    Write-Host "Nombre d'erreurs bloquantes : $GlobalErrors" -ForegroundColor $(if ($GlobalErrors -gt 0) { "Red" } else { "Green" })
    Write-Host "Nombre d'avertissements : $GlobalWarnings" -ForegroundColor $(if ($GlobalWarnings -gt 0) { "Yellow" } else { "Green" })
    Write-Host ""
    if ($GlobalErrors -eq 0) {
        Write-Host "Environnement sain et prêt pour le déploiement local." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Certains prérequis bloquants doivent être corrigés avant de poursuivre." -ForegroundColor Red
        exit 1
    }
}

# --- INITIALISATION ACTIVE DE L'ENVIRONNEMENT ---
Write-Header "INITIALISATION DE L'ENVIRONNEMENT DE DÉVELOPPEMENT"

# Étape A : Gestion du fichier .env
$EnvFile = Join-Path $ProjectRoot ".env"
$EnvExample = Join-Path $ProjectRoot ".env.example"

if (-not (Test-Path $EnvFile) -or $ForceEnv) {
    Write-Host "Génération du fichier .env à partir de .env.example..." -ForegroundColor White
    if (Test-Path $EnvExample) {
        Copy-Item -Path $EnvExample -Destination $EnvFile -Force
        
        # Génération d'un secret cryptographique aléatoire de 32 octets (64 car. hexadécimaux)
        $RandomBytes = New-Object byte[] 32
        $Rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $Rng.GetBytes($RandomBytes)
        $NewSecret = ($RandomBytes | ForEach-Object { $_.ToString("x2") }) -join ""
        
        $EnvContent = Get-Content -Path $EnvFile -Raw
        $EnvContent = $EnvContent -replace "ragtime-change-me-in-production-secure-token-2026", $NewSecret
        Set-Content -Path $EnvFile -Value $EnvContent -Encoding UTF8
        Write-Success "Fichier .env initialisé avec une SECRET_KEY sécurisée unique."
    } else {
        Write-ErrorMsg "Fichier .env.example introuvable à la racine du projet."
    }
} else {
    Write-Success "Fichier .env déjà existant (conservé, utiliser -ForceEnv pour réinitialiser)."
}

# Étape B : Téléchargement des modèles Ollama requis
if (-not $SkipModels -and $OllamaReachable) {
    Write-Header "TÉLÉCHARGEMENT DES MODÈLES SOUVERAINS OLLAMA"
    
    $RequiredModels = @("nomic-embed-text", "llama3.2:3b")
    foreach ($model in $RequiredModels) {
        Write-Host "Vérification du modèle $model..." -ForegroundColor White
        $AlreadyInstalled = $false
        if ($ExistingModels) {
            $AlreadyInstalled = $ExistingModels | Where-Object { $_ -like "*$model*" }
        }
        
        if ($AlreadyInstalled) {
            Write-Success "Modèle $model déjà présent localement."
        } else {
            Write-Host "Téléchargement en cours de $model (cette étape peut prendre quelques minutes)..." -ForegroundColor Cyan
            try {
                & ollama pull $model
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "Modèle $model téléchargé avec succès."
                } else {
                    Write-WarningMsg "Échec du téléchargement pour $model (Code de sortie: $LASTEXITCODE)."
                }
            } catch {
                Write-WarningMsg "Impossible d'exécuter 'ollama pull $model'."
            }
        }
    }
} elseif ($SkipModels) {
    Write-Host "Téléchargement des modèles Ollama ignoré (-SkipModels)." -ForegroundColor DarkGray
}

# Étape C : Démarrage des conteneurs Docker (PostgreSQL pgvector & Redis)
if (-not $SkipDocker -and $DockerRunning) {
    Write-Header "ORCHESTRATION DOCKER DES SERVICES D'INFRASTRUCTURE"
    $DockerComposeFile = Join-Path $ProjectRoot "docker-compose.yml"
    if (Test-Path $DockerComposeFile) {
        Write-Host "Démarrage des services postgresql et redis..." -ForegroundColor White
        try {
            docker compose up -d postgresql redis
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Conteneurs PostgreSQL 16 (pgvector) et Redis 7 démarrés avec succès."
            } else {
                Write-WarningMsg "Avertissement lors du lancement de docker compose."
            }
        } catch {
            Write-WarningMsg "Erreur lors de l'exécution de docker compose up."
        }
    } else {
        Write-WarningMsg "docker-compose.yml non encore créé à la racine. Étape différée à US-DEVOPS-02."
    }
} elseif ($SkipDocker) {
    Write-Host "Lancement des conteneurs Docker ignoré (-SkipDocker)." -ForegroundColor DarkGray
}

# Étape D : Installation des dépendances Frontend
$PackageJson = Join-Path $ProjectRoot "package.json"
$NodeModules = Join-Path $ProjectRoot "node_modules"
if (Test-Path $PackageJson) {
    if (-not (Test-Path $NodeModules)) {
        Write-Header "INSTALLATION DES DÉPENDANCES FRONTEND (NPM)"
        Write-Host "Exécution de 'npm install'..." -ForegroundColor Cyan
        try {
            npm install
            Write-Success "Dépendances frontend installées."
        } catch {
            Write-WarningMsg "Erreur lors de l'exécution de npm install."
        }
    } else {
        Write-Success "Dossier node_modules présent."
    }
}

Write-Header "INSTALLATION RAGTIME TERMINÉE AVEC SUCCÈS"
Write-Host "Pour lancer le frontend de développement :" -ForegroundColor Cyan
Write-Host "    npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "Pour ouvrir l'application dans votre navigateur :" -ForegroundColor Cyan
Write-Host "    http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Consultez la documentation complète dans : install/install.md" -ForegroundColor DarkGray
Write-Host ""

exit 0
