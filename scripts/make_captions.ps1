# Copyright (c) 2026 FC Auggen Manager. All rights reserved. Copying or duplication is prohibited.
Add-Type -AssemblyName System.Drawing

$W = 1920; $H = 1080
$dir = Join-Path $PSScriptRoot '..\caps'
if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }

$grain = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

function New-ChipCaption {
  param(
    [string]$Path, [string]$Title, [string]$Sub, [System.Drawing.Color]$SubColor
  )
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = $grain; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $ox = 80; $oy = 60; $pw = 780; $ph = 120
  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(205, 6, 9, 18))
  $g.FillRectangle($bg, $ox, $oy, $pw, $ph)

  $g.FillRectangle((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 192, 0, 0))), $ox, $oy, 6, $ph)
  $tFont = New-Object System.Drawing.Font('Arial', 34, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $sFont = New-Object System.Drawing.Font('Arial', 18, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString($Title, $tFont, $white, ($ox + 26), ($oy + 16))
  $g.DrawString($Sub, $sFont, (New-Object System.Drawing.SolidBrush($SubColor)), ($ox + 26), ($oy + 62))
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

function New-CenterCaption {
  param([string]$Path, [string]$Main, [string]$Sub, [string]$Border)
  $bmp = New-Object System.Drawing.Bitmap($W, $H)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = $grain; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.Color]::Transparent)

  $mFont = New-Object System.Drawing.Font('Arial', 88, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $bFont = New-Object System.Drawing.Font('Arial', 36, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $fmt = New-Object System.Drawing.StringFormat
  $fmt.Alignment = [System.Drawing.StringAlignment]::Center
  $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

  $rc = New-Object System.Drawing.RectangleF(0, 300, $W, 300)
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
  $g.DrawString($Main, $mFont, $white, $rc, $fmt)

  $rc2 = New-Object System.Drawing.RectangleF(0, 620, $W, 120)
  $red = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 192, 0, 0))
  $g.DrawString($Sub, $bFont, $red, $rc2, $fmt)

  # rote Linie über und unter dem Titel
  $line = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 192, 0, 0), 3)
  $g.DrawLine($line, ($W/2 - 260), 285, ($W/2 + 260), 285)
  $g.DrawLine($line, ($W/2 - 260), 740, ($W/2 + 260), 740)
  $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
}

$blue  = [System.Drawing.Color]::FromArgb(255, 155, 197, 255)
$green = [System.Drawing.Color]::FromArgb(255, 122, 240, 160)
$amber = [System.Drawing.Color]::FromArgb(255, 255, 227, 155)
$cyan  = [System.Drawing.Color]::FromArgb(255, 128, 220, 255)
$white = [System.Drawing.Color]::White

New-ChipCaption -Path (Join-Path $dir 'cap_01.png') -Title 'Modernes Design. Klare Struktur.' -Sub 'Startseite  ·  CoCoach' -SubColor $blue
New-ChipCaption -Path (Join-Path $dir 'cap_02.png') -Title 'Taktik & Formation – live anpassbar' -Sub '100 % manuell  ·  frei gezeichnet' -SubColor $green
New-ChipCaption -Path (Join-Path $dir 'cap_03.png') -Title 'Startelf-Präsentation' -Sub 'Grundordnung & Positionen' -SubColor $amber
New-ChipCaption -Path (Join-Path $dir 'cap_04.png') -Title 'Training perfekt organisiert' -Sub 'Kalender  ·  Inhalte  ·  Spielerübernahme' -SubColor $cyan
New-ChipCaption -Path (Join-Path $dir 'cap_05.png') -Title 'Kader modern verwalten' -Sub 'Spielerprofile & Rollen-Zuordnung' -SubColor $blue
New-ChipCaption -Path (Join-Path $dir 'cap_06.png') -Title 'Spielerbericht – alle Diagramme' -Sub 'Leistung  ·  Belastung  ·  Form' -SubColor $green
New-ChipCaption -Path (Join-Path $dir 'cap_07.png') -Title 'Spielerbericht Pro' -Sub 'Analyse & Feedback in Echtzeit' -SubColor $cyan
New-ChipCaption -Path (Join-Path $dir 'cap_08.png') -Title 'Finanzen klar im Blick' -Sub 'Einnahmen / Ausgaben im Überblick' -SubColor $amber
New-ChipCaption -Path (Join-Path $dir 'cap_09.png') -Title 'Spielanalyse & xG' -Sub 'GPS-Daten & moderne Analysen' -SubColor $blue

New-CenterCaption -Path (Join-Path $dir 'cap_intro.png') -Main 'CoCoach' -Sub 'Die moderne Fußball-App' -Border 'red'
New-CenterCaption -Path (Join-Path $dir 'cap_outro.png') -Main 'CoCoach' -Sub 'Die Zukunft des Fußballmanagements' -Border 'red'

Write-Output 'Caps erstellt:' ; Get-ChildItem $dir | Select-Object Name, @{N='KB';E={[math]::Round($_.Length/1KB,0)}}