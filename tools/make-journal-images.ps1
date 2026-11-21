# Generates journal-specific, web-sized images.
# Only copies are written to images/field-notes; project originals stay untouched.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images\field-notes'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-JournalImage {
  param($Source, $Name, $LongEdge, $Quality)

  $sourcePath = Join-Path $root ($Source -replace '/', '\')
  if (-not (Test-Path $sourcePath)) {
    Write-Output ("MISSING {0}" -f $Source)
    return
  }

  $img = [System.Drawing.Image]::FromFile($sourcePath)
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

  $sourceEdge = [Math]::Max($img.Width, $img.Height)
  $scale = [Math]::Min(1.0, $LongEdge / $sourceEdge)
  $w = [Math]::Max(1, [int][Math]::Round($img.Width * $scale))
  $h = [Math]::Max(1, [int][Math]::Round($img.Height * $scale))

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $graphics = [System.Drawing.Graphics]::FromImage($bmp)
  $graphics.Clear([System.Drawing.Color]::FromArgb(237, 234, 228))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($img, 0, 0, $w, $h)
  $graphics.Dispose()

  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
  $outPath = Join-Path $outDir $Name
  $bmp.Save($outPath, $jpegCodec, $encoderParams)
  $bmp.Dispose()
  $img.Dispose()

  Write-Output ("{0}  {1}x{2}  {3} KB" -f $Name, $w, $h, [Math]::Round((Get-Item $outPath).Length / 1KB))
}

# Real photographs for projects that have them.
Save-JournalImage 'images/home/bench-nite.jpg' 'nite-cover.jpg' 1600 84
Save-JournalImage 'images/home/bench-nite.jpg' 'nite-thumb.jpg' 640 80
Save-JournalImage 'images/projects/nite-369/IMG_20260801_120742624.jpg' 'nite-body-1.jpg' 1200 82
Save-JournalImage 'images/projects/nite-369/IMG_20260810_004419763.jpg' 'nite-body-2.jpg' 1200 82

Save-JournalImage 'images/home/bench-cat-field.jpg' 'cat-cover.jpg' 1600 84
Save-JournalImage 'images/home/bench-cat-field.jpg' 'cat-thumb.jpg' 640 80
Save-JournalImage 'images/projects/cat-autonomous-rover/20251214_130742.jpg' 'cat-body-1.jpg' 1200 82
Save-JournalImage 'images/projects/cat-autonomous-rover/IMG20251214153627.jpg' 'cat-body-2.jpg' 1200 82
Save-JournalImage 'images/projects/cat-autonomous-rover/20251214_155126.jpg' 'cat-body-3.jpg' 1200 82

Save-JournalImage 'images/projects/scrapx6/WhatsApp Image 2026-04-09 at 5.00.18 PM.jpeg' 'scrap-cover.jpg' 1600 84
Save-JournalImage 'images/projects/scrapx6/WhatsApp Image 2026-04-08 at 6.39.00 PM.jpeg' 'scrap-thumb.jpg' 800 82
Save-JournalImage 'images/projects/scrapx6/WhatsApp Image 2026-04-08 at 6.39.00 PM.jpeg' 'scrap-hero.jpg' 1000 82
Save-JournalImage 'images/projects/scrapx6/WhatsApp Image 2026-04-09 at 5.00.18 PM.jpeg' 'scrap-body-1.jpg' 1200 82
