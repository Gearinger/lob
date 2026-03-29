$assets = @{
    "assets/sfx/click.mp3" = "https://cdn.pixabay.com/audio/2025/06/01/audio_d2ccbb367a.mp3"
    "assets/sfx/deal.mp3"  = "https://cdn.pixabay.com/audio/2022/03/15/audio_e385f1aa0d.mp3"
    "assets/sfx/win.mp3"   = "https://cdn.jsdelivr.net/gh/ionden/ion.sound@master/sounds/bell_ring.mp3"
    "assets/bgm/lobby.mp3" = "https://cdn.pixabay.com/audio/2025/01/29/audio_624efff11d.mp3"
    "assets/bgm/game.mp3"  = "https://cdn.pixabay.com/audio/2026/03/06/audio_6a35f8f476.mp3"
}

# Create directories
if (!(Test-Path "assets/sfx")) { New-Item -ItemType Directory -Force -Path "assets/sfx" }
if (!(Test-Path "assets/bgm")) { New-Item -ItemType Directory -Force -Path "assets/bgm" }

$ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

# Download each file
foreach ($path in $assets.Keys) {
    $url = $assets[$path]
    Write-Host "Downloading $path from $url ..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $path -UserAgent $ua -ErrorAction Stop
        Write-Host "Success: $path"
    } catch {
        Write-Warning "Failed to download $path. Error: $_"
    }
}

Write-Host "Sync process complete."
