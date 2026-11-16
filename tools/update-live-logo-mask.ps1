$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$logoPath = Join-Path $projectRoot 'site\img\nilmo-logo.png'
$htmlPath = Join-Path $projectRoot 'site\index.html'
$size = 200

$source = [System.Drawing.Image]::FromFile($logoPath)
$canvas = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.DrawImage($source, 0, 0, $size, $size)
$graphics.Dispose()
$source.Dispose()

$digits = [System.Text.StringBuilder]::new($size * $size)
for ($y = 0; $y -lt $size; $y++) {
    for ($x = 0; $x -lt $size; $x++) {
        $pixel = $canvas.GetPixel($x, $y)
        $alpha = $pixel.A / 255.0
        $luma = (0.2126 * $pixel.R + 0.7152 * $pixel.G + 0.0722 * $pixel.B) / 255.0
        # The live chapter renders the mask as monochrome points on a dark
        # scene. Keep dark, opaque logo shapes visible at a mid intensity
        # while allowing the white mark to remain the brightest layer.
        $strength = $alpha * (0.55 + 0.45 * $luma)
        $digit = [Math]::Min(9, [Math]::Max(0, [Math]::Round($strength * 9)))
        [void]$digits.Append([int]$digit)
    }
}
$canvas.Dispose()

$html = [System.IO.File]::ReadAllText($htmlPath)
$replacement = 'var FACE="' + $digits.ToString() + '",FG=200'
$updated = [regex]::Replace($html, 'var FACE="[0-9]+",FG=200', $replacement, 1)
if ($updated -eq $html) { throw 'The animated logo mask was not found.' }
[System.IO.File]::WriteAllText($htmlPath, $updated, [System.Text.UTF8Encoding]::new($false))
Write-Output 'Updated the Live chapter point-cloud logo mask for Nilmo.'
