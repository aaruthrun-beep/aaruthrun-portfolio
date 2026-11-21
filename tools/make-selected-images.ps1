# Generates the selected-work photographs used on the homepage.
# The project archive keeps its originals; output goes to images/selected/.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images\selected'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$jobs = @(
  @{ Src = 'images\projects\nite-369\1.png'; Out = 'nite-369.jpg' },
  @{ Src = 'images\projects\scrapx6\WhatsApp Image 2026-03-17 at 9.46.42 PM.jpeg'; Out = 'scrapx6.jpg' },
  @{ Src = 'images\projects\cat-autonomous-rover\Base_V5_2025-Nov-08_04-14-23AM-000_CustomizedView27029332276_jpg.jpg'; Out = 'cat-autonomous-rover.jpg' }
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

  # Flatten onto the warm page background so transparent renders do not turn black in JPEG.
  $longEdge = [Math]::Max($img.Width, $img.Height)
  $scale = [Math]::Min(1.0, 1600.0 / $longEdge)
  $w = [Math]::Max(1, [int][Math]::Round($img.Width * $scale))
  $h = [Math]::Max(1, [int][Math]::Round($img.Height * $scale))

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.Clear([System.Drawing.Color]::FromArgb(240, 239, 233))
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
