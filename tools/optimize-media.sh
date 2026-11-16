#!/usr/bin/env bash
# Websign · Medien-Varianten erzeugen (lokal, kein Build-Schritt, läuft nie auf dem Server).
#
#   tools/optimize-media.sh <quelle> <sektion> <name> [breite ...]
#
#   Bild:   tools/optimize-media.sh ~/Desktop/kornblume.png arbeiten kornblume 960 1920
#           → assets/media/arbeiten/kornblume-960.{avif,webp,jpg} und …-1920.{avif,webp,jpg}
#   Video:  tools/optimize-media.sh ~/Desktop/tour.mov tour demo 960 1920
#           → assets/media/tour/demo-960.{webm,mp4}, …-1920.{webm,mp4} und Poster demo-960.{avif,jpg}
#
# Konvention: assets/media/<sektion>/<name>-<breite>.<format>. Die kleinere Breite ist 1x, die doppelte 2x.
# Werkzeuge (was installiert ist, wird genutzt): ffmpeg, avifenc (libavif), cwebp (libwebp), unter macOS zusätzlich sips.
# Ohne ffmpeg entstehen aus Bildern nur die Formate, für die ein Werkzeug da ist; Videos brauchen ffmpeg.
# Am Ende gibt das Skript das passende <picture>- bzw. <video>-Markup aus.

set -euo pipefail

if [ "$#" -lt 3 ]; then
  sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
  exit 64
fi

SRC="$1"; SECTION="$2"; NAME="$3"; shift 3
WIDTHS=("$@"); [ "${#WIDTHS[@]}" -gt 0 ] || WIDTHS=(960 1920)
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/assets/media/$SECTION"
REL="assets/media/$SECTION"

[ -f "$SRC" ] || { echo "Quelle nicht gefunden: $SRC" >&2; exit 66; }
has() { command -v "$1" >/dev/null 2>&1; }
mkdir -p "$OUT"
made=()
note() { made+=("$1"); printf '  %-44s %6s KB\n' "$REL/$(basename "$1")" "$(( ($(wc -c < "$1") + 512) / 1024 ))"; }

case "$(printf '%s' "${SRC##*.}" | tr '[:upper:]' '[:lower:]')" in
  mp4|mov|m4v|webm|mkv) KIND=video ;;
  *) KIND=image ;;
esac

