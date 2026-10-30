Add-Type -AssemblyName System.Drawing

$logoPath = "c:\Users\ACER\reactNative\R2Cart\src\assets\images\logo.png"
$resBase = "c:\Users\ACER\reactNative\R2Cart\android\app\src\main\res"

$sizes = @{
    "mipmap-mdpi"    = 48
    "mipmap-hdpi"    = 72
    "mipmap-xhdpi"   = 96
    "mipmap-xxhdpi"  = 144
    "mipmap-xxxhdpi" = 192
}

$src = [System.Drawing.Image]::FromFile($logoPath)
$srcW = $src.Width
$srcH = $src.Height

foreach ($folder in $sizes.Keys) {
    $dim = $sizes[$folder]
    $dir = Join-Path $resBase $folder
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force }

    # Generate square ic_launcher.png with white background and centered logo
    $bmp = New-Object System.Drawing.Bitmap($dim, $dim)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::White)

    # Scale logo inside (padding 12%)
    $availW = $dim * 0.88
    $availH = $dim * 0.88
    $scale = [Math]::Min($availW / $srcW, $availH / $srcH)
    $destW = [int]($srcW * $scale)
    $destH = [int]($srcH * $scale)
    $destX = [int](($dim - $destW) / 2)
    $destY = [int](($dim - $destH) / 2)

    $g.DrawImage($src, $destX, $destY, $destW, $destH)
    $g.Dispose()

    $launcherFile = Join-Path $dir "ic_launcher.png"
    $roundFile = Join-Path $dir "ic_launcher_round.png"

    # Save
    $bmp.Save($launcherFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Save($roundFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output "Generated icons in $folder ($dim x $dim)"
}

$src.Dispose()
Write-Output "Done generating launcher icons from logo.png!"
