"""
scene_detector_master.py
-------------------------
Analysiert ein Fußballspiel, schneidet echte Videoclips (MP4) aus und
lässt Gemini die Szenen anhand der 7-Ebenen-Kategorien der Videoanalyse
(Nordcode: 'Tore', 'Gegentore', 'Spielaufbau', 'Pressing MIT Ball',
'Pressing GEGEN den Ball', 'Standards', 'Ballverlust') bewerten.

Die Kategorien sind exakt auf VIDEO_CATEGORIES in
src/components/views/VideoAnalysisView.tsx (fc-auggen-manager-26-27)
abgestimmt. Das erzeugte manifest_master.json kann direkt zum Import
der Clips in die App verwendet werden.

Nutzung:
    python scene_detector_master.py --video spiel.mp4 --output_dir master_clips
"""

import argparse
import json
import os
import re
import time
from pathlib import Path
import google.generativeai as genai
from moviepy.editor import VideoFileClip


# Die ultimative, professionelle Master-Prompt für Gemini (Video + Audio)
MASTER_PROMPT = """Du bist ein international lizenzierter Fußball-Lehrer und professioneller Spielanalyst (UEFA Pro Level).
Analysiere diesen kurzen Videoausschnitt (ca. 10-15 Sekunden) inklusive Bild und Ton anhand der folgenden 8 Kategorien extrem präzise.

Wähle GENAU EINE dominante Kategorie aus:

1. "Tore"
   - Merkmale: Ball überquert Torlinie, Netz bewegt sich, unsere Spieler jubeln (Arme hoch, Sprint zum Schützen), Gegner zeigt Frustration, Schiedsrichter zeigt zur Mittellinie. Hörbarer Jubel oder Trainerruf.

2. "Gegentore"
   - Merkmale: Ball überquert unsere Linie, Gegner jubelt, unsere Spieler lassen Köpfe hängen / Hände am Kopf. Schiedsrichter zeigt zur Mittellinie.

3. "Spielaufbau"
   - Merkmale: Kontrollierter Aufbau von hinten (IV, AV, 6er), ruhige Ballzirkulation, klare Struktur (Viererkette, Passdreiecke, flache Pässe, geduldiges Kombinationsspiel im Tiki-Taka-Stil).

4. "Pressing MIT Ball" (Gegenpressing)
   - Merkmale: Sofortiges, aggressives Nachsetzen nach eigenem Ballverlust, mehrere Spieler laufen den Ballführenden in 3-5 Sekunden an, um den Ball direkt zurückzuerobern.

5. "Pressing GEGEN den Ball" (Defensives Pressing)
   - Merkmale: Kompakter Block, koordiniertes Anlaufen des gegnerischen Aufbaus ohne eigenen Ballbesitz, ballorientiertes Verschieben.

6. "Standards"
   - Merkmale: Ruhender Ball (Ecke, Freistoß, Einwurf, Abstoß), feste Positionen, Strafraumbewegungen oder Mauerstellung.

7. "Ballverlust"
   - Merkmale: Fehlpass, Dribbling-Verlust, technischer Fehler im Aufbau oder Zentrum, Gegner übernimmt den Ball, Frustration/Umschaltmoment.

8. "kein_relevantes_ereignis"
   - Normale Mittelfeldphase ohne klaren taktischen Schwerpunkt.

Antworte AUSSCHLIESSLICH als valides JSON in diesem exakten Format (kein Markdown drumherum):
{
  "category": "Tore|Gegentore|Spielaufbau|Pressing MIT Ball|Pressing GEGEN den Ball|Standards|Ballverlust|kein_relevantes_ereignis",
  "confidence": 0.0 bis 1.0,
  "begruendung": "Präziser Satz auf Deutsch, der die sichtbaren und auditiven Merkmale (Körpersprache, Ballverhalten, Taktik) beschreibt."
}
"""


# Slugs aus dem Manifest auf die App-Kategorien mappen (Dateinamen bleiben slug-freundlich)
CATEGORY_TO_SLUG = {
    "Tore": "Tore",
    "Gegentore": "Gegentore",
    "Spielaufbau": "Spielaufbau",
    "Pressing MIT Ball": "Pressing_MIT_Ball",
    "Pressing GEGEN den Ball": "Pressing_GEGEN_den_Ball",
    "Standards": "Standards",
    "Ballverlust": "Ballverlust",
}

VALID_CATEGORIES = set(CATEGORY_TO_SLUG.keys()) | {"kein_relevantes_ereignis"}


