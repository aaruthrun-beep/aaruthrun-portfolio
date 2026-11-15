# Generates web-sized copies of the homepage bench photos.
# Source photos stay untouched in images/projects/; output goes to images/home/.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images\home'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$jobs = @(
  @{ Src = 'images\projects\nite-369\IMG_20260729_014512191.jpg'; Out = 'bench-nite.jpg' },
  @{ Src = 'images\projects\cat-autonomous-rover\20251214_130742.jpg'; Out = 'bench-cat.jpg' },
  @{ Src = 'images\projects\scrapx6\WhatsApp Image 2026-03-17 at 9.46.42 PM.jpeg'; Out = 'bench-scrapx6.jpg' },
  @{ Src = 'images\projects\cat-autonomous-rover\IMG20251214153627.jpg'; Out = 'bench-cat-field.jpg' }
)

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

foreach ($job in $jobs) {
  $srcPath = Join-Path $root $job.Src
  $outPath = Join-Path $outDir $job.Out

  $img = [System.Drawing.Image]::FromFile($srcPath)

  # Respect camera orientation before resizing.
  $orientation = 1
  if ($img.PropertyIdList -contains 274) {
    $orientation = [int]$img.GetPropertyItem(274).Value[0]
  }
  switch ($orientation) {
    2 { $img.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
    3 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
    4 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
    5 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
    6 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
    7 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipY) }
    8 { $img.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
  }

  $longEdge = [Math]::Max($img.Width, $img.Height)
  $scale = [Math]::Min(1.0, 1400.0 / $longEdge)
  $w = [Math]::Max(1, [int][Math]::Round($img.Width * $scale))
  $h = [Math]::Max(1, [int][Math]::Round($img.Height * $scale))

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($img, 0, 0, $w, $h)
  $graphics.Dispose()

  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)
  $bmp.Save($outPath, $jpegCodec, $encoderParams)
  $bmp.Dispose()
  $img.Dispose()

  $size = [Math]::Round((Get-Item $outPath).Length / 1KB)
  Write-Output ("{0}  {1}x{2}  {3} KB" -f $job.Out, $w, $h, $size)
}
