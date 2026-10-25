// Act data per contest year. Act ids are only unique within a year + round;
// never renumber them once scores exist (scores.act_id stores them).
// A final act's `semifinal` / `semifinalActId` point at the same act's semi entry, within the same year.

const acts2026 = {
  sf1: [
    { id: "sf1-1",  position: 1,  country: "Moldova",     flag: "🇲🇩", artist: "Satoshi",                        song: "Viva, Moldova!" },
    { id: "sf1-2",  position: 2,  country: "Sweden",      flag: "🇸🇪", artist: "FELICIA",                        song: "My System" },
    { id: "sf1-3",  position: 3,  country: "Croatia",     flag: "🇭🇷", artist: "Lelek",                          song: "Andromeda" },
    { id: "sf1-4",  position: 4,  country: "Greece",      flag: "🇬🇷", artist: "Akylas",                         song: "Ferto" },
    { id: "sf1-5",  position: 5,  country: "Portugal",    flag: "🇵🇹", artist: "Bandidos do Cante",              song: "Rosa" },
    { id: "sf1-6",  position: 6,  country: "Georgia",     flag: "🇬🇪", artist: "Bzikebi",                        song: "On Replay" },
    { id: "sf1-7",  position: 7,  country: "Finland",     flag: "🇫🇮", artist: "Linda Lampenius x Pete Parkkonen", song: "Liekinheitin" },
    { id: "sf1-8",  position: 8,  country: "Montenegro",  flag: "🇲🇪", artist: "Tamara Živković",                song: "Nova Zora" },
    { id: "sf1-9",  position: 9,  country: "Estonia",     flag: "🇪🇪", artist: "Vanilla Ninja",                  song: "Too Epic To Be True" },
    { id: "sf1-10", position: 10, country: "Israel",      flag: "🇮🇱", artist: "Noam Bettan",                    song: "Michelle" },
    { id: "sf1-11", position: 11, country: "Belgium",     flag: "🇧🇪", artist: "ESSYLA",                         song: "Dancing On The Ice" },
    { id: "sf1-12", position: 12, country: "Lithuania",   flag: "🇱🇹", artist: "Lion Ceccah",                    song: "Sólo Quiero Más" },
    { id: "sf1-13", position: 13, country: "San Marino",  flag: "🇸🇲", artist: "Senhit ft. Boy George",          song: "Superstar" },
    { id: "sf1-14", position: 14, country: "Poland",      flag: "🇵🇱", artist: "ALICJA",                         song: "Pray" },
    { id: "sf1-15", position: 15, country: "Serbia",      flag: "🇷🇸", artist: "Lavina",                         song: "Kraj Mene" },
  ],
  sf2: [
    { id: "sf2-1",  position: 1,  country: "Bulgaria",    flag: "🇧🇬", artist: "Dara",                           song: "Bangaranga" },
    { id: "sf2-2",  position: 2,  country: "Azerbaijan",  flag: "🇦🇿", artist: "Jiva",                           song: "Just Go" },
    { id: "sf2-3",  position: 3,  country: "Romania",     flag: "🇷🇴", artist: "Alexandra Căpitănescu",          song: "Choke Me" },
    { id: "sf2-4",  position: 4,  country: "Luxembourg",  flag: "🇱🇺", artist: "Eva Marija",                     song: "Mother Nature" },
    { id: "sf2-5",  position: 5,  country: "Czechia",     flag: "🇨🇿", artist: "Daniel Žižka",                   song: "Crossroads" },
    { id: "sf2-6",  position: 6,  country: "Armenia",     flag: "🇦🇲", artist: "Simón",                          song: "Paloma Rumba" },
    { id: "sf2-7",  position: 7,  country: "Switzerland", flag: "🇨🇭", artist: "Veronica Fusaro",                song: "Alice" },
    { id: "sf2-8",  position: 8,  country: "Cyprus",      flag: "🇨🇾", artist: "Antigoni",                       song: "Jalla" },
    { id: "sf2-9",  position: 9,  country: "Latvia",      flag: "🇱🇻", artist: "Atvara",                         song: "Ēnā" },
    { id: "sf2-10", position: 10, country: "Denmark",     flag: "🇩🇰", artist: "Søren Torpegaard Lund",          song: "Før Vi Går Hjem" },
    { id: "sf2-11", position: 11, country: "Australia",   flag: "🇦🇺", artist: "Delta Goodrem",                  song: "Eclipse" },
    { id: "sf2-12", position: 12, country: "Ukraine",     flag: "🇺🇦", artist: "Leléka",                         song: "Ridnym" },
    { id: "sf2-13", position: 13, country: "Albania",     flag: "🇦🇱", artist: "Alis",                           song: "Nân" },
    { id: "sf2-14", position: 14, country: "Malta",       flag: "🇲🇹", artist: "Aidan",                          song: "Bella" },
    { id: "sf2-15", position: 15, country: "Norway",      flag: "🇳🇴", artist: "Jonas Lovv",                     song: "Ya ya ya" },
  ],
  final: [
    { id: "gf-1",  position: 1,  country: "Denmark",        flag: "🇩🇰", artist: "Søren Torpegaard Lund",          song: "Før Vi Går Hjem",    semifinal: "sf2", semifinalActId: "sf2-10" },
    { id: "gf-2",  position: 2,  country: "Germany",        flag: "🇩🇪", artist: "Sarah Engels",                   song: "Fire",               semifinal: null,  semifinalActId: null },
    { id: "gf-3",  position: 3,  country: "Israel",         flag: "🇮🇱", artist: "Noam Bettan",                    song: "Michelle",           semifinal: "sf1", semifinalActId: "sf1-10" },
    { id: "gf-4",  position: 4,  country: "Belgium",        flag: "🇧🇪", artist: "ESSYLA",                         song: "Dancing On The Ice", semifinal: "sf1", semifinalActId: "sf1-11" },
    { id: "gf-5",  position: 5,  country: "Albania",        flag: "🇦🇱", artist: "Alis",                           song: "Nân",                semifinal: "sf2", semifinalActId: "sf2-13" },
    { id: "gf-6",  position: 6,  country: "Greece",         flag: "🇬🇷", artist: "Akylas",                         song: "Ferto",              semifinal: "sf1", semifinalActId: "sf1-4" },
    { id: "gf-7",  position: 7,  country: "Ukraine",        flag: "🇺🇦", artist: "Leléka",                         song: "Ridnym",             semifinal: "sf2", semifinalActId: "sf2-12" },
    { id: "gf-8",  position: 8,  country: "Australia",      flag: "🇦🇺", artist: "Delta Goodrem",                  song: "Eclipse",            semifinal: "sf2", semifinalActId: "sf2-11" },
    { id: "gf-9",  position: 9,  country: "Serbia",         flag: "🇷🇸", artist: "Lavina",                         song: "Kraj Mene",          semifinal: "sf1", semifinalActId: "sf1-15" },
    { id: "gf-10", position: 10, country: "Malta",          flag: "🇲🇹", artist: "Aidan",                          song: "Bella",              semifinal: "sf2", semifinalActId: "sf2-14" },
    { id: "gf-11", position: 11, country: "Czechia",        flag: "🇨🇿", artist: "Daniel Žižka",                   song: "Crossroads",         semifinal: "sf2", semifinalActId: "sf2-5" },
    { id: "gf-12", position: 12, country: "Bulgaria",       flag: "🇧🇬", artist: "Dara",                           song: "Bangaranga",         semifinal: "sf2", semifinalActId: "sf2-1" },
    { id: "gf-13", position: 13, country: "Croatia",        flag: "🇭🇷", artist: "Lelek",                          song: "Andromeda",          semifinal: "sf1", semifinalActId: "sf1-3" },
    { id: "gf-14", position: 14, country: "United Kingdom", flag: "🇬🇧", artist: "Look Mum No Computer",           song: "Eins, Zwei, Drei",  semifinal: null,  semifinalActId: null },
    { id: "gf-15", position: 15, country: "France",         flag: "🇫🇷", artist: "Monroe",                         song: "Regarde !",          semifinal: null,  semifinalActId: null },
    { id: "gf-16", position: 16, country: "Moldova",        flag: "🇲🇩", artist: "Satoshi",                        song: "Viva, Moldova!",     semifinal: "sf1", semifinalActId: "sf1-1" },
    { id: "gf-17", position: 17, country: "Finland",        flag: "🇫🇮", artist: "Linda Lampenius x Pete Parkkonen", song: "Liekinheitin",     semifinal: "sf1", semifinalActId: "sf1-7" },
    { id: "gf-18", position: 18, country: "Poland",         flag: "🇵🇱", artist: "ALICJA",                         song: "Pray",               semifinal: "sf1", semifinalActId: "sf1-14" },
    { id: "gf-19", position: 19, country: "Lithuania",      flag: "🇱🇹", artist: "Lion Ceccah",                    song: "Sólo Quiero Más",    semifinal: "sf1", semifinalActId: "sf1-12" },
    { id: "gf-20", position: 20, country: "Sweden",         flag: "🇸🇪", artist: "FELICIA",                        song: "My System",          semifinal: "sf1", semifinalActId: "sf1-2" },
    { id: "gf-21", position: 21, country: "Cyprus",         flag: "🇨🇾", artist: "Antigoni",                       song: "Jalla",              semifinal: "sf2", semifinalActId: "sf2-8" },
    { id: "gf-22", position: 22, country: "Italy",          flag: "🇮🇹", artist: "Sal Da Vinci",                   song: "Per Sempre Sì",      semifinal: null,  semifinalActId: null },
    { id: "gf-23", position: 23, country: "Norway",         flag: "🇳🇴", artist: "Jonas Lovv",                     song: "Ya ya ya",           semifinal: "sf2", semifinalActId: "sf2-15" },
    { id: "gf-24", position: 24, country: "Romania",        flag: "🇷🇴", artist: "Alexandra Căpitănescu",          song: "Choke Me",           semifinal: "sf2", semifinalActId: "sf2-3" },
    { id: "gf-25", position: 25, country: "Austria",        flag: "🇦🇹", artist: "Cosmó",                          song: "Tanzschein",         semifinal: null,  semifinalActId: null },
  ]
};

// archived: the contest is over, scores are read-only (enforced by the server)
// Empty acts / null dates = not announced yet; fill these in when the lineup is out
const years = {
  2026: {
    city: 'Vienna',
    archived: true,
    rounds: {
      sf1:   { date: '12 May', acts: acts2026.sf1 },
      sf2:   { date: '14 May', acts: acts2026.sf2 },
      final: { date: '16 May', acts: acts2026.final },
    },
  },
  2027: {
    city: null,
    archived: false,
    rounds: {
      sf1:   { date: null, acts: [] },
      sf2:   { date: null, acts: [] },
      final: { date: null, acts: [] },
    },
  },
};

module.exports = years;
