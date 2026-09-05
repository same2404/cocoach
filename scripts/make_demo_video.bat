@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
echo ===== FC Auggen Manager : Demo-Video bauen =====
if not exist "segs" mkdir segs
if not exist "public" mkdir public

echo --- 1/9 Intro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=2:r=25" -i "caps\cap_intro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 50 segs\seg_00.mp4

echo --- 2/9 Dashboard ---
ffmpeg -y -loop 1 -i "shots\01_dashboard.png" -i "caps\cap_01.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_01.mp4

echo --- 3/9 Taktiktafel ---
ffmpeg -y -loop 1 -i "shots\02_taktiktafel.png" -i "caps\cap_02.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_02.mp4

echo --- 4/9 Trainingsplanung ---
ffmpeg -y -loop 1 -i "shots\03_training.png" -i "caps\cap_03.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_03.mp4

echo --- 5/9 Kader ---
ffmpeg -y -loop 1 -i "shots\04_kader.png" -i "caps\cap_04.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_04.mp4

echo --- 6/9 Budget ---
ffmpeg -y -loop 1 -i "shots\05_budget.png" -i "caps\cap_05.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_05.mp4

echo --- 7/9 Tracker ---
ffmpeg -y -loop 1 -i "shots\06_tracker.png" -i "caps\cap_06.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_06.mp4

echo --- 8/9 Spielanalyse ---
ffmpeg -y -loop 1 -i "shots\07_analyse.png" -i "caps\cap_07.png" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+0.0007,1.15)':d=75:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=25[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 75 segs\seg_07.mp4

echo --- 9/9 Outro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=2:r=25" -i "caps\cap_outro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 20 -pix_fmt yuv420p -frames:v 50 segs\seg_08.mp4

echo --- Zusammenfuegen ---
if exist seglist.txt del /q seglist.txt
for %%f in (seg_00 seg_01 seg_02 seg_03 seg_04 seg_05 seg_06 seg_07 seg_08) do echo file 'segs\%%f.mp4' >> seglist.txt
ffmpeg -y -f concat -safe 0 -i seglist.txt -c copy "public\demo-video.mp4"
del /q seglist.txt

echo --- FERTIG ---
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "public\demo-video.mp4"