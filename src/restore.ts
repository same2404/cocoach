import { savePlayer, saveTraining } from "./services/firestore";
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';

// Kompletter Daten-Restore inklusive aller detaillierten Trainingseinheiten
export const completeRestoreData = {
  exportDate: "2026-08-12T08:40:42.766Z",
  system: "CoCoach Analyse-System",

  // 1. Spieler
  players: [
    {
      id: "10",
      name: "Jonathan Ehret Jo",
      firstName: "Jonathan",
      lastName: "Ehret Jo",
      nummer: 10,
      number: 10,
      position: "OM",
      status: "Aktiv",
      telefon: "0171-9349247",
      email: "ehretjonathan00@gmail.com",
      adresse: "Hauptstraße 57 79424 Auggen",
      geburtsdatum: "19.05.2000",
      einsatzzeitenGesamt: 90,
      finance: { baseSalary: 400, salaryBase: 400, months: 10, seasonExtra: 800, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreementAmount: 0, sideAgreements: "" },
      physical: { weight: 80, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "11",
      name: "Julian Ehret Ju",
      firstName: "Julian",
      lastName: "Ehret Ju",
      nummer: 11,
      number: 11,
      position: "ZM",
      status: "Aktiv",
      telefon: "0151-72402146",
      email: "jueh11.je@gmail.com",
      adresse: "Ortsstr. 21b 79424 Auggen ",
      geburtsdatum: "11.03.2003",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 600, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 76, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "13",
      name: "Steffen Reinecker",
      firstName: "Steffen",
      lastName: "Reinecker",
      nummer: 13,
      number: 13,
      position: "IV",
      status: "Aktiv",
      telefon: "0171-5164497",
      email: "steffen@sektkellerei-reinecker.de",
      adresse: "Blauenblickstraße 11 79424 Auggen",
      geburtsdatum: "05.07.1991",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 0, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 80, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "17",
      name: "David Valchuk",
      firstName: "David",
      lastName: "Valchuk",
      nummer: 15,
      number: 15,
      position: "ZM",
      status: "Aktiv",
      telefon: "0151-24147960",
      email: "valcukdavid@gmail.com",
      adresse: "Zinkmattenstraße 18 79108 Freiburg",
      geburtsdatum: "16.08.2006",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 76, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774352325883",
      name: "Maximilian Disch",
      firstName: "Maximilian",
      lastName: "Disch",
      nummer: 21,
      number: 21,
      position: "IV",
      status: "Aktiv",
      telefon: "0174-1999864",
      email: "disch.maximilian@gmail.com",
      adresse: "Alte Poststraße 28a 79379 Müllheim",
      geburtsdatum: "20.07.2002",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 250, salaryBase: 250, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "12 Monate " },
      physical: { weight: 75, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774353082308",
      name: "Francisco Pereira Marques",
      firstName: "Francisco",
      lastName: "Pereira Marques",
      nummer: 8,
      number: 8,
      position: "DM",
      status: "Verletzt",
      telefon: "0174-9010249",
      email: "f.marques@outlook.de",
      adresse: "Eschholzstr. 11 79106 Freiburg ",
      geburtsdatum: "20.02.2005",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 150, months: 10, seasonExtra: 700, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 69, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774353199979",
      name: "Tim Schäfer",
      firstName: "Tim",
      lastName: "Schäfer",
      nummer: 17,
      number: 17,
      position: "ZDM",
      status: "Aktiv",
      telefon: "0155-60536817",
      email: "tim.schaefer1901@gmail.com",
      adresse: "Burgunderstr. 24 79379 Müllheim",
      geburtsdatum: "19.01.2004",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 76, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774353406268",
      name: "Jack AKUEGWU",
      firstName: "Jack",
      lastName: "AKUEGWU",
      nummer: 29,
      number: 29,
      position: "st",
      status: "Aktiv",
      telefon: "0151-65169775",
      email: "jackakuegwu@gmail.com",
      adresse: "Warmbacher Straße 54 79618 Rheinfelden ",
      geburtsdatum: "23.11.2005",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 100, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 95, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774353522982",
      name: "Thai Bao Nguyen",
      firstName: "Thai",
      lastName: "Bao Nguyen",
      nummer: 20,
      number: 20,
      position: "LM/RM",
      status: "Aktiv",
      telefon: "0176-80120976",
      email: "bao12495@gmail.com",
      adresse: "Wintersbuckstr. 51 79539 Lörrach",
      geburtsdatum: "05.10.2005",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 150, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 55, height: 165, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774509700375",
      name: "Tim Tiedemann",
      firstName: "Tim",
      lastName: "Tiedemann",
      nummer: 9,
      number: 9,
      position: "st/ZOM/RM",
      status: "Aktiv",
      telefon: "0152-25693718",
      email: "tim.tiedemann10@gmail.com",
      adresse: "Alte Poststr. 25 79597 Schallbach ",
      geburtsdatum: "26.06.2004",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 100, salaryBase: 150, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 77, height: 180, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1774513370994",
      name: "Giuliano Scalici",
      firstName: "Giuliano",
      lastName: "Scalici",
      nummer: 8,
      number: 8,
      position: "ZM/ZOM/LF",
      status: "Aktiv",
      telefon: "0177-5016909",
      email: "giulianoscalici06@gmail.com",
      adresse: "Jeremias-Gmelin-Str. 1b 79424 Auggen",
      geburtsdatum: "10.09.2006",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 150, salaryBase: 150, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "2x250€ über Prämien " },
      physical: { weight: 71, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776370685547",
      name: "Daniels Ontuzans",
      firstName: "Daniels",
      lastName: "Ontuzans",
      nummer: 22,
      number: 22,
      position: "LF",
      status: "Aktiv",
      telefon: "0152-24586215",
      email: "ontuzans@web.de",
      adresse: "Altinger Str. 20a 79418 Schliengen ",
      geburtsdatum: "07.03.2000",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 450, salaryBase: 450, months: 12, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "300€ Monatlich Sponsor  zusätzlich / Prämien werden Monatlich ausbezahlt" },
      physical: { weight: 80, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776405617838",
      name: "Yanik Roth Y",
      firstName: "Yanik",
      lastName: "Roth Y",
      nummer: 24,
      number: 24,
      position: "ZM/ZOM/LF/RF",
      status: "Aktiv",
      telefon: "0174-4573642",
      email: "yanik.roth@gmx.de",
      adresse: "Astrid-Lindgren-Str. 2 79100 Freiburg",
      geburtsdatum: "28.07.2002",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 150, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 74, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776405809408",
      name: "Matti Roth M",
      firstName: "Matti",
      lastName: "Roth M",
      nummer: 28,
      number: 28,
      position: "ZDM/ZM",
      status: "Aktiv",
      telefon: "0163-2664937",
      email: "mattiroth@gmx.de",
      adresse: "Astrid-Lindgren-Str. 2 79100 Freiburg",
      geburtsdatum: "18.11.2003",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 150, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 75, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776411907189",
      name: "Fabian Rufer",
      firstName: "Fabian",
      lastName: "Rufer",
      nummer: 12,
      number: 12,
      position: "TW",
      status: "Aktiv",
      telefon: "0170-3878780",
      email: "ruferfabian@gmail.com",
      adresse: "Am Hagschutz 1/2 79418 Schliengen ",
      geburtsdatum: "20.06.2007",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 84, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776620686292",
      name: "Luka Misic",
      firstName: "Luka",
      lastName: "Misic",
      nummer: 1,
      number: 1,
      position: "TW",
      status: "Aktiv",
      telefon: "0176-23654538",
      email: "lukaeliasmisic0@gmail.com",
      adresse: "Katharina-von-Bora-Straße 56",
      geburtsdatum: "04.04.2004",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 250, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 80, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1776621192537",
      name: "Said Souleymané",
      firstName: "Said",
      lastName: "Souleymané",
      nummer: 14,
      number: 14,
      position: "IV",
      status: "Aktiv",
      telefon: "0176-32227543",
      email: "saidsouleymane4243@gmail.com",
      adresse: "Belchenstr.32",
      geburtsdatum: "30.03.2004",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 300, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 80, height: 0, bodyFat: 0, strongFoot: "Links" }
    },
    {
      id: "1776708944690",
      name: "Sabahudin Ismaili",
      firstName: "Sabahudin",
      lastName: "Ismaili",
      nummer: 19,
      number: 19,
      position: "ZDM/ZM",
      status: "Aktiv",
      telefon: "0160-93876806",
      email: "sabahudin79@icloud.com",
      adresse: "Nonnenholzstr. 7/6 79576 Weil am Rhein",
      geburtsdatum: "20.02.2007",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 78, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1780331046568",
      name: "Lenny Reichert",
      firstName: "Lenny",
      lastName: "Reichert",
      nummer: 40,
      number: 40,
      position: "LV/MF",
      status: "Aktiv",
      telefon: "0152-55765226",
      email: "lereich27@gmail.com",
      adresse: "Salomon-Seligmann-Weg 30 79379 Müllheim ",
      geburtsdatum: "27.12.2007",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 74, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1780332432669",
      name: "Jakob Fangmeier",
      firstName: "Jakob",
      lastName: "Fangmeier",
      nummer: 5,
      number: 5,
      position: "IV",
      status: "Aktiv",
      telefon: "0152-53422427",
      email: "jakobfangmeier@gmx.de",
      adresse: "Staufenerstr. 52 79115 Freiburg",
      geburtsdatum: "29.05.1999",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 150, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 78, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1782405930764",
      name: "Jesse Agbozo",
      firstName: "Jesse",
      lastName: "Agbozo",
      nummer: 6,
      number: 6,
      position: "LV/IV",
      status: "Aktiv",
      telefon: "0152-54658918",
      email: "jessekno@gmail.com",
      adresse: "Offenburger Str. 67 79108 Freiburg",
      geburtsdatum: "06.06.2005",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 85, height: 0, bodyFat: 0, strongFoot: "Links" }
    },
    {
      id: "1783456953709",
      name: "Jonathan Dischinger",
      firstName: "Jonathan",
      lastName: "Dischinger",
      nummer: 7,
      number: 7,
      position: "ST/RF/LF",
      status: "Aktiv",
      telefon: "0177-4822124",
      email: "jonathan23061@web.de",
      adresse: "Schwabenmatten 13 79292 Pfaffenweiler",
      geburtsdatum: "23.06.2004",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 250, salaryBase: 150, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 65, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "1783457389317",
      name: "Stefan Lauer",
      firstName: "Stefan",
      lastName: "Lauer",
      nummer: 23,
      number: 23,
      position: "TW",
      status: "Aktiv",
      telefon: "0176-80818628",
      email: "lauerstefan@hotmail.de",
      adresse: "Wiesenstraße 1 79426 Buggingen",
      geburtsdatum: "21.07.1997",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 0, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 75, sideAgreements: "" },
      physical: { weight: 85, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "2",
      name: "Timm Podlich",
      firstName: "Timm",
      lastName: "Podlich",
      nummer: 2,
      number: 2,
      position: "RV",
      status: "Aktiv",
      telefon: "0176-70116256",
      email: "podlich.timm@gmail.com",
      adresse: "Am Erlenbuck 46 79379 Müllheim",
      geburtsdatum: "15.02.2005",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 100, salaryBase: 100, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 83, height: 0, bodyFat: 0, strongFoot: "Rechts" }
    },
    {
      id: "27",
      name: "Julien Tschira",
      firstName: "Julien",
      lastName: "Tschira",
      nummer: 27,
      number: 27,
      position: "LM/LW",
      status: "Aktiv",
      telefon: "0179-7839895",
      email: "julien.tschira@web.de",
      adresse: "Hohenrainstr. 24a 4133 Pratteln",
      geburtsdatum: "03.08.1995",
      einsatzzeitenGesamt: 0,
      finance: { baseSalary: 350, salaryBase: 0, months: 10, seasonExtra: 0, transferFeeIn: 0, transferFeeOut: 0, ist: 0, individualBonus: 0, bonusPerMatch: 0, sideAgreements: "" },
      physical: { weight: 90, height: 0, bodyFat: 0, strongFoot: "Links" }
    }
  ],

  // 2. Anwesenheit / Trainings
  attendance: [
    { playerId: "10", id: "10", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "11", id: "11", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "v", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "13", id: "13", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "P", "21": "P", "22": "x", "23": "x", "24": "e", "25": "e", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "17", id: "17", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1774352325883", id: "1774352325883", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "v", "17": "x", "18": "P", "19": "P", "20": "P", "21": "P", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "v", "31": "x", "32": "x" } },
    { playerId: "1774353082308", id: "1774353082308", sessions: { "6": "v", "7": "v", "8": "v", "9": "v", "10": "v", "11": "v", "12": "v", "13": "v", "14": "v", "15": "v", "16": "v", "17": "v", "18": "v", "19": "v", "20": "v", "21": "v", "22": "v", "23": "v", "24": "v", "25": "v", "26": "v", "27": "v", "28": "v", "29": "v", "30": "v", "31": "v", "32": "v" } },
    { playerId: "1774353199979", id: "1774353199979", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "e", "11": "e", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "e", "32": "e" } },
    { playerId: "1774353406268", id: "1774353406268", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1774353522982", id: "1774353522982", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1774509700375", id: "1774509700375", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "e", "11": "e", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "e", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1774513370994", id: "1774513370994", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1776370685547", id: "1776370685547", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "e", "20": "x", "21": "x", "22": "k", "23": "k", "24": "k", "25": "x", "26": "x", "27": "e", "28": "e", "29": "x", "30": "x", "31": "e", "32": "x" } },
    { playerId: "1776405617838", id: "1776405617838", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1776405809408", id: "1776405809408", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1776411907189", id: "1776411907189", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1776620686292", id: "1776620686292", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "v", "17": "x", "18": "v", "19": "v", "20": "x", "21": "v", "22": "x", "23": "v", "24": "x", "25": "x", "26": "v", "27": "x", "28": "x", "29": "x", "30": "v", "31": "e", "32": "x" } },
    { playerId: "1776621192537", id: "1776621192537", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "v", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "e", "32": "x" } },
    { playerId: "1776708944690", id: "1776708944690", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "v", "17": "x", "18": "x", "19": "x", "20": "x", "21": "v", "22": "x", "23": "x", "24": "x", "25": "x", "26": "e", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1780331046568", id: "1780331046568", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1780332432669", id: "1780332432669", sessions: { "6": "x", "7": "x", "8": "x", "9": "e", "10": "x", "11": "e", "12": "e", "13": "e", "14": "e", "15": "e", "16": "e", "17": "e", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "e", "30": "x", "31": "x", "32": "x" } },
    { playerId: "1782405930764", id: "1782405930764", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "2", id: "2", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "x", "18": "x", "19": "x", "20": "x", "21": "x", "22": "x", "23": "x", "24": "x", "25": "x", "26": "x", "27": "x", "28": "x", "29": "x", "30": "x", "31": "x", "32": "x" } },
    { playerId: "27", id: "27", sessions: { "6": "x", "7": "x", "8": "x", "9": "x", "10": "x", "11": "x", "12": "x", "13": "x", "14": "x", "15": "x", "16": "x", "17": "v", "18": "v", "19": "v", "20": "v", "21": "v", "22": "v", "23": "P", "24": "P", "25": "v", "26": "v", "27": "v", "28": "x", "29": "x", "30": "v", "31": "x", "32": "x" } }
  ],

  // 3. Spiele / Spielplan
  competitiveMatches: [
    { id: "2", date: "2026-08-07", opponent: "FSV Rheinfelden", meetingTime: "18:00", competition: "Verbandsliga Südbaden", kickOff: "19:30", isHome: false, location: "Rheinfelden (Auswärts)", result: "1:0" },
    { id: "3", date: "2026-08-15", meetingTime: "16:00", kickOff: "18:00", location: "Rielasingen (Auswärts)", isHome: false, opponent: "1. FC Rielasingen-Arlen", competition: "Verbandsliga Südbaden" },
    { id: "4", meetingTime: "16:30", isHome: true, opponent: "SC Hofstetten", kickOff: "18:00", date: "2026-08-22", location: "Auggen (Heim)", competition: "Verbandsliga Südbaden", result: "1:1", status: "Gespielt" },
    { id: "5", opponent: "FC Denzlingen", isHome: false, meetingTime: "12:15", kickOff: "14:00", date: "2026-08-29", location: "Denzlingen (Auswärts)", competition: "Verbandsliga Südbaden", result: "0:2", status: "Gespielt" },
    { id: "6", competition: "Verbandsliga Südbaden", opponent: "SC Konstanz-Wollmatingen", kickOff: "16:30", location: "Auggen (Heim)", isHome: true, meetingTime: "15:00", date: "2026-09-05" },
    { id: "7", competition: "Verbandsliga Südbaden", opponent: "FC Rot-Weiß Salem", isHome: false, kickOff: "17:30", location: "Salem (Auswärts)", date: "2026-09-12", meetingTime: "15:00" },
    { id: "8", kickOff: "17:30", date: "2026-09-18", location: "Auggen (Heim)", competition: "Verbandsliga Südbaden", meetingTime: "16:00", opponent: "FC Wolfenweiler-Schallstadt", isHome: true },
    { id: "9", opponent: "SV Bühlertal", date: "2026-09-26", meetingTime: "12:30", competition: "Verbandsliga Südbaden", kickOff: "15:00", location: "Bühlertal (Auswärts)", isHome: false },
    { id: "10", kickOff: "17:00", location: "Auggen (Heim)", competition: "Verbandsliga Südbaden", meetingTime: "15:30", isHome: true, date: "2026-10-03", opponent: "SC Lahr" },
    { id: "11", kickOff: "15:30", meetingTime: "13:00", opponent: "SV 08 Kuppenheim", date: "2026-10-10", isHome: false, competition: "Verbandsliga Südbaden", location: "Kuppenheim (Auswärts)" },
    { id: "12", opponent: "SV 08 Laufenburg", date: "2026-10-17", meetingTime: "14:00", isHome: false, location: "Laufenburg (Auswärts)", competition: "Verbandsliga Südbaden", kickOff: "16:00" },
    { id: "13", location: "Auggen (Heim)", meetingTime: "14:30", isHome: true, competition: "Verbandsliga Südbaden", kickOff: "16:00", opponent: "SV Linx", date: "2026-10-24" },
    { id: "14", location: "Gundelfingen (Auswärts)", meetingTime: "09:30", date: "2026-11-01", kickOff: "11:00", competition: "Verbandsliga Südbaden", isHome: false, opponent: "SpVgg Gundelfingen/Wildtal" },
    { id: "15", isHome: true, location: "Auggen (Heim)", meetingTime: "13:00", opponent: "VfR Hausen", date: "2026-11-08", competition: "Verbandsliga Südbaden", kickOff: "14:30" },
    { id: "16", date: "2026-11-14", opponent: "SC Pfullendorf", kickOff: "14:30", competition: "Verbandsliga Südbaden", isHome: false, meetingTime: "11:30", location: "Pfullendorf (Auswärts)" },
    { id: "17", location: "Auggen (Heim)", date: "2026-11-22", meetingTime: "13:00", kickOff: "14:30", competition: "Verbandsliga Südbaden", opponent: "SC Wyhl", isHome: true },
    { id: "18", competition: "Verbandsliga Südbaden", opponent: "1. FC Rielasingen-Arlen", isHome: true, kickOff: "14:30", date: "2026-11-28", meetingTime: "13:00", location: "Auggen (Heim)" },
    { id: "19", date: "2026-12-05", opponent: "SC Hofstetten", competition: "Verbandsliga Südbaden", isHome: false, meetingTime: "12:00", location: "Hofstetten (Auswärts)", kickOff: "14:30" },
    { id: "20", isHome: true, location: "Auggen (Heim)", kickOff: "15:00", meetingTime: "13:30", competition: "Verbandsliga Südbaden", opponent: "FC Denzlingen", date: "2027-03-14" },
    { id: "21", location: "Konstanz (Auswärts)", date: "2027-03-20", competition: "Verbandsliga Südbaden", isHome: false, meetingTime: "13:30", kickOff: "16:00", opponent: "SC Konstanz-Wollmatingen" },
    { id: "22", location: "Auggen (Heim)", meetingTime: "13:30", kickOff: "15:00", isHome: true, date: "2027-03-29", competition: "Verbandsliga Südbaden", opponent: "FC Rot-Weiß Salem" },
    { id: "23", kickOff: "14:00", date: "2027-04-03", competition: "Verbandsliga Südbaden", opponent: "FC Wolfenweiler-Schallstadt", meetingTime: "12:30", location: "Wolfenweiler (Auswärts)", isHome: false },
    { id: "24", kickOff: "15:00", meetingTime: "13:30", location: "Auggen (Heim)", competition: "Verbandsliga Südbaden", opponent: "SV Bühlertal", isHome: true, date: "2027-04-11" },
    { id: "25", meetingTime: "13:30", location: "Lahr (Auswärts)", kickOff: "15:30", date: "2027-04-17", opponent: "SC Lahr", competition: "Verbandsliga Südbaden", isHome: false },
    { id: "26", isHome: true, competition: "Verbandsliga Südbaden", opponent: "SV 08 Kuppenheim", location: "Auggen (Heim)", date: "2027-04-25", meetingTime: "13:30", kickOff: "15:00" },
    { id: "27", opponent: "SV 08 Laufenburg", date: "2027-05-02", kickOff: "15:00", competition: "Verbandsliga Südbaden", meetingTime: "13:30", location: "Auggen (Heim)", isHome: true },
    { id: "28", isHome: false, date: "2027-05-08", location: "Linx (Auswärts)", competition: "Verbandsliga Südbaden", kickOff: "15:30", opponent: "SV Linx", meetingTime: "13:00" },
    { id: "29", competition: "Verbandsliga Südbaden", date: "2027-05-17", location: "Auggen (Heim)", opponent: "SpVgg Gundelfingen/Wildtal", isHome: true, meetingTime: "14:30", kickOff: "16:00" },
    { id: "30", meetingTime: "17:00", kickOff: "18:30", opponent: "VfR Hausen", isHome: false, location: "Hausen (Auswärts)", competition: "Verbandsliga Südbaden", date: "2027-05-21" },
    { id: "31", meetingTime: "13:30", isHome: true, opponent: "SC Pfullendorf", kickOff: "15:00", date: "2027-05-30", location: "Auggen (Heim)", competition: "Verbandsliga Südbaden" },
    { id: "32", opponent: "SC Wyhl", meetingTime: "14:30", isHome: false, competition: "Verbandsliga Südbaden", kickOff: "16:00", date: "2027-06-05", location: "Wyhl (Auswärts)" }
  ],

  // 4. Trainingseinheiten / Jahresplanung (yearlyPlan) inklusive Einheiten vom 07.07. bis 13.08.2026
  yearlyPlan: [
    { id: "2026-07-06", date: "2026-07-06", type: "Training", activity: "Start Vorbereitung mit Besprechung", time: "19:00", phase: "summer", te: 48 },
    { id: "2026-07-07", date: "2026-07-07", type: "Training", activity: "BALLBESITZ, UMSCHALTEN", time: "19:00", training: { start: "19:00", end: "20:30", notes: "" }, phase: "summer" },
    { id: "2026-07-09", date: "2026-07-09", type: "Training", activity: "GRUNDLAGEN / PASSSPIEL", time: "19:00", phase: "summer" },
    { id: "2026-07-10", date: "2026-07-10", type: "Training", activity: "TAKTIK &amp; GEGENPRESSING", time: "19:00", phase: "summer" },
    { id: "2026-07-11", date: "2026-07-11", type: "Spiel", activity: "Testspiel / FC Auggen : SV Weil", location: "Weil", opponent: "-SV Weil", ergebnis: "5:2", phase: "summer" },
    { id: "2026-07-13", date: "2026-07-13", type: "Training", activity: "AUSDAUER &amp; KRAFT", time: "19:00", phase: "summer" },
    { id: "2026-07-14", date: "2026-07-14", type: "Training", activity: "SPIELFORMEN 3 GEGEN 3", time: "19:00", phase: "summer" },
    { id: "2026-07-16", date: "2026-07-16", type: "Training", activity: "STANDARDS &amp; ABSCHLUSS", time: "19:00", phase: "summer" },
    { id: "2026-07-17", date: "2026-07-17", type: "Training", activity: "Trainingslager - Taktik &amp; Kompaktheit", location: "Auggen", time: "19:00", phase: "summer" },
    { id: "2026-07-18", date: "2026-07-18", type: "Spiel", activity: "Fc Auggen : FC Zell", time: "13:00", location: "Auggen", opponent: "-Zell", ergebnis: "7:0", phase: "summer" },
    { id: "2026-07-19", date: "2026-07-19", type: "Training", activity: "Trainingslager - Regeneration &amp; Analyse", time: "19:00", location: "Auggen", phase: "summer" },
    { id: "2026-07-21", date: "2026-07-21", type: "Training", activity: "SCHNELLIGKEIT &amp; SPRINT", time: "19:00", phase: "summer" },
    { id: "2026-07-22", date: "2026-07-22", type: "Training", activity: "DEFENSIV-VERBUND", time: "19:00", phase: "summer" },
    { id: "2026-07-24", date: "2026-07-24", type: "Training", activity: "OFFENSIV-ROTIEREN", time: "19:00", phase: "summer" },
    { id: "2026-07-25", date: "2026-07-25", type: "Testspiel", activity: "Testspiel in Steinenstadt gegen Black Stars Basel", time: "19:30", location: "Steinenstadt", opponent: "-Black Stars Basel", ergebnis: "6:1", phase: "summer" },
    { id: "2026-07-27", date: "2026-07-27", type: "Training", activity: "AUFBAUSPIEL UNTER DRUCK", time: "19:00", phase: "summer" },
    { id: "2026-07-28", date: "2026-07-28", type: "Spiel", activity: "Testspiel in Auggen / FC Auggen : FC Lörrach-Brombach", time: "19:00", location: "Auggen", opponent: "-FC Lörrach-Brombach", ergebnis: "4:1", treffpunkt: "17:30", phase: "summer" },
    { id: "2026-07-30", date: "2026-07-30", type: "Training", activity: "PRESSING-AUSLÖSER", time: "19:00", phase: "summer" },
    { id: "2026-07-31", date: "2026-07-31", type: "Training", activity: "LETZTER SCHLIFF VORM SPIEL", time: "19:00", phase: "summer" },
    { id: "2026-08-01", date: "2026-08-01", type: "Testspiel", activity: "Testspiel FC Auggen : Oberachern", time: "19:00", location: "Oberachern", opponent: "-Oberachern", ergebnis: "0:4", treffpunkt: "13:30", phase: "summer" },
    { id: "2026-08-03", date: "2026-08-03", type: "Training", activity: "NACHBEREITUNG &amp; KRAFT", time: "19:00", phase: "summer" },
    { id: "2026-08-04", date: "2026-08-04", type: "Training", activity: "TAKTIK-FEINSCHLIFF", time: "19:00", phase: "summer" },
    { id: "2026-08-06", date: "2026-08-06", type: "Training", activity: "KONTROLLIERTES UMSCHALTEN", time: "19:00", phase: "summer" },
    { id: "2026-08-07", date: "2026-08-07", type: "Pflichtspiel", activity: "FSV Rheinfelden : Fc Auggen", time: "19:00", location: "FSV Rheinfelden", opponent: "-Rheinfelden", phase: "summer" },
    { id: "2026-08-08", date: "2026-08-08", type: "Training", activity: "REGENERATION / AUSLAUFEN", time: "19:00", opponent: "-Pokal 1. Runde", phase: "summer" },
    { id: "2026-08-10", date: "2026-08-10", type: "Training", activity: "ANALYSE &amp; GRUNDLAGEN", time: "19:00", phase: "summer" },
    { id: "2026-08-11", date: "2026-08-11", type: "Training", activity: "TAKTIKALER AUFBAU", time: "19:00", phase: "summer" },
    {
      id: "2026-08-13",
      date: "2026-08-13",
      type: "Training",
      activity: "INDIVIDUALTECHNIK/TAKTIK",
      time: "19:00",
      phase: "summer",
      training: {
        start: "19:00",
        end: "20:30",
        notes: "Erwärmung:\nhttps://youtu.be/rw8w3kDDl84?si=IBO_b48DJJHNRw1g\n\nWarm up fun &amp; games\nhttps://youtu.be/P1i3O9dtabA?si=qCt6vXjkyI6ZtfI_"
      }
    },
    { id: "2026-08-14", date: "2026-08-14", type: "Training", activity: "ABSCHLUSSTRAINING VORM SPIEL", time: "19:00", phase: "summer" },
    { id: "2026-08-16", date: "2026-08-16", type: "Pflichtspiel", activity: "1.FC Rielasingen-Arlen : FC Auggen Verbandsliga Start 26/27", opponent: "Rielasingen-Arlen", phase: "summer" },
    { id: "2026-08-22", date: "2026-08-22", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Hofstetten", time: "18:00", location: "Auggen (Heim)", opponent: "SC Hofstetten", phase: "season" },
    { id: "2026-08-29", date: "2026-08-29", type: "Pflichtspiel", activity: "Pflichtspiel vs FC Denzlingen", time: "14:00", location: "Denzlingen (Auswärts)", opponent: "FC Denzlingen", phase: "season" },
    { id: "2026-09-05", date: "2026-09-05", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Konstanz-Wollmatingen", time: "16:30", location: "Auggen (Heim)", opponent: "SC Konstanz-Wollmatingen", phase: "season" },
    { id: "2026-09-12", date: "2026-09-12", type: "Pflichtspiel", activity: "Pflichtspiel vs FC Rot-Weiß Salem", time: "17:30", location: "Salem (Auswärts)", opponent: "FC Rot-Weiß Salem", phase: "season" },
    { id: "2026-09-18", date: "2026-09-18", type: "Pflichtspiel", activity: "Pflichtspiel vs FC Wolfenweiler-Schallstadt", time: "17:30", location: "Auggen (Heim)", opponent: "FC Wolfenweiler-Schallstadt", phase: "season" },
    { id: "2026-09-26", date: "2026-09-26", type: "Pflichtspiel", activity: "Pflichtspiel vs SV Bühlertal", time: "15:00", location: "Bühlertal (Auswärts)", opponent: "SV Bühlertal", phase: "season" },
    { id: "2026-10-03", date: "2026-10-03", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Lahr", time: "17:00", location: "Auggen (Heim)", opponent: "SC Lahr", phase: "season" },
    { id: "2026-10-10", date: "2026-10-10", type: "Pflichtspiel", activity: "Pflichtspiel vs SV 08 Kuppenheim", time: "15:30", location: "Kuppenheim (Auswärts)", opponent: "SV 08 Kuppenheim", phase: "season" },
    { id: "2026-10-17", date: "2026-10-17", type: "Pflichtspiel", activity: "Pflichtspiel vs SV 08 Laufenburg", time: "16:00", location: "Laufenburg (Auswärts)", opponent: "SV 08 Laufenburg", phase: "season" },
    { id: "2026-10-24", date: "2026-10-24", type: "Pflichtspiel", activity: "Pflichtspiel vs SV Linx", time: "16:00", location: "Auggen (Heim)", opponent: "SV Linx", phase: "season" },
    { id: "2026-11-01", date: "2026-11-01", type: "Pflichtspiel", activity: "Pflichtspiel vs SpVgg Gundelfingen/Wildtal", time: "11:00", location: "Gundelfingen (Auswärts)", opponent: "SpVgg Gundelfingen/Wildtal", phase: "season" },
    { id: "2026-11-08", date: "2026-11-08", type: "Pflichtspiel", activity: "Pflichtspiel vs VfR Hausen", time: "14:30", location: "Auggen (Heim)", opponent: "VfR Hausen", phase: "season" },
    { id: "2026-11-14", date: "2026-11-14", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Pfullendorf", time: "14:30", location: "Pfullendorf (Auswärts)", opponent: "SC Pfullendorf", phase: "season" },
    { id: "2026-11-22", date: "2026-11-22", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Wyhl", time: "14:30", location: "Auggen (Heim)", opponent: "SC Wyhl", phase: "season" },
    { id: "2026-11-28", date: "2026-11-28", type: "Pflichtspiel", activity: "Pflichtspiel vs 1. FC Rielasingen-Arlen", time: "14:30", location: "Auggen (Heim)", opponent: "1. FC Rielasingen-Arlen", phase: "season" },
    { id: "2026-12-05", date: "2026-12-05", type: "Pflichtspiel", activity: "Pflichtspiel vs SC Hofstetten", time: "14:30", location: "Hofstetten (Auswärts)", opponent: "SC Hofstetten", phase: "season" }
  ]
};

function decodeHtmlEntities<T>(value: T): T {
  if (typeof value === "string") {
    return value
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'") as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => decodeHtmlEntities(item)) as unknown as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, decodeHtmlEntities(val)])
    ) as unknown as T;
  }

  return value;
}

async function restorePlayers() {
  if (!completeRestoreData.players?.length) return;

  for (const player of completeRestoreData.players) {
    if (!player || !player.id) continue;

    try {
      const cleanedPlayer = decodeHtmlEntities(player);
      await savePlayer(String(player.id), cleanedPlayer);
      console.log(`✔️ Spieler gespeichert: ${player.name} (${player.id})`);
    } catch (error) {
      console.error(`❌ Fehler bei Spieler ${player.id}:`, error);
    }
  }

  console.log("✔️ Spieler wiederhergestellt.");
}

async function restoreAttendance() {
  if (!completeRestoreData.attendance?.length) return;

  for (const attendance of completeRestoreData.attendance) {
    if (!attendance || !attendance.id) continue;

    try {
      const cleanedAttendance = decodeHtmlEntities(attendance);
      await saveTraining(String(attendance.id), {
        ...cleanedAttendance,
        id: String(attendance.id),
      });
      console.log(`✔️ Anwesenheit gespeichert: ${attendance.id}`);
    } catch (error) {
      console.error(`❌ Fehler bei Anwesenheit ${attendance.id}:`, error);
    }
  }

  console.log("✔️ Anwesenheit wiederhergestellt.");
}

async function restoreCompetitiveMatches() {
  if (!completeRestoreData.competitiveMatches?.length) return;

  for (const match of completeRestoreData.competitiveMatches) {
    if (!match || !match.id) continue;

    try {
      const cleanedMatch = decodeHtmlEntities(match);
      await setDoc(doc(db, "competitiveMatches", String(match.id)), cleanedMatch);
      console.log(`✔️ Spiel gespeichert: ${match.id}`);
    } catch (error) {
      console.error(`❌ Fehler bei Spiel ${match.id}:`, error);
    }
  }

  console.log("✔️ Spielplan wiederhergestellt.");
}

async function restoreYearlyPlan() {
  if (!completeRestoreData.yearlyPlan?.length) return;

  for (const plan of completeRestoreData.yearlyPlan) {
    if (!plan || !plan.id) continue;

    try {
      const cleanedPlan = decodeHtmlEntities(plan);
      await setDoc(doc(db, "yearlyPlan", String(plan.id)), cleanedPlan);
      console.log(`✔️ Jahresplan gespeichert: ${plan.id}`);
    } catch (error) {
      console.error(`❌ Fehler bei Jahresplan ${plan.id}:`, error);
    }
  }

  console.log("✔️ Trainingseinheiten (yearlyPlan) erfolgreich wiederhergestellt.");
}

export async function restoreOldData() {
  console.log("🚀 Starte vollständige Wiederherstellung...");

  try {
    await restorePlayers();
    await restoreAttendance();
    await restoreCompetitiveMatches();
    await restoreYearlyPlan();

    console.log("🎉 Alles komplett wiederhergestellt!");
  } catch (error) {
    console.error("❌ Restore abgebrochen:", error);
    throw error;
  }
}

// Nur manuell ausführen:
// restoreOldData();