if [ "$KIND" = image ]; then
  has ffmpeg || has sips || { echo "Weder ffmpeg noch sips gefunden. Installiere ffmpeg (z. B. brew install ffmpeg)." >&2; exit 69; }
  echo "Bild → $REL/"
  for W in "${WIDTHS[@]}"; do
    BASE="$OUT/$NAME-$W"
    TMPBASE="$(mktemp -t ws-media)"; TMP="$TMPBASE.png"
    # 1 · verlustfrei auf Zielbreite bringen
    if has ffmpeg; then ffmpeg -v error -y -i "$SRC" -vf "scale=$W:-2:flags=lanczos" -frames:v 1 "$TMP"
    else sips -s format png --resampleWidth "$W" "$SRC" --out "$TMP" >/dev/null; fi
    # 2 · JPG als Fallback
    if has ffmpeg; then ffmpeg -v error -y -i "$TMP" -q:v 3 "$BASE.jpg"
    else sips -s format jpeg -s formatOptions 82 "$TMP" --out "$BASE.jpg" >/dev/null; fi
    note "$BASE.jpg"
    # 3 · WebP
    if has cwebp; then cwebp -quiet -q 80 "$TMP" -o "$BASE.webp"; note "$BASE.webp"
    elif has ffmpeg; then ffmpeg -v error -y -i "$TMP" -c:v libwebp -quality 80 "$BASE.webp" && note "$BASE.webp"
    else echo "  (kein WebP: cwebp oder ffmpeg fehlt)"; fi
    # 4 · AVIF
    if has avifenc; then avifenc --min 20 --max 32 --speed 4 "$TMP" "$BASE.avif" >/dev/null; note "$BASE.avif"
    elif has ffmpeg && ffmpeg -v error -y -i "$TMP" -c:v libsvtav1 -crf 30 -still-picture 1 "$BASE.avif" 2>/dev/null; then note "$BASE.avif"
    else echo "  (kein AVIF: avifenc fehlt, ffmpeg ohne libsvtav1)"; fi
    rm -f "$TMP" "$TMPBASE"
  done
  S="${WIDTHS[0]}"; L="${WIDTHS[${#WIDTHS[@]}-1]}"
  H="$(if has ffprobe; then ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT/$NAME-$S.jpg"; else sips -g pixelHeight "$OUT/$NAME-$S.jpg" | awk '/pixelHeight/ {print $2}'; fi)"
  echo
  echo 'Markup (alt-Text ergänzen; beim LCP-Bild loading/decoding durch fetchpriority="high" ersetzen):'
  echo '<picture>'
  for F in avif webp; do
    if [ -f "$OUT/$NAME-$S.$F" ]; then echo "  <source type=\"image/$F\" srcset=\"$REL/$NAME-$S.$F 1x, $REL/$NAME-$L.$F 2x\">"
    else echo "  <!-- $F fehlt: Werkzeug installieren und Skript erneut ausführen -->"; fi
  done
  echo "  <img src=\"$REL/$NAME-$S.jpg\" srcset=\"$REL/$NAME-$L.jpg 2x\" width=\"$S\" height=\"$H\" alt=\"\" loading=\"lazy\" decoding=\"async\">"
  echo '</picture>'
else
  has ffmpeg || { echo "Videos brauchen ffmpeg (z. B. brew install ffmpeg)." >&2; exit 69; }
  echo "Video → $REL/"
  for W in "${WIDTHS[@]}"; do
    BASE="$OUT/$NAME-$W"
    ffmpeg -v error -y -i "$SRC" -an -vf "scale=$W:-2:flags=lanczos" -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -movflags +faststart "$BASE.mp4"; note "$BASE.mp4"
    if ffmpeg -v error -y -i "$SRC" -an -vf "scale=$W:-2:flags=lanczos" -c:v libsvtav1 -preset 6 -crf 34 "$BASE.webm" 2>/dev/null; then note "$BASE.webm"
    else echo "  (kein AV1: ffmpeg ohne libsvtav1)"; fi
  done
  S="${WIDTHS[0]}"; L="${WIDTHS[${#WIDTHS[@]}-1]}"
  ffmpeg -v error -y -i "$SRC" -vf "scale=$S:-2:flags=lanczos" -frames:v 1 -q:v 3 "$OUT/$NAME-$S.jpg"; note "$OUT/$NAME-$S.jpg"
  if has avifenc; then avifenc --min 20 --max 32 --speed 4 "$OUT/$NAME-$S.jpg" "$OUT/$NAME-$S.avif" >/dev/null; note "$OUT/$NAME-$S.avif"; POSTER="$REL/$NAME-$S.avif"; else POSTER="$REL/$NAME-$S.jpg"; fi
  H="$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT/$NAME-$S.mp4")"
  cat <<HTML

Markup (media.js lädt die Quellen erst in der Nähe des Viewports; data-reset-on-exit ist optional):
<div class="media">
  <video data-video muted playsinline loop preload="none" poster="$POSTER" width="$S" height="$H">
    <source data-src-s="$REL/$NAME-$S.webm" data-src-l="$REL/$NAME-$L.webm" type="video/webm; codecs=av01.0.05M.08">
    <source data-src-s="$REL/$NAME-$S.mp4" data-src-l="$REL/$NAME-$L.mp4" type="video/mp4">
  </video>
</div>
HTML
fi

echo
echo "Fertig: ${#made[@]} Dateien. Danach: node tools/check.mjs"
