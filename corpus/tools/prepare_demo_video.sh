#!/usr/bin/env bash
# Prépare une vidéo de démonstration pour l'app Corpus : boucle sans coupure, encodage mobile, image d'attente.
# Usage : prepare_demo_video.sh <entrée.mp4> <début_s> <fin_s> <sortie_sans_extension> [fondu_s=0.3]
# La boucle : on retire les <fondu> premières secondes et on les fond à la fin, si bien que la dernière image
# rejoint exactement la première. Les instants de fin de répétition sont donc décalés de -<fondu>.
set -euo pipefail
in="$1"; start="$2"; end="$3"; out="$4"; fade="${5:-0.3}"
len=$(python3 -c "print(round($end-$start,3))")
off=$(python3 -c "print(round($len-2*$fade,3))")
ffmpeg -v error -y -ss "$start" -t "$len" -i "$in" -filter_complex "\
[0:v]fps=30,scale='min(1920,iw)':-2,format=yuv420p,split=2[a][b];\
[a]trim=start=$fade,setpts=PTS-STARTPTS[main];\
[b]trim=0:$fade,setpts=PTS-STARTPTS[head];\
[main][head]xfade=transition=fade:duration=$fade:offset=$off,format=yuv420p[v]" \
  -map "[v]" -an -c:v libx264 -preset slow -crf 20 -profile:v high -movflags +faststart "$out.mp4"
ffmpeg -v error -y -i "$out.mp4" -frames:v 1 -q:v 3 "$out.jpg"
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$out.mp4")
echo "durée=$dur s (soustraire $fade s aux instants de fin de répétition de la source)"
