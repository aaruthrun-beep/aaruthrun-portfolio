# Generates web-sized copies of every project cover for the archive page.
# Originals stay untouched in images/projects/; output goes to images/archive/.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'images\archive'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

$projects = Get-Content (Join-Path $root 'data\projects.json') -Raw | ConvertFrom-Json
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }

function Save-Resized {
  param($SourcePath, $OutPath, $LongEdge, $Quality)

  $img = [System.Drawing.Image]::FromFile($SourcePath)

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
  $graphics.Clear([System.Drawing.Color]::FromArgb(240, 239, 233))
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.DrawImage($img, 0, 0, $w, $h)
  $graphics.Dispose()

  $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
  $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]$Quality)
  $bmp.Save($OutPath, $jpegCodec, $encoderParams)
  $bmp.Dispose()
  $img.Dispose()

  return @{ Width = $w; Height = $h; KB = [Math]::Round((Get-Item $OutPath).Length / 1KB) }
}

foreach ($project in $projects) {
  $sourcePath = Join-Path $root ($project.image -replace '/', '\')
  if (-not (Test-Path $sourcePath)) {
    Write-Output ("MISSING {0} -> {1}" -f $project.slug, $project.image)
    continue
  }

  $large = Save-Resized -SourcePath $sourcePath -OutPath (Join-Path $outDir ($project.slug + '.jpg')) -LongEdge 1600 -Quality 82
  $thumb = Save-Resized -SourcePath $sourcePath -OutPath (Join-Path $outDir ($project.slug + '-thumb.jpg')) -LongEdge 640 -Quality 80

  Write-Output ("{0}  {1}x{2} {3} KB  |  thumb {4}x{5} {6} KB" -f $project.slug, $large.Width, $large.Height, $large.KB, $thumb.Width, $thumb.Height, $thumb.KB)
}
