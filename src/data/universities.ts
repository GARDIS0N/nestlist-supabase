export interface University {
  id: string;
  name: string;
  short_name?: string;
  category: "public_university" | "private_university" | "college_tvet" | "other";
  county: string;
  campus?: string;
  nearby_estates: string[];
  website?: string;
}

export const KENYAN_UNIVERSITIES: University[] = [
  // NAIROBI
  {
    id: "uon-main",
    name: "University of Nairobi (UoN) - Main & Chiromo",
    short_name: "UoN Main / Chiromo",
    category: "public_university",
    county: "Nairobi",
    campus: "Main & Chiromo",
    nearby_estates: ["Chiromo", "Ngara", "CBD", "Parklands", "Westlands", "Pangani", "Riverside", "State House Road", "Kileleshwa", "Hurlingham"]
  },
  {
    id: "ku-main",
    name: "Kenyatta University (KU) - Main Campus",
    short_name: "KU Main",
    category: "public_university",
    county: "Nairobi",
    campus: "Main Campus",
    nearby_estates: ["Kahawa Sukari", "Kahawa Wendani", "KM", "Roysambu", "Githurai 44", "Githurai 45", "Zimmerman", "Kasarani", "Ruiru Town", "Clay City"]
  },
  {
    id: "strathmore-univ",
    name: "Strathmore University",
    short_name: "Strathmore",
    category: "private_university",
    county: "Nairobi",
    campus: "Madaraka",
    nearby_estates: ["Madaraka", "Nairobi West", "Ole Sangale", "South C", "Mbagathi Road", "Langata", "Upper Hill", "T-Mall area", "Dam Estate"]
  },
  {
    id: "usiu-africa",
    name: "United States International University (USIU-Africa)",
    short_name: "USIU-Africa",
    category: "private_university",
    county: "Nairobi",
    campus: "Roysambu / Kasarani",
    nearby_estates: ["Roysambu", "Safari Park", "Mirema Drive", "Roasters", "USIU Road", "Kasarani", "Garden Estate", "Thome", "Zimmerman", "Clay City"]
  },
  {
    id: "tuk-nairobi",
    name: "Technical University of Kenya (TUK)",
    short_name: "TUK",
    category: "public_university",
    county: "Nairobi",
    campus: "CBD / Haile Selassie",
    nearby_estates: ["CBD", "South B", "Ngara", "Pangani", "Nairobi West", "Madaraka", "Upper Hill", "Railway"]
  },
  {
    id: "kca-university",
    name: "KCA University",
    short_name: "KCA Main",
    category: "private_university",
    county: "Nairobi",
    campus: "Ruaraka",
    nearby_estates: ["Ruaraka", "Allsops", "Baba Dogo", "Utalii area", "Garden Estate", "Outer Ring Road", "Pangani", "Ngara", "Thika Road"]
  },
  {
    id: "cuea-karen",
    name: "Catholic University of Eastern Africa (CUEA)",
    short_name: "CUEA Karen",
    category: "private_university",
    county: "Nairobi",
    campus: "Karen",
    nearby_estates: ["Karen", "Bogani", "Hardy", "Langata", "Ongata Rongai", "Kuinda", "Bomas", "Magadi Road"]
  },
  {
    id: "daystar-valley",
    name: "Daystar University - Valley Road Campus",
    short_name: "Daystar Valley Rd",
    category: "private_university",
    county: "Nairobi",
    campus: "Valley Road",
    nearby_estates: ["Valley Road", "Hurlingham", "Kilimani", "Upper Hill", "Ngumo", "Mbagathi", "Community"]
  },
  {
    id: "riara-univ",
    name: "Riara University",
    short_name: "Riara",
    category: "private_university",
    county: "Nairobi",
    campus: "Mbagathi Way",
    nearby_estates: ["Mbagathi Way", "Nairobi West", "Madaraka", "Ngumo", "Golf Course", "Highview", "South C", "Langata"]
  },
  {
    id: "cuk-karen",
    name: "Co-operative University of Kenya (CUK)",
    short_name: "CUK Karen",
    category: "public_university",
    county: "Nairobi",
    campus: "Karen / Ushirika",
    nearby_estates: ["Karen", "Bogani", "Hardy", "Ushirika", "Langata", "Ongata Rongai", "Kuinda"]
  },
  {
    id: "mmu-rongai",
    name: "Multimedia University of Kenya (MMU)",
    short_name: "MMU",
    category: "public_university",
    county: "Nairobi",
    campus: "Magadi Road / Rongai",
    nearby_estates: ["Ongata Rongai", "Magadi Road", "Maasai Lodge", "Nazarene area", "Tuala", "Tumaini", "Bomas", "Langata"]
  },
  {
    id: "uon-knh",
    name: "UoN Faculty of Health Sciences (KNH Medical School)",
    short_name: "UoN Medical (KNH)",
    category: "public_university",
    county: "Nairobi",
    campus: "KNH Medical",
    nearby_estates: ["Upper Hill", "Kenyatta National Hospital area", "Ngumo", "Mbagathi Way", "Nairobi West", "Madaraka", "Kilimani", "Community"]
  },
  {
    id: "uon-lower-kabete",
    name: "UoN Faculty of Business (Lower Kabete)",
    short_name: "UoN Lower Kabete",
    category: "public_university",
    county: "Nairobi",
    campus: "Lower Kabete",
    nearby_estates: ["Lower Kabete", "Spring Valley", "Kabete", "Wangige", "Loresho", "Kyuna", "Uthiru"]
  },
  {
    id: "uon-parklands",
    name: "UoN Faculty of Law (Parklands)",
    short_name: "UoN Parklands Law",
    category: "public_university",
    county: "Nairobi",
    campus: "Parklands",
    nearby_estates: ["Parklands", "Ngara", "Highridge", "Westlands", "City Park", "Pangani"]
  },
  {
    id: "pac-university",
    name: "Pan Africa Christian University (PAC)",
    short_name: "PAC University",
    category: "private_university",
    county: "Nairobi",
    campus: "Roysambu",
    nearby_estates: ["Roysambu", "Safari Park", "Roasters", "Mirema", "Kasarani", "Garden Estate", "Zimmerman"]
  },
  {
    id: "kmtc-nairobi",
    name: "Kenya Medical Training College (KMTC Nairobi)",
    short_name: "KMTC Nairobi",
    category: "college_tvet",
    county: "Nairobi",
    campus: "KNH Grounds",
    nearby_estates: ["KNH area", "Upper Hill", "Ngumo", "Mbagathi Way", "Nairobi West", "Madaraka", "Highview"]
  },
  {
    id: "kimc-south-b",
    name: "Kenya Institute of Mass Communication (KIMC)",
    short_name: "KIMC South B",
    category: "college_tvet",
    county: "Nairobi",
    campus: "South B",
    nearby_estates: ["South B", "Mariakani", "Plainsview", "Golden Gate", "Balozi", "Hazina", "Nairobi West", "South C"]
  },
  {
    id: "utalii-college",
    name: "Kenya Utalii College",
    short_name: "Utalii College",
    category: "college_tvet",
    county: "Nairobi",
    campus: "Thika Road",
    nearby_estates: ["Ruaraka", "Allsops", "Baba Dogo", "Utalii", "Ngara", "Pangani", "Garden Estate"]
  },
  {
    id: "rti-south-b",
    name: "Railway Training Institute (RTI)",
    short_name: "RTI South B",
    category: "college_tvet",
    county: "Nairobi",
    campus: "South B",
    nearby_estates: ["South B", "Plainsview", "Mariakani", "Hazina", "South C", "Nairobi West"]
  },
  {
    id: "kabete-poly",
    name: "Kabete National Polytechnic",
    short_name: "Kabete Poly",
    category: "college_tvet",
    county: "Nairobi",
    campus: "Lower Kabete",
    nearby_estates: ["Lower Kabete", "Kabete", "Wangige", "Uthiru", "Loresho", "Spring Valley"]
  },
  {
    id: "ntti-ngara",
    name: "Nairobi Technical Training Institute (NTTI)",
    short_name: "Nairobi Tech (NTTI)",
    category: "college_tvet",
    county: "Nairobi",
    campus: "Ngara",
    nearby_estates: ["Ngara", "Pangani", "Parklands", "CBD", "Guru Nanak", "Desai Road"]
  },

  // KIAMBU
  {
    id: "jkuat-juja",
    name: "Jomo Kenyatta University of Agriculture & Tech (JKUAT)",
    short_name: "JKUAT Juja",
    category: "public_university",
    county: "Kiambu",
    campus: "Juja Main Campus",
    nearby_estates: ["Juja", "Gate C", "Gate A", "Gate B", "High Point", "Gachororo", "Juja Stage", "Kalimoni", "Mirimaini", "Kenyatta Road", "Theta", "Witeithie"]
  },
  {
    id: "mku-thika",
    name: "Mount Kenya University (MKU) - Thika Main",
    short_name: "MKU Thika",
    category: "private_university",
    county: "Kiambu",
    campus: "Thika Main Campus",
    nearby_estates: ["Thika Town", "Section 9", "Makongeni", "Landless", "Kiganjo Thika", "Ngoingwa", "General Kago", "Posta Thika", "Bata", "Chania"]
  },
  {
    id: "zetech-ruiru",
    name: "Zetech University - Ruiru Technology Park",
    short_name: "Zetech Ruiru",
    category: "private_university",
    county: "Kiambu",
    campus: "Ruiru Campus",
    nearby_estates: ["Ruiru Town", "Wataalam", "Githunguri Road", "Kahawa Sukari", "Kahawa Wendani", "Toll Station", "Membley", "Kihunguro", "Kimbo"]
  },
  {
    id: "uon-kikuyu",
    name: "University of Nairobi (UoN) - Kikuyu Campus",
    short_name: "UoN Kikuyu",
    category: "public_university",
    county: "Kiambu",
    campus: "Kikuyu",
    nearby_estates: ["Kikuyu Town", "Thogoto", "Ondiri", "Kidfarmaco", "Zambezi", "Sigona", "Gitaru", "Kamangu"]
  },
  {
    id: "st-pauls-limuru",
    name: "St. Paul's University - Limuru Main",
    short_name: "St. Pauls Limuru",
    category: "private_university",
    county: "Kiambu",
    campus: "Limuru",
    nearby_estates: ["Limuru Town", "Tigoni", "Kabuku", "Ngecha", "Banana", "Ruaka", "Rironi"]
  },
  {
    id: "gretsa-thika",
    name: "Gretsa University",
    short_name: "Gretsa Thika",
    category: "private_university",
    county: "Kiambu",
    campus: "Thika",
    nearby_estates: ["Thika Town", "Section 9", "Makongeni", "Landless", "Kiganjo", "General Kago"]
  },
  {
    id: "thika-tti",
    name: "Thika Technical Training Institute",
    short_name: "Thika TTI",
    category: "college_tvet",
    county: "Kiambu",
    campus: "Thika",
    nearby_estates: ["Thika Town", "Section 9", "Makongeni", "Landless", "Bata", "Hospital area Thika"]
  },

  // NAKURU
  {
    id: "egerton-njoro",
    name: "Egerton University - Njoro Main Campus",
    short_name: "Egerton Njoro",
    category: "public_university",
    county: "Nakuru",
    campus: "Njoro",
    nearby_estates: ["Njoro Town", "Tatton", "Gate", "Njokerio", "Jewel", "Kilimo", "Chesir", "Ngata", "Njoro Canning"]
  },
  {
    id: "egerton-nakuru",
    name: "Egerton University - Nakuru Town Campus",
    short_name: "Egerton Nakuru Town",
    category: "public_university",
    county: "Nakuru",
    campus: "Nakuru CBD",
    nearby_estates: ["Nakuru CBD", "Milimani Nakuru", "Section 58", "Freehold", "Kanu Street", "Pipeline Nakuru", "Shabab", "Kiamunyi"]
  },
  {
    id: "kabarak-nakuru",
    name: "Kabarak University - Main Campus",
    short_name: "Kabarak",
    category: "private_university",
    county: "Nakuru",
    campus: "Kabarak / Rongai",
    nearby_estates: ["Kabarak", "Kiamunyi", "Mercy Njeri", "Olive", "Oloika", "Rongai Nakuru", "Nakuru West"]
  },
  {
    id: "kmtc-nakuru",
    name: "KMTC Nakuru",
    short_name: "KMTC Nakuru",
    category: "college_tvet",
    county: "Nakuru",
    campus: "PGH Nakuru",
    nearby_estates: ["Milimani Nakuru", "Section 58", "Freehold", "Nakuru CBD", "Pipeline"]
  },
  {
    id: "rvist-nakuru",
    name: "Rift Valley Institute of Science and Technology (RVIST)",
    short_name: "RVIST Nakuru",
    category: "college_tvet",
    county: "Nakuru",
    campus: "Njoro Road",
    nearby_estates: ["RVIST area", "Ngata", "Kiamunyi", "Njoro", "Pipeline Nakuru", "Section 58"]
  },

  // UASIN GISHU / ELDORET
  {
    id: "moi-kesses",
    name: "Moi University - Main Campus (Kesses)",
    short_name: "Moi Main (Kesses)",
    category: "public_university",
    county: "Uasin Gishu",
    campus: "Kesses Main Campus",
    nearby_estates: ["Kesses", "Cheboiywo", "Stage", "Talai", "Mageso", "Hill School", "Chirchir", "Eldoret Outskirts"]
  },
  {
    id: "moi-annex",
    name: "Moi University - Annex Law / Town Campus",
    short_name: "Moi Annex Law",
    category: "public_university",
    county: "Uasin Gishu",
    campus: "Annex / Eldoret Town",
    nearby_estates: ["Annex", "Elgon View", "Eldoret CBD", "Pioneer Eldoret", "Langas", "Kapsoya", "Kidiwa"]
  },
  {
    id: "uoe-chepkoilel",
    name: "University of Eldoret (Chepkoilel)",
    short_name: "UoE Chepkoilel",
    category: "public_university",
    county: "Uasin Gishu",
    campus: "Chepkoilel",
    nearby_estates: ["Chepkoilel", "Marura", "Kipkenyo", "University Gate", "Action Estate", "Rock Centre", "Eldoret Town", "Maili Nne"]
  },
  {
    id: "eldoret-poly",
    name: "Eldoret National Polytechnic",
    short_name: "Eldoret Poly",
    category: "college_tvet",
    county: "Uasin Gishu",
    campus: "Eldoret Town",
    nearby_estates: ["Pioneer Eldoret", "Langas", "Elgon View", "Eldoret CBD", "Annex", "Kapsoya"]
  },
  {
    id: "rvtti-eldoret",
    name: "Rift Valley Technical Training Institute (RVTTI)",
    short_name: "RVTTI Eldoret",
    category: "college_tvet",
    county: "Uasin Gishu",
    campus: "Eldoret",
    nearby_estates: ["Pioneer", "Elgon View", "Annex", "Eldoret CBD", "Langas"]
  },

  // KISUMU
  {
    id: "maseno-main",
    name: "Maseno University - Main Campus",
    short_name: "Maseno Main",
    category: "public_university",
    county: "Kisumu",
    campus: "Maseno",
    nearby_estates: ["Maseno Town", "Siriba", "College Gate", "Luanda", "Emusire", "Ekwanda", "Kombewa"]
  },
  {
    id: "maseno-city",
    name: "Maseno University - Kisumu City Campus",
    short_name: "Maseno Kisumu City",
    category: "public_university",
    county: "Kisumu",
    campus: "Kisumu CBD",
    nearby_estates: ["Kisumu CBD", "Milimani Kisumu", "Tom Mboya Estate", "Mamboleo", "Riat", "Migosi", "Kondele", "Nyamasaria"]
  },
  {
    id: "kisumu-poly",
    name: "Kisumu National Polytechnic",
    short_name: "Kisumu Poly",
    category: "college_tvet",
    county: "Kisumu",
    campus: "Kisumu Town",
    nearby_estates: ["Kondele", "Tom Mboya Estate", "Milimani Kisumu", "Migosi", "Nyamasaria", "Manyatta"]
  },
  {
    id: "riat-kisumu",
    name: "Ramogi Institute of Advanced Technology (RIAT)",
    short_name: "RIAT Kisumu",
    category: "college_tvet",
    county: "Kisumu",
    campus: "Riat Hills",
    nearby_estates: ["Riat", "Mamboleo", "Kibos Road", "Migosi", "Kondele", "Kajulu"]
  },

  // MOMBASA & COAST
  {
    id: "tum-mombasa",
    name: "Technical University of Mombasa (TUM)",
    short_name: "TUM Main",
    category: "public_university",
    county: "Mombasa",
    campus: "Tudor",
    nearby_estates: ["Tudor", "Tom Mboya", "Kizingo", "Mombasa CBD", "Nyali", "Makupa", "Majengo Mombasa", "Buxton"]
  },
  {
    id: "pwani-kilifi",
    name: "Pwani University",
    short_name: "Pwani Univ Kilifi",
    category: "public_university",
    county: "Kilifi",
    campus: "Kilifi Main",
    nearby_estates: ["Kilifi Town", "Mnarani", "Sokoni", "Sea Horse", "Kibarani", "Bofa", "Mtwapa"]
  },
  {
    id: "coast-poly",
    name: "Kenya Coast National Polytechnic",
    short_name: "Coast Poly Mombasa",
    category: "college_tvet",
    county: "Mombasa",
    campus: "Mombasa Town",
    nearby_estates: ["Mombasa CBD", "Kizingo", "Tudor", "Majengo", "Nyali", "Makupa"]
  },
  {
    id: "ttuo-voi",
    name: "Taita Taveta University (TTU)",
    short_name: "TTU Voi",
    category: "public_university",
    county: "Taita Taveta",
    campus: "Voi",
    nearby_estates: ["Voi Town", "Ikanga", "Sofia", "Mwakingali", "Caltex Voi", "Mwatate"]
  },

  // NYERI & CENTRAL
  {
    id: "dekut-nyeri",
    name: "Dedan Kimathi University of Technology (DeKUT)",
    short_name: "DeKUT Nyeri",
    category: "public_university",
    county: "Nyeri",
    campus: "Nyeri Main",
    nearby_estates: ["Nyeri Town", "Ring Road", "Kangemi Nyeri", "Mweiga", "Skuta", "Ruring'u", "King'ong'o", "Kamakwa"]
  },
  {
    id: "karatina-univ",
    name: "Karatina University - Main Campus",
    short_name: "Karatina Univ",
    category: "public_university",
    county: "Nyeri",
    campus: "Kagochi",
    nearby_estates: ["Kagochi", "Karatina Town", "Ragati", "Muthua", "General China", "Kirinyaga Road"]
  },
  {
    id: "nyeri-poly",
    name: "Nyeri National Polytechnic",
    short_name: "Nyeri Poly",
    category: "college_tvet",
    county: "Nyeri",
    campus: "Nyeri Town",
    nearby_estates: ["Nyeri Town", "Ring Road", "Skuta", "Ruring'u", "King'ong'o", "Kamakwa"]
  },
  {
    id: "mut-muranga",
    name: "Murang'a University of Technology (MUT)",
    short_name: "MUT Murang'a",
    category: "public_university",
    county: "Murang'a",
    campus: "Murang'a Town",
    nearby_estates: ["Murang'a Town", "Mumbi Estate", "Ihura", "Mukuyu", "Mbiri", "St. Marys"]
  },

  // KAKAMEGA & WESTERN
  {
    id: "mmust-kakamega",
    name: "Masinde Muliro University of Science & Tech (MMUST)",
    short_name: "MMUST Kakamega",
    category: "public_university",
    county: "Kakamega",
    campus: "Kakamega Main",
    nearby_estates: ["Kakamega Town", "Lurambi", "Kefinco", "Amalemba", "Sichirai", "Milimani Kakamega", "Otiende", "Showground Kakamega", "Kambi Somali"]
  },
  {
    id: "sigalagala-poly",
    name: "Sigalagala National Polytechnic",
    short_name: "Sigalagala Poly",
    category: "college_tvet",
    county: "Kakamega",
    campus: "Khayega",
    nearby_estates: ["Khayega", "Sigalagala", "Kakamega Town", "Lurambi", "Musoli"]
  },
  {
    id: "kibabii-bungoma",
    name: "Kibabii University",
    short_name: "Kibabii Bungoma",
    category: "public_university",
    county: "Bungoma",
    campus: "Bungoma",
    nearby_estates: ["Bungoma Town", "Kanduyi", "Kibabii Centre", "Mayanja", "Tuuti", "Kibabii Market"]
  },
  {
    id: "kisii-univ",
    name: "Kisii University - Main Campus",
    short_name: "Kisii University",
    category: "public_university",
    county: "Kisii",
    campus: "Kisii Main",
    nearby_estates: ["Kisii Town", "Mwembe", "Jogoo", "Nyanchwa", "Daraja Mbili", "Milimani Kisii", "Gesonso"]
  },

  // MACHAKOS & EASTERN
  {
    id: "machakos-univ",
    name: "Machakos University",
    short_name: "Machakos Univ",
    category: "public_university",
    county: "Machakos",
    campus: "Machakos Main",
    nearby_estates: ["Machakos Town", "Katoloni", "Eastleigh Machakos", "Miwani", "Kivandini", "Grogon Machakos", "Kola Road"]
  },
  {
    id: "daystar-athi",
    name: "Daystar University - Athi River Campus",
    short_name: "Daystar Athi River",
    category: "private_university",
    county: "Machakos",
    campus: "Athi River",
    nearby_estates: ["Athi River", "Daystar Valley", "Lukenya", "Kitengela", "Mlolongo", "Green Park", "Greatwall Gardens"]
  },
  {
    id: "must-meru",
    name: "Meru University of Science and Technology (MUST)",
    short_name: "MUST Meru",
    category: "public_university",
    county: "Meru",
    campus: "Nchiru",
    nearby_estates: ["Nchiru", "Meru Town", "Makutano Meru", "Maua Road", "Gakoromone", "Kianjai"]
  },
  {
    id: "chuka-univ",
    name: "Chuka University - Main Campus",
    short_name: "Chuka University",
    category: "public_university",
    county: "Tharaka Nithi",
    campus: "Ndagani",
    nearby_estates: ["Ndagani", "Chuka Town", "Mois", "Kajiunduthi", "Igembe", "Rubate"]
  },
  {
    id: "seku-kitui",
    name: "South Eastern Kenya University (SEKU)",
    short_name: "SEKU Kitui",
    category: "public_university",
    county: "Kitui",
    campus: "Kwa Vonza",
    nearby_estates: ["Kwa Vonza", "Kitui Town", "Kanyonyoo", "Lower Yatta", "Maniers"]
  },

  // KAJIADO / RIFT VALLEY
  {
    id: "anu-rongai",
    name: "Africa Nazarene University (ANU)",
    short_name: "ANU Rongai",
    category: "private_university",
    county: "Kajiado",
    campus: "Ongata Rongai",
    nearby_estates: ["Ongata Rongai", "Maasai Lodge", "Nazarene Gate", "Tuala", "Tumaini Rongai", "Kiserian", "Rimpa"]
  },
  {
    id: "maasai-mara-narok",
    name: "Maasai Mara University",
    short_name: "Maasai Mara Narok",
    category: "public_university",
    county: "Narok",
    campus: "Narok Town",
    nearby_estates: ["Narok Town", "Total Narok", "Lenana Narok", "Majengo Narok", "Rotian", "Ololulung'a"]
  },
  {
    id: "laikipia-nyahururu",
    name: "Laikipia University",
    short_name: "Laikipia Univ",
    category: "public_university",
    county: "Laikipia",
    campus: "Nyahururu",
    nearby_estates: ["Nyahururu Town", "Laikipia Main Gate", "Karuga", "Equator", "Maina Estate"]
  }
];

/**
 * Checks whether a listing matches a given university's nearby estates or keywords
 */
export function isListingNearUniversity(property: any, university: University): boolean {
  if (!property || !university) return false;

  const loc = (property.location || "").toLowerCase();
  const estate = (property.estate || "").toLowerCase();
  const title = (property.title || "").toLowerCase();
  const desc = (property.description || "").toLowerCase();
  const county = (property.county || "").toLowerCase();
  const univCounty = (university.county || "").toLowerCase();

  // If counties are different and neither is general, check location carefully
  const combinedText = `${loc} ${estate} ${title} ${desc}`;

  // Check if any nearby estate matches
  for (const nearby of university.nearby_estates) {
    const term = nearby.toLowerCase().trim();
    if (term.length > 2 && combinedText.includes(term)) {
      return true;
    }
  }

  // Check if short name or campus keyword is mentioned
  if (university.short_name) {
    const shortTerm = university.short_name.toLowerCase();
    if (combinedText.includes(shortTerm)) return true;
  }

  if (university.campus) {
    const campusTerm = university.campus.toLowerCase();
    if (campusTerm.length > 3 && combinedText.includes(campusTerm)) return true;
  }

  return false;
}
