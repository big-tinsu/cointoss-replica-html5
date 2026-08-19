// Stubs `https://game.shacksevo.co/lang/api/v1/languages[/:code]`
// (`LanguageManager.cs`, spec §4/§6) so the localization flow works
// end-to-end without a real translation service. Only a handful of the ~95
// keys are actually translated per language below — everything else echoes
// the English key back, exactly like a partner language service that hasn't
// filled in every string yet (the client already handles that gracefully:
// `LanguageManager.TranslateAll` falls back to the default key on an empty
// string, and just capitalizes+accepts anything non-empty otherwise).
export const LANGUAGES = {
  en: "English",
  fr: "Français",
  sw: "Kiswahili",
};

const OVERRIDES = {
  fr: {
    Head: "pile",
    head: "pile",
    Heads: "pile",
    heads: "pile",
    Tail: "face",
    tail: "face",
    Tails: "face",
    tails: "face",
    Side: "tranche",
    side: "tranche",
    Rebet: "reparier",
    "New Round": "nouvelle manche",
    Stake: "mise",
    Date: "date",
    Status: "statut",
    "Bet History": "historique des paris",
    "Select Language": "choisir la langue",
    "Insufficient Funds": "fonds insuffisants",
    Close: "fermer",
    Start: "commencer",
    won: "gagné",
    lost: "perdu",
    "You just won": "vous venez de gagner",
    "You lost. You chose": "vous avez perdu. vous avez choisi",
    "Bet placed successfully": "pari placé avec succès",
    "Value out of bounds": "valeur hors limites",
  },
  sw: {
    Head: "kichwa",
    head: "kichwa",
    Heads: "kichwa",
    heads: "kichwa",
    Tail: "mkia",
    tail: "mkia",
    Tails: "mkia",
    tails: "mkia",
    Side: "ukingo",
    side: "ukingo",
    Rebet: "cheza tena",
    "New Round": "raundi mpya",
    Stake: "kiwango cha dau",
    Date: "tarehe",
    Status: "hali",
    "Bet History": "historia ya dau",
    "Select Language": "chagua lugha",
    "Insufficient Funds": "fedha hazitoshi",
    Close: "funga",
    Start: "anza",
    won: "alishinda",
    lost: "alipoteza",
    "You just won": "umeshinda tu",
    "You lost. You chose": "umepoteza. ulichagua",
    "Bet placed successfully": "dau limewekwa kwa mafanikio",
    "Value out of bounds": "thamani nje ya mipaka",
  },
};

export function translateOne(code, key) {
  return OVERRIDES[code]?.[key] ?? key;
}

export function translateMany(code, keys) {
  return keys.map((k) => translateOne(code, k));
}
