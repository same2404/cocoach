@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
echo ===== CoCoach : Demo-Video v2 bauen =====
if not exist "segs" mkdir segs
if not exist "public" mkdir public

echo --- 1/11 Intro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=2:r=25" -i "caps\cap_intro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 50 segs\seg_00.mp4

echo --- 2/11 Dashboard ---
ffmpeg -y -loop 1 -i "shots\01_dashboard.png" -i "caps\cap_01.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_01.mp4

echo --- 3/11 Taktiktafel ---
ffmpeg -y -loop 1 -i "shots\02_taktiktafel.png" -i "caps\cap_02.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_02.mp4

echo --- 4/11 Startelf-Praesentation ---
ffmpeg -y -loop 1 -i "shots\03_startelf.png" -i "caps\cap_03.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_03.mp4

echo --- 5/11 Trainingsplanung ---
ffmpeg -y -loop 1 -i "shots\04_trainingsplanung.png" -i "caps\cap_04.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_04.mp4

echo --- 6/11 Kader ---
ffmpeg -y -loop 1 -i "shots\05_kader.png" -i "caps\cap_05.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_05.mp4

echo --- 7/11 Spielerbericht Diagramme ---
ffmpeg -y -loop 1 -i "shots\06_spielerbericht_diagramme.png" -i "caps\cap_06.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_06.mp4

echo --- 8/11 Spielerbericht Pro ---
ffmpeg -y -loop 1 -i "shots\07_spielerbericht_pro.png" -i "caps\cap_07.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_07.mp4

echo --- 9/11 Budget ---
ffmpeg -y -loop 1 -i "shots\08_budget.png" -i "caps\cap_08.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_08.mp4

echo --- 10/11 Spielanalyse ---
ffmpeg -y -loop 1 -i "shots\09_spielanalyse.png" -i "caps\cap_09.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_09.mp4

echo --- 11/11 Outro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=2:r=25" -i "caps\cap_outro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 50 segs\seg_10.mp4

echo --- Zusammenfuegen ---
if exist seglist.txt del /q seglist.txt
for %%f in (seg_00 seg_01 seg_02 seg_03 seg_04 seg_05 seg_06 seg_07 seg_08 seg_09 seg_10) do echo file 'segs\%%f.mp4' >> seglist.txt
ffmpeg -y -f concat -safe 0 -i seglist.txt -c copy "public\demo-video-v3.mp4"
del /q seglist.txt

echo --- FERTIG ---
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "public\demo-video-v3.mp4"
