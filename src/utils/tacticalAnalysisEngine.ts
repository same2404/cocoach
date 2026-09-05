export type TacticalFormation = 
  | '4-4-2' 
  | '4-2-3-1' 
  | '4-1-4-1' 
  | '3-4-3';

export type GamePhase = 'mit_ball' | 'gegen_ball' | 'umschalten';
export type LoadLevel = 'niedrig' | 'mittel' | 'hoch' | 'max';

export type TacticalPhilosophy = 
  | 'positionsspiel'     // Guardiola: Raumkontrolle, Dreiecksbildung, Geduld
  | 'umschaltspiel'      // Klopp: Vertikale Dynamik, sofortiger Tiefenlauf
  | 'gegenpressing'      // Nagelsmann: Ballverlust = Angriffsauslöser
  | 'fluegelueberladung' // Tuchel: Überzahl am Flügel, diagonale Läufe
  | 'kompaktheit';       // Simeone: Enge Staffelung, kurze Wege, Disziplin

export type BuildUpVariant =
  | 'av_fluegel'     // 1. Aufbau über die Außenverteidiger
  | 'sechzehner'     // 2. Aufbau im Sechzehner
  | 'sechser'        // 3. Aufbau über die Sechser
  | 'fluegel_lang';  // 4. Aufbau über den Außenspieler, der den langen Ball auf den Flügel spielt

export interface PositionRunData {
  positionKey: string;
  positionLabel: string;
  roleMitBall: string;
  roleGegenBall: string;
  mitBallPattern: string;
  gegenBallPattern: string;
  loadLevel: LoadLevel;
  strokeWidth: number; // 3 = niedrig, 5 = mittel, 8 = hoch, 12 = max
  pathDMitBall: string;
  pathDGegenBall: string;
  pathDUmschalten: string;
  heatmapCoords: { x: number; y: number; r: number }[];
  trainerAdviceMitBall: string;
  trainerAdviceGegenBall: string;
  nodeCoords2D: { x: number; y: number };
}

export interface FormationAnalysis {
  formation: TacticalFormation;
  name: string;
  pressingHeight: 'Hoch' | 'Mittelhoch' | 'Kompakt-Tief';
  kompaktheit: 'Extrem Kompakt' | 'Ausgewogen' | 'Breit-Fächernd';
  offensiveFocus: string;
  defensiveFocus: string;
  positions: PositionRunData[];
}

export interface FormationComparison {
  fromFormation: TacticalFormation;
  toFormation: TacticalFormation;
  mitBallChanges: string[];
  gegenBallChanges: string[];
  roleChanges: string[];
  loadChanges: string[];
  pressingHeightChange: string;
  kompaktheitChange: string;
  summaryText: string;
}

// Stroke Width per Load Level
export const LOAD_STROKE_WIDTH: Record<LoadLevel, number> = {
  niedrig: 4,
  mittel: 7,
  hoch: 11,
  max: 16,
};

// Line Color per Game Phase
export const PHASE_COLOR: Record<GamePhase, string> = {
  mit_ball: '#3b82f6',   // Blau (Offensiv)
  gegen_ball: '#ef4444', // Rot (Defensiv)
  umschalten: '#eab308', // Gelb (Umschaltmoment)
};

// Helper to calculate load width
export const getLoadWidth = (level: LoadLevel): number => LOAD_STROKE_WIDTH[level] || 5;

