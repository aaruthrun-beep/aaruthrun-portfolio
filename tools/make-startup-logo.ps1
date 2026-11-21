# Creates a transparent, trimmed logo derivative for the Avani Dynamics hero.
# The original logo file remains untouched.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'images\startup\avani-dynamics\logo.png'
$outDir = Join-Path $root 'images\startup\avani-dynamics'
$outPath = Join-Path $outDir 'logo-mark.png'

$img = [System.Drawing.Bitmap]::FromFile($source)
$minX = $img.Width
$minY = $img.Height
$maxX = -1
$maxY = -1

for ($y = 0; $y -lt $img.Height; $y++) {
  for ($x = 0; $x -lt $img.Width; $x++) {
    $p = $img.GetPixel($x, $y)
    $isWhite = $p.A -lt 12 -or ($p.R -ge 246 -and $p.G -ge 246 -and $p.B -ge 246)
    if (-not $isWhite) {
      if ($x -lt $minX) { $minX = $x }
      if ($x -gt $maxX) { $maxX = $x }
      if ($y -lt $minY) { $minY = $y }
      if ($y -gt $maxY) { $maxY = $y }
    }
  }
}

if ($maxX -lt $minX -or $maxY -lt $minY) {
  throw 'No logo content found.'
}

$trimW = $maxX - $minX + 1
$trimH = $maxY - $minY + 1
$targetW = 800
$targetH = [int][Math]::Round($trimH * ($targetW / $trimW))

$trimmed = New-Object System.Drawing.Bitmap($trimW, $trimH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($trimmed)
$g.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $trimW, $trimH)), (New-Object System.Drawing.Rectangle($minX, $minY, $trimW, $trimH)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose()

$out = New-Object System.Drawing.Bitmap($targetW, $targetH, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.Clear([System.Drawing.Color]::Transparent)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.DrawImage($trimmed, 0, 0, $targetW, $targetH)
$g.Dispose()

for ($y = 0; $y -lt $out.Height; $y++) {
  for ($x = 0; $x -lt $out.Width; $x++) {
    $p = $out.GetPixel($x, $y)
    if ($p.R -ge 246 -and $p.G -ge 246 -and $p.B -ge 246) {
      $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
    }
  }
}

$out.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
$trimmed.Dispose()
$img.Dispose()

Write-Output ("{0}  {1}x{2}  {3} KB" -f $outPath, $targetW, $targetH, [Math]::Round((Get-Item $outPath).Length / 1KB))