def parse_json_response(text: str) -> dict:
    """Extrahiert und parst JSON sicher aus der Gemini-Antwort."""
    cleaned = re.sub(r"^```(?:json)?\s*([\s\S]*?)\s*```$", r"\1", text.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return {
            "category": "kein_relevantes_ereignis",
            "confidence": 0.0,
            "begruendung": "JSON-Parsing fehlgeschlagen."
        }


def main():
    parser = argparse.ArgumentParser(description="Master-Spielanalyse mit Gemini für echte Videoclips (Kategorien der App).")
    parser.add_argument("--video", type=Path, required=True, help="Pfad zur Videodatei des Spiels (z.B. spiel.mp4)")
    parser.add_argument("--output_dir", type=Path, default=Path("master_clips"), help="Zielordner für die geschnittenen Videoclips")
    parser.add_argument("--chunk_seconds", type=float, default=12.0, help="Segmentlänge in Sekunden pro Clip")
    parser.add_argument("--threshold", type=float, default=0.65, help="Mindest-Konfidenz für die Speicherung")
    parser.add_argument("--model", type=str, default="gemini-2.0-flash", help="Gemini-Modellname")
    args = parser.parse_args()

    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise SystemExit("Fehler: Bitte setze zuerst den API-Key mit 'export GEMINI_API_KEY=\"dein-key\"'")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(args.model)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    if not args.video.exists():
        raise FileNotFoundError(f"Videodatei nicht gefunden: {args.video}")

    print(f"Lade Video: {args.video.name} ...")
    video = VideoFileClip(str(args.video))
    duration = video.duration

    manifest = []
    chunk_duration = args.chunk_seconds
    current_time = 0.0
    idx = 1

    print(f"Starte Master-Analyse in {chunk_duration}s-Videoblöcken...\n")

    while current_time < duration:
        start_time = current_time
        end_time = min(duration, current_time + chunk_duration)

        if end_time - start_time < 5.0:
            break

        temp_clip_path = args.output_dir / f"temp_chunk_{idx:03d}.mp4"

        # Echten Videoclip (MP4) ausschneiden
        subclip = video.subclip(start_time, end_time)
        subclip.write_videofile(
            str(temp_clip_path),
            codec="libx264",
            audio_codec="aac",
            preset="ultrafast",
            logger=None
        )
        subclip.close()

        print(f"[{idx}] Prüfe Videosegment ({start_time:.1f}s bis {end_time:.1f}s)...")

        try:
            # Videoclip zu Gemini hochladen
            video_file = genai.upload_file(path=str(temp_clip_path))
            while video_file.state.name == "PROCESSING":
                time.sleep(1)
                video_file = genai.get_file(video_file.name)

            # Analyse des Videoclips starten
            response = model.generate_content([video_file, MASTER_PROMPT])
            result = parse_json_response(response.text)

            # Temporäre Datei in der Cloud löschen
            genai.delete_file(video_file.name)

            category = result.get("category", "kein_relevantes_ereignis")
            if category not in VALID_CATEGORIES:
                category = "kein_relevantes_ereignis"
            confidence = float(result.get("confidence", 0.0))
            begruendung = result.get("begruendung", "")

            print(f"    -> ERGEBNIS: {category.upper()} (Konfidenz: {confidence})")
            print(f"       Begründung: {begruendung}")

            # Wenn ein echtes Highlight erkannt wurde -> als echten Videoclip behalten
            if category != "kein_relevantes_ereignis" and confidence >= args.threshold:
                slug = CATEGORY_TO_SLUG.get(category, "Sonstiges")
                final_filename = f"scene_{idx:03d}_{slug}.mp4"
                final_path = args.output_dir / final_filename

                os.rename(temp_clip_path, final_path)

                manifest.append({
                    "id": idx,
                    "file": final_filename,
                    "start_time": round(start_time, 2),
                    "end_time": round(end_time, 2),
                    "category": category,
                    "confidence": round(confidence, 3),
                    "begruendung": begruendung
                })
                print(f"    [+] Videoclip gespeichert als: {final_filename}\n")
            else:
                # Uninteressantes Segment sofort löschen, um Festplatte zu sparen
                if temp_clip_path.exists():
                    os.remove(temp_clip_path)
                print(f"    [-] Videoclip verworfen (kein relevantes Ereignis)\n")

        except Exception as e:
            print(f"    [!] Fehler bei der Verarbeitung: {e}\n")
            if temp_clip_path.exists():
                os.remove(temp_clip_path)

        current_time += chunk_duration
        idx += 1

    video.close()

    # Manifest abspeichern
    manifest_path = args.output_dir / "manifest_master.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"=== ANALYSE ABGESCHLOSSEN ===")
    print(f"Insgesamt {len(manifest)} echte Videoclips erfolgreich exportiert.")
    print(f"Manifest gespeichert unter: {manifest_path}")


if __name__ == "__main__":
    main()