// Comprehensive 4 Formations Data Repository
export const FORMATION_REPOSITORY: Record<TacticalFormation, FormationAnalysis> = {
  '4-2-3-1': {
    formation: '4-2-3-1',
    name: '4-2-3-1 Kontrolle & Doppel-Sechs',
    pressingHeight: 'Mittelhoch',
    kompaktheit: 'Extrem Kompakt',
    offensiveFocus: 'OM als Zwischenraum-Regisseur, Flügel hinterlaufen, 2 Sechser sichern voll ab.',
    defensiveFocus: 'Kompaktes Sechser-Schild vor der Abwehr, 10er schließt das Mittelfeld.',
    positions: [
      {
        positionKey: 'ST',
        positionLabel: 'Stürmer (ST)',
        roleMitBall: 'Tiefenlauf hinter die Kette & Festmachen',
        roleGegenBall: 'Pressing-Auslöser & Anlaufen der IV',
        mitBallPattern: 'Zentraler Tiefensprint & Bogenlauf',
        gegenBallPattern: 'Aggressives Gegenpressing auf IV',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 400 220 L 400 90',
        pathDGegenBall: 'M 400 110 L 350 180',
        pathDUmschalten: 'M 400 110 L 400 200',
        heatmapCoords: [{ x: 400, y: 110, r: 80 }],
        trainerAdviceMitBall: 'Für die Position ST ist das tiefe Binden beider IVs typisch.',
        trainerAdviceGegenBall: 'Für die Position ST ist dieser Pressing-Auslöser typisch.',
        nodeCoords2D: { x: 400, y: 110 },
      },
      {
        positionKey: 'OM',
        positionLabel: 'Offensives Mittelfeld (OM)',
        roleMitBall: 'Zwischenraumbewegung & Vorstoß in Zone 14',
        roleGegenBall: 'Gegenpressing & Rückzug ins Mittelfeld',
        mitBallPattern: 'Achterbahn-Lauf zwischen den Linien',
        gegenBallPattern: 'Zentrum sperren & Rückzug auf Sechserhöhe',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 400 260 C 340 210, 460 190, 400 150',
        pathDGegenBall: 'M 400 230 L 400 310',
        pathDUmschalten: 'M 400 230 L 400 280',
        heatmapCoords: [{ x: 400, y: 220, r: 85 }],
        trainerAdviceMitBall: 'Für die Position OM ist die Zwischenraumbewegung typisch.',
        trainerAdviceGegenBall: 'Für die Position OM ist dieser Rückzug ins Zentrums-Sechseck typisch.',
        nodeCoords2D: { x: 400, y: 230 },
      },
      {
        positionKey: 'LA',
        positionLabel: 'Linker Flügel (LA)',
        roleMitBall: 'Halbraum-Diagonallauf & Abschluss',
        roleGegenBall: 'Rückwärtige Sprints & Kompaktheit',
        mitBallPattern: 'Halbraum-Diagonalsprint zum Tor',
        gegenBallPattern: 'Rückwärtssprint in die 4er-Mittelfeldkette',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 150 260 Q 250 200 340 140',
        pathDGegenBall: 'M 150 160 L 190 300',
        pathDUmschalten: 'M 150 160 L 220 250',
        heatmapCoords: [{ x: 250, y: 180, r: 70 }],
        trainerAdviceMitBall: 'Für die Position LA ist dieser Einlauf in Zone 14 typisch.',
        trainerAdviceGegenBall: 'Für die Position LA ist das Einrücken in die Mittelfeldkette typisch.',
        nodeCoords2D: { x: 150, y: 160 },
      },
      {
        positionKey: 'RA',
        positionLabel: 'Rechter Flügel (RA)',
        roleMitBall: 'Außenbahn-Sprint & Überlappung',
        roleGegenBall: 'Rückwärtige Sprints & Flügelabsicherung',
        mitBallPattern: 'Sprint an der Außenbahn bis Grundlinie',
        gegenBallPattern: 'Rückwärtssprint zur Absicherung',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 650 260 L 730 140 L 630 100',
        pathDGegenBall: 'M 650 160 L 610 300',
        pathDUmschalten: 'M 650 160 L 580 250',
        heatmapCoords: [{ x: 670, y: 170, r: 70 }],
        trainerAdviceMitBall: 'Für die Position RA ist dieser Außensprint typisch.',
        trainerAdviceGegenBall: 'Für die Position RA ist dieser Rückwärtssprint typisch.',
        nodeCoords2D: { x: 650, y: 160 },
      },
      {
        positionKey: 'DM-L',
        positionLabel: 'Defensives Mittelfeld Links (DM-L)',
        roleMitBall: 'Pendelbewegung, Ballverlagerung & Absicherung',
        roleGegenBall: 'Kompaktes Verschieben & Riegel vor der Kette',
        mitBallPattern: 'Kompakte Zirkulation vor der Abwehr',
        gegenBallPattern: 'Aggressiver Zweikampf im Sechserraum',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 310 370 Q 250 330 330 290',
        pathDGegenBall: 'M 310 340 L 350 380',
        pathDUmschalten: 'M 310 340 L 310 310',
        heatmapCoords: [{ x: 310, y: 340, r: 75 }],
        trainerAdviceMitBall: 'Für DM-L ist die tiefe Absicherung typisch.',
        trainerAdviceGegenBall: 'Für DM-L ist die Zweikampfführung vor den IVs typisch.',
        nodeCoords2D: { x: 310, y: 340 },
      },
      {
        positionKey: 'DM-R',
        positionLabel: 'Defensives Mittelfeld Rechts (DM-R)',
        roleMitBall: 'Pendelbewegung & Ballverlagerung',
        roleGegenBall: 'Kompaktes Verschieben & Ballorientiertes Pressing',
        mitBallPattern: 'Kompakte Zirkulation & Diagonallauf',
        gegenBallPattern: 'Doppeln im rechten Halbraum',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 490 370 Q 550 330 470 290',
        pathDGegenBall: 'M 490 340 L 450 380',
        pathDUmschalten: 'M 490 340 L 490 310',
        heatmapCoords: [{ x: 490, y: 340, r: 75 }],
        trainerAdviceMitBall: 'Für DM-R ist das Öffnen des Spiels nach rechts typisch.',
        trainerAdviceGegenBall: 'Für DM-R ist die Absicherung bei RA-Aufrücken typisch.',
        nodeCoords2D: { x: 490, y: 340 },
      },
      {
        positionKey: 'LV',
        positionLabel: 'Linker Außenverteidiger (LV)',
        roleMitBall: 'Überlappung & Diagonales Verschieben',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Vorstoß über den Flügel',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 140 380 L 140 230',
        pathDGegenBall: 'M 140 380 L 180 430',
        pathDUmschalten: 'M 140 380 L 140 320',
        heatmapCoords: [{ x: 140, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für LV ist die Überlappung bei LA-Cut-Inside typisch.',
        trainerAdviceGegenBall: 'Für LV ist das Sichern des eigenen Flügels typisch.',
        nodeCoords2D: { x: 140, y: 380 },
      },
      {
        positionKey: 'RV',
        positionLabel: 'Rechter Außenverteidiger (RV)',
        roleMitBall: 'Überlappung & Diagonales Verschieben',
        roleGegenBall: 'Rückwärtssprint & Diagonales Verschieben',
        mitBallPattern: 'Vorstoß über den rechten Flügel',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 660 380 L 660 230',
        pathDGegenBall: 'M 660 380 L 620 430',
        pathDUmschalten: 'M 660 380 L 660 320',
        heatmapCoords: [{ x: 660, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für RV ist die Überlappung über RA typisch.',
        trainerAdviceGegenBall: 'Für RV ist das Schließen der Schnittstelle zum IV typisch.',
        nodeCoords2D: { x: 660, y: 380 },
      },
      {
        positionKey: 'IV-L',
        positionLabel: 'Innenverteidiger Links (IV-L)',
        roleMitBall: 'Aufbaubewegung & Absicherung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Kompakte Restverteidigung',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 290 420 L 230 420',
        pathDGegenBall: 'M 290 420 L 330 440',
        pathDUmschalten: 'M 290 420 L 290 400',
        heatmapCoords: [{ x: 280, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-L ist die ruhige Spieleröffnung typisch.',
        trainerAdviceGegenBall: 'Für IV-L ist das Sichern des Strafraums typisch.',
        nodeCoords2D: { x: 290, y: 420 },
      },
      {
        positionKey: 'IV-R',
        positionLabel: 'Innenverteidiger Rechts (IV-R)',
        roleMitBall: 'Aufbaubewegung & Absicherung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Kompakte Restverteidigung',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 510 420 L 570 420',
        pathDGegenBall: 'M 510 420 L 470 440',
        pathDUmschalten: 'M 510 420 L 510 400',
        heatmapCoords: [{ x: 520, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-R ist die ruhige Spieleröffnung typisch.',
        trainerAdviceGegenBall: 'Für IV-R ist die Zweikampfstärke im Zentrum typisch.',
        nodeCoords2D: { x: 510, y: 420 },
      },
      {
        positionKey: 'TW',
        positionLabel: 'Torwart (TW)',
        roleMitBall: 'Spieleröffnung & Rückpassoption',
        roleGegenBall: 'Positionierung bei Kontern',
        mitBallPattern: 'Kurzer Schritt zur Anspielstation',
        gegenBallPattern: 'Grundstellung Torlinie',
        loadLevel: 'niedrig',
        strokeWidth: 3,
        pathDMitBall: 'M 400 460 L 400 440',
        pathDGegenBall: 'M 400 460 Q 380 465 420 465',
        pathDUmschalten: 'M 400 460 L 400 450',
        heatmapCoords: [{ x: 400, y: 460, r: 35 }],
        trainerAdviceMitBall: 'Für TW ist die präzise Spieleröffnung typisch.',
        trainerAdviceGegenBall: 'Für TW ist die Konzentration auf der Linie typisch.',
        nodeCoords2D: { x: 400, y: 460 },
      }
    ]
  },
  '4-4-2': {
    formation: '4-4-2',
    name: '4-4-2 Klassische Kompaktheit',
    pressingHeight: 'Mittelhoch',
    kompaktheit: 'Extrem Kompakt',
    offensiveFocus: 'Doppelspitze kombiniert direkt, Flügelspieler bringen präzise Flanken, Vorstöße der ZMs.',
    defensiveFocus: '2 Viererketten verschieben absolut synchron, unüberwindbarer Block im 4-4-2 Riegel.',
    positions: [
      {
        positionKey: 'ST-L',
        positionLabel: 'Stürmer Links (ST-L)',
        roleMitBall: 'Tiefenlauf & Ausweichen',
        roleGegenBall: 'Pressing-Auslöser',
        mitBallPattern: 'Diagonaler Tiefensprint',
        gegenBallPattern: 'Anlaufen der IVs',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 330 180 L 290 90',
        pathDGegenBall: 'M 330 110 L 270 180',
        pathDUmschalten: 'M 330 110 L 330 200',
        heatmapCoords: [{ x: 310, y: 110, r: 75 }],
        trainerAdviceMitBall: 'Für ST-L ist der diagonale Tiefenlauf typisch.',
        trainerAdviceGegenBall: 'Für ST-L ist dieser Pressing-Auslöser typisch.',
        nodeCoords2D: { x: 330, y: 110 },
      },
      {
        positionKey: 'ST-R',
        positionLabel: 'Stürmer Rechts (ST-R)',
        roleMitBall: 'Tiefenlauf & Strafraumbewegung',
        roleGegenBall: 'Pressing-Auslöser',
        mitBallPattern: 'Zentraler Tiefensprint',
        gegenBallPattern: 'Anlaufen der IVs',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 470 180 L 510 90',
        pathDGegenBall: 'M 470 110 L 530 180',
        pathDUmschalten: 'M 470 110 L 470 200',
        heatmapCoords: [{ x: 490, y: 110, r: 75 }],
        trainerAdviceMitBall: 'Für ST-R ist der Box-Sprint typisch.',
        trainerAdviceGegenBall: 'Für ST-R ist das Schließen der Schnittstelle typisch.',
        nodeCoords2D: { x: 470, y: 110 },
      },
      {
        positionKey: 'LM',
        positionLabel: 'Linkes Mittelfeld (LM)',
        roleMitBall: 'Außenbahn-Sprint & Flanken',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Lange Sprintlinie Außenbahn',
        gegenBallPattern: 'Rückzug in die 4er-Mittelfeldkette',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 130 320 L 130 130',
        pathDGegenBall: 'M 130 260 L 170 330',
        pathDUmschalten: 'M 130 260 L 130 310',
        heatmapCoords: [{ x: 130, y: 240, r: 75 }],
        trainerAdviceMitBall: 'Für LM ist das Flankenlaufmuster typisch.',
        trainerAdviceGegenBall: 'Für LM ist das Einreihen in den 4er-Block Pflicht.',
        nodeCoords2D: { x: 130, y: 260 },
      },
      {
        positionKey: 'RM',
        positionLabel: 'Rechtes Mittelfeld (RM)',
        roleMitBall: 'Außenbahn-Sprint & Flanken',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Lange Sprintlinie Außenbahn',
        gegenBallPattern: 'Rückzug in die 4er-Mittelfeldkette',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 670 320 L 670 130',
        pathDGegenBall: 'M 670 260 L 630 330',
        pathDUmschalten: 'M 670 260 L 670 310',
        heatmapCoords: [{ x: 670, y: 240, r: 75 }],
        trainerAdviceMitBall: 'Für RM ist der Flügelvorstoß typisch.',
        trainerAdviceGegenBall: 'Für RM ist der Rückwärtssprint typisch.',
        nodeCoords2D: { x: 670, y: 260 },
      },
      {
        positionKey: 'ZM-L',
        positionLabel: 'Zentrales Mittelfeld Links (ZM-L)',
        roleMitBall: 'Pendelbewegung & Nachrücken',
        roleGegenBall: 'Kompaktes Verschieben & Zweikampf',
        mitBallPattern: 'Zirkulations- & Box-Entry Lauf',
        gegenBallPattern: 'Kompaktes Zentrumsschließen',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 310 340 L 310 200',
        pathDGegenBall: 'M 310 300 L 350 350',
        pathDUmschalten: 'M 310 300 L 310 250',
        heatmapCoords: [{ x: 310, y: 290, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-L ist das Nachrücken in den Strafraum typisch.',
        trainerAdviceGegenBall: 'Für ZM-L ist die Zweikampfführung im Zentrum typisch.',
        nodeCoords2D: { x: 310, y: 300 },
      },
      {
        positionKey: 'ZM-R',
        positionLabel: 'Zentrales Mittelfeld Rechts (ZM-R)',
        roleMitBall: 'Pendelbewegung & Ballverlagerung',
        roleGegenBall: 'Kompaktes Verschieben & Absicherung',
        mitBallPattern: 'Zirkulations- & Diagonallauf',
        gegenBallPattern: 'Kompaktes Zentrumsschließen',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 490 340 L 490 200',
        pathDGegenBall: 'M 490 300 L 450 350',
        pathDUmschalten: 'M 490 300 L 490 250',
        heatmapCoords: [{ x: 490, y: 290, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-R ist die Spielverlagerung typisch.',
        trainerAdviceGegenBall: 'Für ZM-R ist das Schließen der Passwege typisch.',
        nodeCoords2D: { x: 490, y: 300 },
      },
      {
        positionKey: 'LV',
        positionLabel: 'Linker Außenverteidiger (LV)',
        roleMitBall: 'Überlappung & Absicherung',
        roleGegenBall: 'Rückwärtssprint & Diagonales Verschieben',
        mitBallPattern: 'Außenbahn-Hinterlaufen',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 140 380 L 140 250',
        pathDGegenBall: 'M 140 380 L 180 430',
        pathDUmschalten: 'M 140 380 L 140 330',
        heatmapCoords: [{ x: 140, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für LV ist die Hinterlaufbewegung typisch.',
        trainerAdviceGegenBall: 'Für LV ist das Sichern der linken Kette typisch.',
        nodeCoords2D: { x: 140, y: 380 },
      },
      {
        positionKey: 'RV',
        positionLabel: 'Rechter Außenverteidiger (RV)',
        roleMitBall: 'Überlappung & Absicherung',
        roleGegenBall: 'Rückwärtssprint & Diagonales Verschieben',
        mitBallPattern: 'Außenbahn-Hinterlaufen',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 660 380 L 660 250',
        pathDGegenBall: 'M 660 380 L 620 430',
        pathDUmschalten: 'M 660 380 L 660 330',
        heatmapCoords: [{ x: 660, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für RV ist die Hinterlaufbewegung typisch.',
        trainerAdviceGegenBall: 'Für RV ist das Sichern der rechten Kette typisch.',
        nodeCoords2D: { x: 660, y: 380 },
      },
      {
        positionKey: 'IV-L',
        positionLabel: 'Innenverteidiger Links (IV-L)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Restverteidigung im Strafraum',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 290 420 L 230 420',
        pathDGegenBall: 'M 290 420 L 330 440',
        pathDUmschalten: 'M 290 420 L 290 400',
        heatmapCoords: [{ x: 280, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-L ist die breite Staffelung typisch.',
        trainerAdviceGegenBall: 'Für IV-L ist die Strafraumabsicherung typisch.',
        nodeCoords2D: { x: 290, y: 420 },
      },
      {
        positionKey: 'IV-R',
        positionLabel: 'Innenverteidiger Rechts (IV-R)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Restverteidigung im Strafraum',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 510 420 L 570 420',
        pathDGegenBall: 'M 510 420 L 470 440',
        pathDUmschalten: 'M 510 420 L 510 400',
        heatmapCoords: [{ x: 520, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-R ist die breite Staffelung typisch.',
        trainerAdviceGegenBall: 'Für IV-R ist die Strafraumabsicherung typisch.',
        nodeCoords2D: { x: 510, y: 420 },
      },
      {
        positionKey: 'TW',
        positionLabel: 'Torwart (TW)',
        roleMitBall: 'Spieleröffnung',
        roleGegenBall: 'Positionierung bei Kontern',
        mitBallPattern: 'Kurzer Schritt nach vorne',
        gegenBallPattern: 'Torlinienstellung',
        loadLevel: 'niedrig',
        strokeWidth: 3,
        pathDMitBall: 'M 400 460 L 400 440',
        pathDGegenBall: 'M 400 460 Q 380 465 420 465',
        pathDUmschalten: 'M 400 460 L 400 450',
        heatmapCoords: [{ x: 400, y: 460, r: 35 }],
        trainerAdviceMitBall: 'Für TW ist die geordnete Eröffnung typisch.',
        trainerAdviceGegenBall: 'Für TW ist das Stellungsspiel auf der Linie typisch.',
        nodeCoords2D: { x: 400, y: 460 },
      }
    ]
  },
  '3-4-3': {
    formation: '3-4-3',
    name: '3-4-3 Extrem-Offensiv & Total-Pressing',
    pressingHeight: 'Hoch',
    kompaktheit: 'Breit-Fächernd',
    offensiveFocus: '3 echte Spitzen überladen die Abwehrkette, Schienenläufer geben maximale Breite.',
    defensiveFocus: 'Hohes Angriffspressing mit 3 Spitzen, 3er Kette muss extrem mutig hochschieben.',
    positions: [
      {
        positionKey: 'ST',
        positionLabel: 'Stürmer (ST)',
        roleMitBall: 'Tiefenlauf hinter die Kette',
        roleGegenBall: 'Pressing-Auslöser auf IV',
        mitBallPattern: 'Explosiver Tiefenlauf ins Zentrum',
        gegenBallPattern: 'Direkter Anlauf auf IV-C',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 400 220 L 400 90',
        pathDGegenBall: 'M 400 110 L 360 180',
        pathDUmschalten: 'M 400 110 L 400 200',
        heatmapCoords: [{ x: 400, y: 100, r: 80 }],
        trainerAdviceMitBall: 'Für ST ist dieser brutale Tiefenlauf typisch.',
        trainerAdviceGegenBall: 'Für ST ist dieser aggressive Anlauf typisch.',
        nodeCoords2D: { x: 400, y: 110 },
      },
      {
        positionKey: 'LA',
        positionLabel: 'Linker Flügelstürmer (LA)',
        roleMitBall: 'Halbraum-Diagonallauf & Strafraumbewegung',
        roleGegenBall: 'Pressing & Flügelabsicherung',
        mitBallPattern: 'Cut-Inside in Zone 14',
        gegenBallPattern: 'Rückwärtssprint & Pressing',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 160 260 Q 240 180 340 130',
        pathDGegenBall: 'M 160 150 L 200 290',
        pathDUmschalten: 'M 160 150 L 250 240',
        heatmapCoords: [{ x: 260, y: 160, r: 75 }],
        trainerAdviceMitBall: 'Für LA ist dieser Einlauf typisch.',
        trainerAdviceGegenBall: 'Für LA ist das aggressive Zudrehen typisch.',
        nodeCoords2D: { x: 160, y: 150 },
      },
      {
        positionKey: 'RA',
        positionLabel: 'Rechter Flügelstürmer (RA)',
        roleMitBall: 'Halbraum-Diagonallauf & Strafraumbewegung',
        roleGegenBall: 'Pressing & Flügelabsicherung',
        mitBallPattern: 'Cut-Inside in Zone 14',
        gegenBallPattern: 'Rückwärtssprint & Pressing',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 640 260 Q 560 180 460 130',
        pathDGegenBall: 'M 640 150 L 600 290',
        pathDUmschalten: 'M 640 150 L 550 240',
        heatmapCoords: [{ x: 540, y: 160, r: 75 }],
        trainerAdviceMitBall: 'Für RA ist dieser Diagonallauf typisch.',
        trainerAdviceGegenBall: 'Für RA ist das Schließen der Schnittstelle typisch.',
        nodeCoords2D: { x: 640, y: 150 },
      },
      {
        positionKey: 'LM',
        positionLabel: 'Linker Schienenläufer (LM)',
        roleMitBall: 'Flügel-Aufrücken & Flanken',
        roleGegenBall: 'Rückwärtssprint & 5er-Kette',
        mitBallPattern: 'Flügel-Sprint bis Grundlinie',
        gegenBallPattern: 'Rückwärtssprint auf LV-Höhe',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 110 330 L 110 130',
        pathDGegenBall: 'M 110 290 L 150 420',
        pathDUmschalten: 'M 110 290 L 110 350',
        heatmapCoords: [{ x: 110, y: 260, r: 85 }],
        trainerAdviceMitBall: 'Für LM ist das permanente Hinterlaufen typisch.',
        trainerAdviceGegenBall: 'Für LM ist das tiefes Rückwärtslaufen Pflicht.',
        nodeCoords2D: { x: 110, y: 290 },
      },
      {
        positionKey: 'RM',
        positionLabel: 'Rechter Schienenläufer (RM)',
        roleMitBall: 'Flügel-Aufrücken & Flanken',
        roleGegenBall: 'Rückwärtssprint & 5er-Kette',
        mitBallPattern: 'Flügel-Sprint bis Grundlinie',
        gegenBallPattern: 'Rückwärtssprint auf RV-Höhe',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 690 330 L 690 130',
        pathDGegenBall: 'M 690 290 L 650 420',
        pathDUmschalten: 'M 690 290 L 690 350',
        heatmapCoords: [{ x: 690, y: 260, r: 85 }],
        trainerAdviceMitBall: 'Für RM ist die Flügeldominanz typisch.',
        trainerAdviceGegenBall: 'Für RM ist der tiefste Rückwärtssprint typisch.',
        nodeCoords2D: { x: 690, y: 290 },
      },
      {
        positionKey: 'ZM-L',
        positionLabel: 'Zentrales Mittelfeld Links (ZM-L)',
        roleMitBall: 'Pendelbewegung & Absicherung',
        roleGegenBall: 'Kompaktes Verschieben',
        mitBallPattern: 'Verteilungs- & Absicherungslauf',
        gegenBallPattern: 'Aggressives Pressing im Zentrum',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 310 380 L 310 240',
        pathDGegenBall: 'M 310 330 L 350 380',
        pathDUmschalten: 'M 310 330 L 310 280',
        heatmapCoords: [{ x: 310, y: 310, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-L ist das Balancieren typisch.',
        trainerAdviceGegenBall: 'Für ZM-L ist die Zentrumssperre typisch.',
        nodeCoords2D: { x: 310, y: 330 },
      },
      {
        positionKey: 'ZM-R',
        positionLabel: 'Zentrales Mittelfeld Rechts (ZM-R)',
        roleMitBall: 'Pendelbewegung & Absicherung',
        roleGegenBall: 'Kompaktes Verschieben',
        mitBallPattern: 'Verteilungs- & Absicherungslauf',
        gegenBallPattern: 'Aggressives Pressing im Zentrum',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 490 380 L 490 240',
        pathDGegenBall: 'M 490 330 L 450 380',
        pathDUmschalten: 'M 490 330 L 490 280',
        heatmapCoords: [{ x: 490, y: 310, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-R ist das Balancieren typisch.',
        trainerAdviceGegenBall: 'Für ZM-R ist die Zentrumssperre typisch.',
        nodeCoords2D: { x: 490, y: 330 },
      },
      {
        positionKey: 'IV-L',
        positionLabel: 'Innenverteidiger Links (IV-L)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Mutiges Rausrücken',
        mitBallPattern: 'Halbraum-Andribbeln',
        gegenBallPattern: 'Mutiges Raustreten',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 240 430 L 190 370',
        pathDGegenBall: 'M 240 430 L 280 440',
        pathDUmschalten: 'M 240 430 L 240 400',
        heatmapCoords: [{ x: 230, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-L ist das Mutige Passen typisch.',
        trainerAdviceGegenBall: 'Für IV-L ist das Raustreten im Zweikampf typisch.',
        nodeCoords2D: { x: 240, y: 430 },
      },
      {
        positionKey: 'IV-C',
        positionLabel: 'Zentraler Innenverteidiger (IV-C)',
        roleMitBall: 'Zentraler Aufbau',
        roleGegenBall: 'Absicherung & Kopfball',
        mitBallPattern: 'Spielverlagerung',
        gegenBallPattern: 'Letzte Absicherung',
        loadLevel: 'niedrig',
        strokeWidth: 3,
        pathDMitBall: 'M 370 430 L 430 430',
        pathDGegenBall: 'M 400 430 L 400 450',
        pathDUmschalten: 'M 400 430 L 400 410',
        heatmapCoords: [{ x: 400, y: 430, r: 85 }],
        trainerAdviceMitBall: 'Für IV-C ist die gelassene Steuerung typisch.',
        trainerAdviceGegenBall: 'Für IV-C ist der zentrale Riegel typisch.',
        nodeCoords2D: { x: 400, y: 430 },
      },
      {
        positionKey: 'IV-R',
        positionLabel: 'Innenverteidiger Rechts (IV-R)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Mutiges Rausrücken',
        mitBallPattern: 'Halbraum-Andribbeln',
        gegenBallPattern: 'Mutiges Raustreten',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 560 430 L 610 370',
        pathDGegenBall: 'M 560 430 L 520 440',
        pathDUmschalten: 'M 560 430 L 560 400',
        heatmapCoords: [{ x: 570, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-R ist das Mutige Passen typisch.',
        trainerAdviceGegenBall: 'Für IV-R ist das Raustreten im Zweikampf typisch.',
        nodeCoords2D: { x: 560, y: 430 },
      },
      {
        positionKey: 'TW',
        positionLabel: 'Torwart (TW)',
        roleMitBall: 'Spieleröffnung',
        roleGegenBall: 'Kastenabsicherung',
        mitBallPattern: 'Kurzer Schritt zur Anspielstation',
        gegenBallPattern: 'Torlinienstellung',
        loadLevel: 'niedrig',
        strokeWidth: 3,
        pathDMitBall: 'M 400 460 L 400 440',
        pathDGegenBall: 'M 400 460 Q 380 465 420 465',
        pathDUmschalten: 'M 400 460 L 400 450',
        heatmapCoords: [{ x: 400, y: 460, r: 35 }],
        trainerAdviceMitBall: 'Für TW ist die präzise Spieleröffnung typisch.',
        trainerAdviceGegenBall: 'Für TW ist die Konzentration im Kasten typisch.',
        nodeCoords2D: { x: 400, y: 460 },
      }
    ]
  },
  '4-1-4-1': {
    formation: '4-1-4-1',
    name: '4-1-4-1 Mittelfeld-Staffelung & Riegel',
    pressingHeight: 'Mittelhoch',
    kompaktheit: 'Extrem Kompakt',
    offensiveFocus: 'Einziger Stürmer kreuzt tief, 4er-Mittelfeld schiebt stufenweise nach, Anker-Sechser sichert voll ab.',
    defensiveFocus: '2 kompakte Blöcke vor dem eigenen Sechzehner, extrem schwer zu bespielen.',
    positions: [
      {
        positionKey: 'ST',
        positionLabel: 'Stürmer (ST)',
        roleMitBall: 'Tiefenlauf & Wandspieler',
        roleGegenBall: 'Pressing-Auslöser & Bälle abfangen',
        mitBallPattern: 'Zentraler Tiefenlauf & Halbraum-Festmachen',
        gegenBallPattern: 'Anlaufen der IVs & Passwege versperren',
        loadLevel: 'max',
        strokeWidth: 12,
        pathDMitBall: 'M 400 220 L 400 90',
        pathDGegenBall: 'M 400 110 L 350 180',
        pathDUmschalten: 'M 400 110 L 400 200',
        heatmapCoords: [{ x: 400, y: 110, r: 80 }],
        trainerAdviceMitBall: 'Für ST ist dieser isolierte Tiefenlauf typisch.',
        trainerAdviceGegenBall: 'Für ST ist das clevere Versperren der Schnittstellen typisch.',
        nodeCoords2D: { x: 400, y: 110 },
      },
      {
        positionKey: 'LM',
        positionLabel: 'Linkes Mittelfeld (LM)',
        roleMitBall: 'Außenbahn-Sprint & Flanken',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Flügel-Sprint an der Außenbahn',
        gegenBallPattern: 'Rückzug in die 4er-Mittelfeldkette',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 130 300 L 130 140',
        pathDGegenBall: 'M 130 230 L 170 310',
        pathDUmschalten: 'M 130 230 L 130 290',
        heatmapCoords: [{ x: 130, y: 220, r: 75 }],
        trainerAdviceMitBall: 'Für LM ist der Flügelvorstoß typisch.',
        trainerAdviceGegenBall: 'Für LM ist der Disziplin-Rückzug typisch.',
        nodeCoords2D: { x: 130, y: 230 },
      },
      {
        positionKey: 'RM',
        positionLabel: 'Rechtes Mittelfeld (RM)',
        roleMitBall: 'Außenbahn-Sprint & Flanken',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Flügel-Sprint an der Außenbahn',
        gegenBallPattern: 'Rückzug in die 4er-Mittelfeldkette',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 670 300 L 670 140',
        pathDGegenBall: 'M 670 230 L 630 310',
        pathDUmschalten: 'M 670 230 L 670 290',
        heatmapCoords: [{ x: 670, y: 220, r: 75 }],
        trainerAdviceMitBall: 'Für RM ist der Flügelvorstoß typisch.',
        trainerAdviceGegenBall: 'Für RM ist der Disziplin-Rückzug typisch.',
        nodeCoords2D: { x: 670, y: 230 },
      },
      {
        positionKey: 'ZM-L',
        positionLabel: 'Zentrales Mittelfeld Links (ZM-L)',
        roleMitBall: 'Vorstoß & Verbindungsspiel',
        roleGegenBall: 'Kompaktes Verschieben',
        mitBallPattern: 'Vorstoß in Zone 14',
        gegenBallPattern: 'Kompaktes Schließen des Halbraums',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 290 300 L 290 170',
        pathDGegenBall: 'M 290 240 L 330 310',
        pathDUmschalten: 'M 290 240 L 290 270',
        heatmapCoords: [{ x: 290, y: 230, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-L ist das Nachrücken an den Sechzehner typisch.',
        trainerAdviceGegenBall: 'Für ZM-L ist das Verdichten des Raums typisch.',
        nodeCoords2D: { x: 290, y: 240 },
      },
      {
        positionKey: 'ZM-R',
        positionLabel: 'Zentrales Mittelfeld Rechts (ZM-R)',
        roleMitBall: 'Vorstoß & Verbindungsspiel',
        roleGegenBall: 'Kompaktes Verschieben',
        mitBallPattern: 'Vorstoß in Zone 14',
        gegenBallPattern: 'Kompaktes Schließen des Halbraums',
        loadLevel: 'hoch',
        strokeWidth: 8,
        pathDMitBall: 'M 510 300 L 510 170',
        pathDGegenBall: 'M 510 240 L 470 310',
        pathDUmschalten: 'M 510 240 L 510 270',
        heatmapCoords: [{ x: 510, y: 230, r: 75 }],
        trainerAdviceMitBall: 'Für ZM-R ist der Vorstoß in die Spitze typisch.',
        trainerAdviceGegenBall: 'Für ZM-R ist das Schließen der Lücken typisch.',
        nodeCoords2D: { x: 510, y: 240 },
      },
      {
        positionKey: 'DM',
        positionLabel: 'Anker-Sechser (DM)',
        roleMitBall: 'Tiefe Zirkulation & Absicherung',
        roleGegenBall: 'Alleiniger Riegel vor der 4er-Kette',
        mitBallPattern: 'Horizontale Pendelbewegung',
        gegenBallPattern: 'Absichern der Zone 14',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 340 370 L 460 370',
        pathDGegenBall: 'M 350 350 L 450 350',
        pathDUmschalten: 'M 400 350 L 400 330',
        heatmapCoords: [{ x: 400, y: 350, r: 85 }],
        trainerAdviceMitBall: 'Für DM ist das geduldige Abkippen typisch.',
        trainerAdviceGegenBall: 'Für DM ist das kompromisslose Verriegeln typisch.',
        nodeCoords2D: { x: 400, y: 350 },
      },
      {
        positionKey: 'LV',
        positionLabel: 'Linker Außenverteidiger (LV)',
        roleMitBall: 'Überlappung & Diagonales Verschieben',
        roleGegenBall: 'Rückwärtssprint & Flügelabsicherung',
        mitBallPattern: 'Vorstoß über den Flügel',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 140 380 L 140 250',
        pathDGegenBall: 'M 140 380 L 180 430',
        pathDUmschalten: 'M 140 380 L 140 330',
        heatmapCoords: [{ x: 140, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für LV ist das disziplinierte Hinterlaufen typisch.',
        trainerAdviceGegenBall: 'Für LV ist die Flügelabsicherung Pflicht.',
        nodeCoords2D: { x: 140, y: 380 },
      },
      {
        positionKey: 'RV',
        positionLabel: 'Rechter Außenverteidiger (RV)',
        roleMitBall: 'Überlappung & Diagonales Verschieben',
        roleGegenBall: 'Rückwärtssprint & Diagonales Verschieben',
        mitBallPattern: 'Vorstoß über den Flügel',
        gegenBallPattern: 'Diagonales Einrücken',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 660 380 L 660 250',
        pathDGegenBall: 'M 660 380 L 620 430',
        pathDUmschalten: 'M 660 380 L 660 330',
        heatmapCoords: [{ x: 660, y: 330, r: 65 }],
        trainerAdviceMitBall: 'Für RV ist das disziplinierte Hinterlaufen typisch.',
        trainerAdviceGegenBall: 'Für RV ist die Flügelabsicherung Pflicht.',
        nodeCoords2D: { x: 660, y: 380 },
      },
      {
        positionKey: 'IV-L',
        positionLabel: 'Innenverteidiger Links (IV-L)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Kompakte Restverteidigung',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 290 420 L 230 420',
        pathDGegenBall: 'M 290 420 L 330 440',
        pathDUmschalten: 'M 290 420 L 290 400',
        heatmapCoords: [{ x: 280, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-L ist die ruhige Ballabgabe typisch.',
        trainerAdviceGegenBall: 'Für IV-L ist das sichere Klären typisch.',
        nodeCoords2D: { x: 290, y: 420 },
      },
      {
        positionKey: 'IV-R',
        positionLabel: 'Innenverteidiger Rechts (IV-R)',
        roleMitBall: 'Aufbaubewegung',
        roleGegenBall: 'Blockverhalten & Restverteidigung',
        mitBallPattern: 'Aufbaupass nach außen',
        gegenBallPattern: 'Kompakte Restverteidigung',
        loadLevel: 'mittel',
        strokeWidth: 5,
        pathDMitBall: 'M 510 420 L 570 420',
        pathDGegenBall: 'M 510 420 L 470 440',
        pathDUmschalten: 'M 510 420 L 510 400',
        heatmapCoords: [{ x: 520, y: 420, r: 75 }],
        trainerAdviceMitBall: 'Für IV-R ist die ruhige Ballabgabe typisch.',
        trainerAdviceGegenBall: 'Für IV-R ist das sichere Klären typisch.',
        nodeCoords2D: { x: 510, y: 420 },
      },
      {
        positionKey: 'TW',
        positionLabel: 'Torwart (TW)',
        roleMitBall: 'Spieleröffnung',
        roleGegenBall: 'Positionierung bei Kontern',
        mitBallPattern: 'Kurzer Schritt zur Anspielstation',
        gegenBallPattern: 'Grundstellung Torlinie',
        loadLevel: 'niedrig',
        strokeWidth: 3,
        pathDMitBall: 'M 400 460 L 400 440',
        pathDGegenBall: 'M 400 460 Q 380 465 420 465',
        pathDUmschalten: 'M 400 460 L 400 450',
        heatmapCoords: [{ x: 400, y: 460, r: 35 }],
        trainerAdviceMitBall: 'Für TW ist die strukturierte Eröffnung typisch.',
        trainerAdviceGegenBall: 'Für TW ist die Stellung auf der Linie typisch.',
        nodeCoords2D: { x: 400, y: 460 },
      }
    ]
  }
};

// Formations Comparison Analysis Matrix Engine
export function compareFormations(
  fromForm: TacticalFormation,
  toForm: TacticalFormation
): FormationComparison {
  const fromData = FORMATION_REPOSITORY[fromForm] || FORMATION_REPOSITORY['4-4-2'];
  const toData = FORMATION_REPOSITORY[toForm] || FORMATION_REPOSITORY['4-4-2'];

  const mitBallChanges: string[] = [];
  const gegenBallChanges: string[] = [];
  const roleChanges: string[] = [];
  const loadChanges: string[] = [];

  // Pressing Height Change
  let pressingHeightChange = `Pressinghöhe bleibt auf Niveau ${toData.pressingHeight}.`;
  if (fromData.pressingHeight !== toData.pressingHeight) {
    pressingHeightChange = `Pressinghöhe verändert sich von "${fromData.pressingHeight}" zu "${toData.pressingHeight}".`;
  }

  // Kompaktheit Change
  let kompaktheitChange = `Spielfeld-Kompaktheit bleibt ${toData.kompaktheit}.`;
  if (fromData.kompaktheit !== toData.kompaktheit) {
    kompaktheitChange = `Spielfeld-Kompaktheit ändert sich von "${fromData.kompaktheit}" zu "${toData.kompaktheit}".`;
  }

  // Tactical Shift Details
  mitBallChanges.push(`Fokus Offensiv: ${toData.offensiveFocus}`);
  gegenBallChanges.push(`Fokus Defensiv: ${toData.defensiveFocus}`);

  if (toForm.startsWith('3-')) {
    roleChanges.push('3er-Kette hinten: Die IVs müssen breiter fächern und mutig im Halbraum andribbeln.');
    loadChanges.push('Schienenläufer (LM/RM) tragen die MAXIMALE Laufbelastung auf der Außenbahn.');
  } else {
    roleChanges.push('4er-Kette hinten: Außenverteidiger überlappen stufenweise, IVs sichern kompakt ab.');
    loadChanges.push('Flügelstürmer und Achser teilen sich die Sprintdistanzen gleichmäßig auf.');
  }

  if (toForm === '4-2-3-1') {
    roleChanges.push('OM besetzt die Zone 14 als Spielmacher. Doppel-Sechs sichert das Zentrum voll ab.');
    mitBallChanges.push('Gezieltes Verbindungsspiel über den 10er in die Halbräume.');
  } else if (toForm === '3-4-3') {
    roleChanges.push('3 echte Spitzen setzen den gegnerischen Spielaufbau sofort unter Dauerdruck.');
    loadChanges.push('Angriffstrio hat maximale Belastung im Gegenpressing.');
  }

  const summaryText = `Wechsel von ${fromForm} zu ${toForm}: ${mitBallChanges.join(' ')} ${gegenBallChanges.join(' ')}`;

  return {
    fromFormation: fromForm,
    toFormation: toForm,
    mitBallChanges,
    gegenBallChanges,
    roleChanges,
    loadChanges,
    pressingHeightChange,
    kompaktheitChange,
    summaryText
  };
}

// TACTICAL PHILOSOPHIES REPOSITORY (Guardiola, Klopp, Nagelsmann, Tuchel, Simeone)
export const TACTICAL_PHILOSOPHIES: Record<TacticalPhilosophy, {
  name: string;
  iconLabel: string;
  motto: string;
  coreFocus: string;
  mitBallGuidance: string;
  gegenBallGuidance: string;
  umschaltGuidance: string;
}> = {
  positionsspiel: {
    name: 'Positionsspiel (Guardiola)',
    iconLabel: 'Raumkontrolle & Dreiecke',
    motto: 'Geduld, Ballbesitz & kontinuierliche Pass-Triangulation im Halbraum.',
    coreFocus: 'Strikte Disziplin auf Positionen, Erzeugung von Freiräumen durch Überzahl.',
    mitBallGuidance: 'TW schiebt weit mit auf. IVs ziehen breit. DM bildet Drehpunkt. ZMs und Flügel kreieren Dreiecke.',
    gegenBallGuidance: 'Restverteidigung hoch ansetzen. Sofortiges Zustellen der nahen Anspielstationen.',
    umschaltGuidance: 'Nach Ballgewinn: Erstes Anspiel sichern, nicht überhasten, Spielfeld verlagern.'
  },
  umschaltspiel: {
    name: 'Umschaltspiel (Klopp)',
    iconLabel: 'Vertikale Dynamik',
    motto: 'Vollgas-Fußball: Bei Ballgewinn vertikal in unter 6 Sekunden zum Abschluss.',
    coreFocus: 'Explosive Tiefenläufe von ST, LA, RA und nachrückenden 8ern.',
    mitBallGuidance: 'Schnelle flache Vertikalpässe in die Schnittstellen der Abwehrkette.',
    gegenBallGuidance: 'Kompaktes Mittelfeld-Pressing mit Einladungsfalle auf den gegnerischen Flügel.',
    umschaltGuidance: 'Bei Ballgewinn: Flügel & ST starten sofort steil in den Rücken der gegnerischen IVs.'
  },
  gegenpressing: {
    name: 'Gegenpressing (Nagelsmann)',
    iconLabel: 'Jagd auf Ballverlust',
    motto: 'Der beste Spielmacher ist der Ballgewinn im Angriffsdrittel.',
    coreFocus: 'Keine Sekunde Abschalten – Nach Ballverlust bilden 3-4 Spieler den Jagd-Ring.',
    mitBallGuidance: 'Enge Abstände behalten, um bei Ballverlust sofort zugreifen zu können.',
    gegenBallGuidance: 'Extrem hohes Angriffspressing, gegnerischen TW zum langen Ball zwingen.',
    umschaltGuidance: 'Bei Ballverlust: Sofortiger Schwarm-Druck auf den Ballführenden in unter 3 Sekunden.'
  },
  fluegelueberladung: {
    name: 'Flügelüberladung (Tuchel)',
    iconLabel: 'Überzahl & Verlagerung',
    motto: 'Auf einer Seite verengen und überladen, dann schlagartig verlagern.',
    coreFocus: 'AV + ZM + RA/LA kreieren 3v2 am Flügel, um Räume für den schwachen Flügel zu öffnen.',
    mitBallGuidance: 'Kurzpassspiel am ballnahen Flügel. Schwacher Flügelstürmer zieht kopfballstark in die Box.',
    gegenBallGuidance: 'Ballseitiges Verschieben mit maximaler Kompaktheit, schwache Seite rückt bis zur Mitte nach.',
    umschaltGuidance: 'Bei Ballgewinn: Sofortiger Flugball oder diagonale Verlagerung auf die isolierte Seite.'
  },
  kompaktheit: {
    name: 'Kompaktheit (Simeone)',
    iconLabel: 'Bollwerk & Disziplin',
    motto: 'Kein Durchkommen im Zentrum. Extrem enge Linien und Disziplin.',
    coreFocus: 'Blockabstand von max. 12-15m zwischen den 3 Reihen. Null Raum für gegnerische 10er.',
    mitBallGuidance: 'Gezielter langer Ball auf ST mit schnellem Nachrücken auf den zweiten Ball.',
    gegenBallGuidance: 'Tiefes oder Mittelfeld-Bollwerk. Alle 10 Feldspieler hinter dem Ball.',
    umschaltGuidance: 'Bei Ballverlust: Blitzschneller geordneter Rückzug auf die 16m-Linie.'
  }
};

// BUILD-UP VARIANTS REPOSITORY (EXACTLY 4 VARIANTS)
export const BUILD_UP_VARIANTS: Record<BuildUpVariant, {
  name: string;
  keyPlayers: string;
  tacticalGoal: string;
  recommendation: string;
}> = {
  'av_fluegel': {
    name: '1. Aufbau über die Außenverteidiger',
    keyPlayers: 'LV, RV, TW, IV-L, IV-R',
    tacticalGoal: 'Spielaufbau über die Außenverteidiger, die an der Seitenlinie hochschieben und den Flügel ansteuern.',
    recommendation: 'AV schiebt mutig hoch, Flügelstürmer zieht in den Halbraum, um Passweg freizumachen.'
  },
  'sechzehner': {
    name: '2. Aufbau im Sechzehner',
    keyPlayers: 'TW, IV-L, IV-R, DM',
    tacticalGoal: 'Kurzes, ruhiges Kombinationsspiel direkt im eigenen Sechzehnmeterraum zur Überwindung des ersten Pressingblocks.',
    recommendation: 'TW agiert als zusätzlicher Passgeber, IVs lassen sich tief an die Grundlinie fallen.'
  },
  'sechser': {
    name: '3. Aufbau über die Sechser',
    keyPlayers: 'DM, ZM-L, ZM-R, IV',
    tacticalGoal: 'Zentraler Spielaufbau über die 6er-Position als Drehpunkt zur Raum- & Spielverlagerung.',
    recommendation: 'Sechser fordert den Ball zwischen den gegnerischen Linien und verteilt flach in die Spitze.'
  },
  'fluegel_lang': {
    name: '4. Aufbau über den Außenspieler, der den langen Ball auf den Flügel spielt',
    keyPlayers: 'Außenspieler (LV/RV/LM/RM), ST, Flügel',
    tacticalGoal: 'Aufbau über den Außenspieler, der mit einem präzisen langen Flugball auf den gegnerischen Flügel verlagert.',
    recommendation: 'Außenspieler blickt auf und schlägt den gezielten Diagonalball hinter die gegnerische Abwehrkette.'
  }
};

export interface SetPieceVariant {
  id: string;
  category: 'Ecke' | 'Freistoß' | 'Einwurf';
  name: string;
  erfolgsquote: number; // percentage e.g. 42
  torgefahrLevel: 'Sehr Hoch' | 'Hoch' | 'Mittel';
  executionSteps: string[];
  targetZone: string;
  participatingPositions: string[];
  trainerNote: string;
}

export const SET_PIECES_DATABASE: SetPieceVariant[] = [
  {
    id: 'ecke_kurz',
    category: 'Ecke',
    name: '1. Kurze Ecke mit 2v1 Überzahl & Rückraum-Drop',
    erfolgsquote: 44,
    torgefahrLevel: 'Sehr Hoch',
    executionSteps: [
      'RA fordert den Ball an der Eckfahne kurz an.',
      'OM läuft entgegen und kreiert sofort eine 2v1 Überzahl gegen den gegnerischen Außenverteidiger.',
      'Doppelpass & flacher Rückpass an die 16m-Kante auf den nachrückenden 8er (ZM-L) zum Platzierungsschuss.'
    ],
    targetZone: 'Rückraum Zone 14 (16m-Linie)',
    participatingPositions: ['RA', 'OM', 'ZM-L', 'ST'],
    trainerNote: 'Besonders effektiv gegen tiefstehende Teams mit vielen großen Kopfballspielern im Fünfmeterraum.'
  },
  {
    id: 'ecke_2pfosten',
    category: 'Ecke',
    name: '2. Schnittstellen-Flanke auf den 2. Pfosten',
    erfolgsquote: 48,
    torgefahrLevel: 'Sehr Hoch',
    executionSteps: [
      'IV-L und IV-R starten von der 16m-Linie im gegengleichen Lauf in den Fünfmeterraum.',
      'IV-L zieht den gegnerischen Innenverteidiger am 1. Pfosten auf sich.',
      'Scharfe Schnittstellen-Flanke mit Schnitt vom Tor weg auf den heranbrausenden kopfballstarken ST am 2. Pfosten.'
    ],
    targetZone: 'Fünfmeterraum / 2. Pfosten',
    participatingPositions: ['ST', 'IV-L', 'IV-R', 'LA'],
    trainerNote: 'Standardschütze schlägt den Ball mit Drall vom Tor weg, damit der Torwart auf der Linie gebunden bleibt.'
  },
  {
    id: 'freistoss_mauer',
    category: 'Freistoß',
    name: '3. Einstudierte Mauer-Lücke & Chip-Pass hinter Kette',
    erfolgsquote: 52,
    torgefahrLevel: 'Sehr Hoch',
    executionSteps: [
      '2 eigene Spieler (LA & OM) stellen sich direkt vor die gegnerische Mauer und lösen sich im Moment des Anlaufs.',
      'Schütze täuscht Torschuss an, chippt den Ball stattdessen über die Mauer in den Lauf von ST.',
      'ST schließt direkt volley aus 8 Metern ab.'
    ],
    targetZone: 'Strafraumzentrum (8m vor dem Tor)',
    participatingPositions: ['ST', 'LA', 'OM', 'ZM-R'],
    trainerNote: 'Perfekt bei Freistößen aus 20-25m Torentfernung in zentraler Position.'
  },
  {
    id: 'einwurf_lang',
    category: 'Einwurf',
    name: '4. Katapult-Einwurf in den Strafraum & Verlängerung',
    erfolgsquote: 38,
    torgefahrLevel: 'Hoch',
    executionSteps: [
      'LV nimmt langen Anlauf an der Seitenlinie.',
      'ST blockt den gegnerischen IV frei, damit IV-R oder ST am 1. Pfosten per Kopf ins Zentrum verlängern kann.',
      'Nachrückender RA schließt am 2. Pfosten ab.'
    ],
    targetZone: '1. Pfosten / Fünfmeterkante',
    participatingPositions: ['LV', 'ST', 'IV-R', 'RA'],
    trainerNote: 'Setzt maximale physische Präsenz und genaues Timing beim Kopfball-Drop voraus.'
  }
];

export interface PlayerScoutingProfile {
  positionKey: string;
  playerName: string;
  matchRating: number;
  runDistanceKm: number;
  passAccuracyPct: number;
  tackleWinPct: number;
  sprintsCount: number;
  marketValueEstimate: string;
  topStrengths: string[];
  webScoutingInsights: string;
  level3MandatorySentence: string;
}

export function generatePlayerScoutingProfile(positionKey: string, squadPlayers: any[] = []): PlayerScoutingProfile {
  const matchingPlayer = squadPlayers.find(p => p.position?.toUpperCase() === positionKey || p.name?.includes(positionKey));
  const name = matchingPlayer ? `${matchingPlayer.firstName || ''} ${matchingPlayer.lastName || matchingPlayer.name}`.trim() : `FC Auggen ${positionKey}-Spezialist`;
  
  const seed = positionKey.charCodeAt(0) + (positionKey.charCodeAt(1) || 0);
  const rating = Math.round((7.8 + (seed % 15) / 10) * 10) / 10;
  const dist = Math.round((10.2 + (seed % 22) / 10) * 10) / 10;
  const pass = Math.round(78 + (seed % 18));
  const tackle = Math.round(58 + (seed % 32));
  const sprints = 18 + (seed % 16);

  const level3Sentence = `Für die Position [${positionKey}] ist diese Laufbewegung typisch und entspricht dem Verbandsliga-Anforderungsprofil des FC Auggen.`;

  return {
    positionKey,
    playerName: name,
    matchRating: Math.min(9.8, rating),
    runDistanceKm: dist,
    passAccuracyPct: pass,
    tackleWinPct: tackle,
    sprintsCount: sprints,
    marketValueEstimate: `${120 + (seed % 200)}k €`,
    topStrengths: [
      'Hohe Umschaltgeschwindigkeit & Antritt',
      'Taktisches Raumverständnis & Vororientierung',
      'Passgenauigkeit unter Pressingdruck'
    ],
    webScoutingInsights: `Erhöhte Laufleistungsdaten im Bereich High-Intensity-Sprints. Sehr hohe Effizienz im Ballbesitzspiel.`,
    level3MandatorySentence: level3Sentence
  };
}

export interface ProTrainerAnalysisResult {
  formation: TacticalFormation;
  phase: GamePhase;
  philosophy: TacticalPhilosophy;
  buildUpVariant: BuildUpVariant;
  selectedPosition: string;
  mitBallSummary: string;
  gegenBallSummary: string;
  umschaltSummary: string;
  loadProfileSummary: string;
  philosophyDetails: {
    name: string;
    motto: string;
    mitBall: string;
    gegenBall: string;
    umschalt: string;
  };
  buildUpDetails: {
    name: string;
    goal: string;
    recommendation: string;
  };
  recommendations: string[];
  level3Sentence: string;
}

export function generateProTrainerAnalysis(
  formation: TacticalFormation,
  phase: GamePhase,
  philosophy: TacticalPhilosophy,
  buildUpVariant: BuildUpVariant,
  selectedPosition: string
): ProTrainerAnalysisResult {
  const formDetails = FORMATION_REPOSITORY[formation] || FORMATION_REPOSITORY['4-4-2'];
  const philDetails = TACTICAL_PHILOSOPHIES[philosophy] || TACTICAL_PHILOSOPHIES['positionsspiel'];
  const buDetails = BUILD_UP_VARIANTS[buildUpVariant] || BUILD_UP_VARIANTS['av_fluegel'];

  const posData = formDetails.positions.find(p => p.positionKey === selectedPosition) || formDetails.positions[0];

  const mitBallSummary = `Im ${formation} mit Philosophie "${philDetails.name}": ${formDetails.offensiveFocus} Variante: ${buDetails.name}. Goal: ${buDetails.tacticalGoal}`;
  const gegenBallSummary = `Gegen den Ball (${philDetails.name}): ${formDetails.defensiveFocus} Pressinghöhe: ${formDetails.pressingHeight}. ${philDetails.gegenBallGuidance}`;
  const umschaltSummary = `Umschaltphase: ${philDetails.umschaltGuidance} Bei Ballgewinn/Ballverlust agiert das Kollektiv geschlossen.`;

  const loadProfileSummary = `Position ${posData.positionLabel}: Belastungsstufe ${posData.loadLevel.toUpperCase()} (${posData.strokeWidth}px Linienstärke). Rolle: ${posData.roleMitBall}.`;

  const recommendations = [
    buDetails.recommendation,
    `Bei Gegenpressing: DM muss sofort Druck auf den Ballführenden ausüben.`,
    `Bei Kompaktheit: Zentrale enger halten und blockweise verschieben.`,
    `Für Position ${posData.positionKey}: ${phase === 'mit_ball' ? posData.trainerAdviceMitBall : posData.trainerAdviceGegenBall}`
  ];

  const level3Sentence = `Für die Position ${selectedPosition} ist diese Laufbewegung im ${formation} typisch.`;

  return {
    formation,
    phase,
    philosophy,
    buildUpVariant,
    selectedPosition,
    mitBallSummary,
    gegenBallSummary,
    umschaltSummary,
    loadProfileSummary,
    philosophyDetails: {
      name: philDetails.name,
      motto: philDetails.motto,
      mitBall: philDetails.mitBallGuidance,
      gegenBall: philDetails.gegenBallGuidance,
      umschalt: philDetails.umschaltGuidance
    },
    buildUpDetails: {
      name: buDetails.name,
      goal: buDetails.tacticalGoal,
      recommendation: buDetails.recommendation
    },
    recommendations,
    level3Sentence
  };
}

