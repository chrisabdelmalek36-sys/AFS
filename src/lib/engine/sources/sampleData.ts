import type { RawLead, Source } from "./types";

// Deterministic, offline dataset used when PIPELINE_MODE=sample.
// Lets you prove the whole pipeline (dedupe, tiering, enrichment,
// suppression, DB writes) with zero API keys and zero spend.
// It deliberately includes:
//   • the SAME business from two sources / two phone formats  -> dedupe proof
//   • a business that is on the do-not-contact list           -> suppression proof
//   • news/tender "hot" leads                                 -> freshness proof
const DATA: RawLead[] = [
  // ── Platinum: luxury hospitality ──
  { name: "Mövenpick Resort Soma Bay", category: "resort", address: "Soma Bay, Safaga Rd", city: "Soma Bay", region: "Red Sea",
    lat: 26.8466, lng: 33.9921, phone: "+20 65 356 1500", website: "https://movenpick.com", rating: 4.6, userRatings: 5200, priceLevel: 4,
    source: "sample", googlePlaceId: "SAMPLE_MOVENPICK_SOMA" },
  { name: "Four Seasons Hotel Cairo at Nile Plaza", category: "hotel", address: "1089 Corniche El Nil, Garden City", city: "Cairo", region: "Greater Cairo",
    lat: 30.0357, lng: 31.2310, phone: "+20 2 27917000", website: "https://fourseasons.com", rating: 4.7, userRatings: 9100, priceLevel: 4,
    source: "sample", googlePlaceId: "SAMPLE_FS_NILEPLAZA" },
  { name: "Stella Di Mare Sea Club Hotel", category: "resort", address: "Ain Sokhna", city: "Ain Sokhna", region: "Red Sea",
    lat: 29.4039, lng: 32.3470, phone: "0623 661 500", website: "https://stelladimarehotels.com", rating: 4.4, userRatings: 3800, priceLevel: 3,
    source: "sample", googlePlaceId: "SAMPLE_STELLA_SOKHNA" },

  // ── Platinum: top developers (from Google + duplicated from news) ──
  { name: "Emaar Misr Developments", category: "developer", address: "Mivida Boulevard, New Cairo", city: "New Cairo", region: "Greater Cairo",
    lat: 30.0185, lng: 31.4720, phone: "+20 2 2599 0700", website: "https://emaarmisr.com", rating: 4.2, userRatings: 1500,
    source: "sample", googlePlaceId: "SAMPLE_EMAAR" },
  { name: "Tatweer Misr", category: "developer", address: "90th St, New Cairo", city: "New Cairo", region: "Greater Cairo",
    lat: 30.0095, lng: 31.4310, phone: "+20 2 2618 0000", website: "https://tatweermisr.com", rating: 4.1, userRatings: 900,
    source: "sample", googlePlaceId: "SAMPLE_TATWEER" },
  // DUPLICATE of Tatweer Misr — different source, different phone format. Must collapse.
  { name: "Tatweer Misr (Il Monte Galala)", category: "developer", address: "90th Street, New Cairo", city: "New Cairo", region: "Greater Cairo",
    phone: "0226180000", source: "newsapi", sourceUrl: "https://news.example/tatweer-galala-expansion",
    publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), newsHot: true,
    raw: { headline: "Tatweer Misr announces new EGP 4B coastal phase at Il Monte Galala" } },

  // ── Gold ──
  { name: "Mivida by Emaar — Sales Center", category: "developer", address: "Mivida, New Cairo", city: "New Cairo", region: "Greater Cairo",
    lat: 30.0205, lng: 31.4760, phone: "+20 2 2599 0800", website: "https://emaarmisr.com/mivida", rating: 4.3, userRatings: 600,
    source: "sample", googlePlaceId: "SAMPLE_MIVIDA" },
  { name: "Steigenberger Hotel El Tahrir", category: "hotel", address: "Talaat Harb Sq", city: "Cairo", region: "Greater Cairo",
    lat: 30.0500, lng: 31.2380, phone: "+20 2 25750777", website: "https://steigenberger.com", rating: 4.3, userRatings: 2600, priceLevel: 3,
    source: "sample", googlePlaceId: "SAMPLE_STEIGEN_TAHRIR" },
  { name: "Cairo American College", category: "school", address: "Road 253, Maadi", city: "Cairo", region: "Greater Cairo",
    lat: 29.9590, lng: 31.2570, phone: "+20 2 27555555", website: "https://cacegypt.org", rating: 4.4, userRatings: 320,
    source: "sample", googlePlaceId: "SAMPLE_CAC" },
  { name: "The German University in Cairo (GUC)", category: "university", address: "New Cairo City", city: "New Cairo", region: "Greater Cairo",
    lat: 29.9870, lng: 31.4420, phone: "+20 2 27590000", website: "https://guc.edu.eg", rating: 4.2, userRatings: 4100,
    source: "sample", googlePlaceId: "SAMPLE_GUC" },
  { name: "Zööba", category: "restaurant", address: "Zamalek, 26th July St", city: "Cairo", region: "Greater Cairo",
    lat: 30.0610, lng: 31.2200, phone: "+20 1000 000111", website: "https://zooba.com.eg", rating: 4.5, userRatings: 5200, priceLevel: 2,
    source: "sample", googlePlaceId: "SAMPLE_ZOOBA" },

  // ── Silver ──
  { name: "Lecca Coffee Roastery", category: "cafe", address: "Sheikh Zayed, Arkan Plaza", city: "Giza", region: "Greater Cairo",
    lat: 30.0420, lng: 30.9770, phone: "+20 1200 555444", website: "https://leccacoffee.com", rating: 4.6, userRatings: 1900, priceLevel: 2,
    source: "sample", googlePlaceId: "SAMPLE_LECCA" },
  { name: "Mountain View iCity Clubhouse", category: "compound", address: "Mountain View iCity, New Cairo", city: "New Cairo", region: "Greater Cairo",
    lat: 30.0260, lng: 31.4900, phone: "+20 2 26170000", rating: 4.1, userRatings: 210,
    source: "sample", googlePlaceId: "SAMPLE_MV_ICITY" },
  { name: "Maadi British International School", category: "school", address: "Maadi", city: "Cairo", region: "Greater Cairo",
    lat: 29.9600, lng: 31.2600, phone: "+20 2 25160000", website: "https://mbis.edu.eg", rating: 4.0, userRatings: 140,
    source: "sample", googlePlaceId: "SAMPLE_MBIS" },
  { name: "El Gouna Marina Restaurant", category: "restaurant", address: "Abu Tig Marina", city: "El Gouna", region: "Red Sea",
    lat: 27.3960, lng: 33.6770, phone: "+20 65 358 0000", rating: 4.2, userRatings: 760, priceLevel: 3,
    source: "sample", googlePlaceId: "SAMPLE_GOUNA_MARINA" },

  // ── Architecture / interior / institutional ──
  { name: "Shahira Fahmy Architects", category: "architecture", address: "Zamalek", city: "Cairo", region: "Greater Cairo",
    lat: 30.0620, lng: 31.2180, phone: "+20 2 27360000", website: "https://shahirafahmy.com", rating: 4.5, userRatings: 60,
    source: "sample", googlePlaceId: "SAMPLE_SFA" },
  { name: "Cleopatra Hospital Sheikh Zayed", category: "hospital", address: "Sheikh Zayed", city: "Giza", region: "Greater Cairo",
    lat: 30.0500, lng: 30.9700, phone: "+20 2 38500000", website: "https://cleopatrahospitals.com", rating: 4.0, userRatings: 980,
    source: "sample", googlePlaceId: "SAMPLE_CLEO_SZ" },

  // ── North Coast / Sahel ──
  { name: "Hacienda Bay Beach Club", category: "compound", address: "Sidi Abdel Rahman, North Coast", city: "Sahel", region: "North Coast",
    lat: 30.9700, lng: 28.7000, phone: "+20 1000 222333", rating: 4.4, userRatings: 540,
    source: "sample", googlePlaceId: "SAMPLE_HACIENDA" },
  { name: "Marassi Marina — SODIC", category: "developer", address: "Sidi Abdel Rahman, North Coast", city: "Sahel", region: "North Coast",
    lat: 30.9650, lng: 28.7400, phone: "+20 1000 444555", website: "https://sodic.com", rating: 4.3, userRatings: 870,
    source: "sample", googlePlaceId: "SAMPLE_MARASSI" },

  // ── News / tender hot leads (no Google profile) ──
  { name: "Palm Hills Developments", category: "developer", source: "newsapi",
    sourceUrl: "https://news.example/palm-hills-new-cairo-launch",
    publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(), newsHot: true,
    address: "Smart Village, 6th October", city: "6th October", region: "Greater Cairo", phone: "+20 2 35370000",
    raw: { headline: "Palm Hills announces EGP 6.5B new launch in West Cairo" } },
  { name: "Egyptian Tourism Development Authority — Ras El Hekma", category: "developer", source: "gov_tender",
    sourceUrl: "https://tenders.example/tda-ras-el-hekma-infrastructure",
    publishedAt: new Date(Date.now() - 5 * 86400000).toISOString(), newsHot: true,
    address: "Ras El Hekma", city: "Ras El Hekma", region: "North Coast",
    raw: { headline: "TDA pipeline: Ras El Hekma hospitality infrastructure phase 1" } },

  // ── Suppression proof: this business is on the do-not-contact list ──
  { name: "Do Not Contact Test Café", category: "cafe", address: "Test St, Maadi", city: "Cairo", region: "Greater Cairo",
    lat: 29.9500, lng: 31.2500, phone: "+20 1111 999000", website: "https://example.com", rating: 3.9, userRatings: 50,
    source: "sample", googlePlaceId: "SAMPLE_DNC" },
];

export const sampleSource: Source = {
  name: "sample",
  async discover() {
    return DATA;
  },
};
