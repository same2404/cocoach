@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0\.."
echo ===== CoCoach : Demo-Video v4 (Kundenversion, ~105s, mit Musik) bauen =====
if not exist "segs4" mkdir segs4
if not exist "public" mkdir public

set FPS=25
set SCENE=275
set ZINC=0.0005
set MUSIC_D=114

echo --- 1/14 Musik erzeugen (selbst synthetisierter Upbeat-Loop) ---
ffmpeg -y -f lavfi -i "aevalsrc='0.14*(sin(2*PI*if(lt(mod(t,8),2),261.63,if(lt(mod(t,8),4),196.00,if(lt(mod(t,8),6),220.00,174.61)))*t)+sin(2*PI*if(lt(mod(t,8),2),329.63,if(lt(mod(t,8),4),246.94,if(lt(mod(t,8),6),261.63,220.00)))*t)+sin(2*PI*if(lt(mod(t,8),2),392.00,if(lt(mod(t,8),4),392.00,if(lt(mod(t,8),6),329.63,246.94)))*t))*(0.75+0.25*sin(2*PI*2*t))+0.22*sin(2*PI*if(lt(mod(t,8),2),130.81,if(lt(mod(t,8),4),98.00,if(lt(mod(t,8),6),110.00,87.31)))*t)*(0.6+0.4*sin(2*PI*2*t))+0.7*exp(-35*mod(t,0.5))*sin(2*PI*55*t)':d=%MUSIC_D%:s=44100" -c:a pcm_s16le segs4\bg_v4.wav

echo --- 2/14 Intro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=3:r=%FPS%" -i "caps\cap_intro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -frames:v 75 segs4\seg_00.mp4

echo --- 3-11/14 Szenen ---
call :scene 01 shots\01_dashboard.png cap_01.png
call :scene 02 shots\02_taktiktafel.png cap_02.png
call :scene 03 shots\03_startelf.png cap_03.png
call :scene 04 shots\04_trainingsplanung.png cap_04.png
call :scene 05 shots\05_kader.png cap_05.png
call :scene 06 shots\06_spielerbericht_diagramme.png cap_06.png
call :scene 07 shots\07_spielerbericht_pro.png cap_07.png
call :scene 08 shots\08_budget.png cap_08.png
call :scene 09 shots\09_spielanalyse.png cap_09.png

echo --- 12/14 Outro ---
ffmpeg -y -f lavfi -i "color=c=0x0A0E17:s=1920x1080:d=3:r=%FPS%" -i "caps\cap_outro.png" -filter_complex "[0:v][1:v]overlay=(main_w-overlay_w)/2:(main_h-overlay_h)/2[v]" -map "[v]" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -frames:v 75 segs4\seg_10.mp4

echo --- 13/14 Zusammenfuegen (ohne Ton) ---
if exist seglist4.txt del /q seglist4.txt
for %%f in (seg_00 seg_01 seg_02 seg_03 seg_04 seg_05 seg_06 seg_07 seg_08 seg_09 seg_10) do echo file 'segs4\%%f.mp4' >> seglist4.txt
ffmpeg -y -f concat -safe 0 -i seglist4.txt -c copy segs4\silent.mp4
del /q seglist4.txt

echo --- 14/14 Musik untermischen + Fade ---
ffmpeg -y -i segs4\silent.mp4 -i segs4\bg_v4.wav -filter_complex "[1:a]afade=t=in:st=0:d=1.5,afade=t=out:st=103:d=2,volume=0.9[a]" -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "public\demo-video-v4.mp4"

echo --- FERTIG ---
ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 "public\demo-video-v4.mp4"
exit /b

:scene
ffmpeg -y -loop 1 -i "%~2" -i "caps\%~3" -filter_complex "[0:v]scale=2880:1620,zoompan=z='min(zoom+%ZINC%,1.15)':d=%SCENE%:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1920x1080:fps=%FPS%[bg];[bg][1:v]overlay=0:0[v]" -map "[v]" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -frames:v %SCENE% "segs4\seg_%~1.mp4"
exit /b
