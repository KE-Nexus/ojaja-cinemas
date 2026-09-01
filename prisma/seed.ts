import { PrismaClient, SeatCategory, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { fetchNowPlaying, fetchUpcoming, type ImportedMovie } from "../src/lib/every-film";
import { CLAIM_DEFINITIONS, DEFAULT_ROLE_CLAIMS } from "../src/lib/claims";

const prisma = new PrismaClient();

function poster(seed: string) {
  return `https://picsum.photos/seed/${seed}/600/900`;
}
function backdrop(seed: string) {
  return `https://picsum.photos/seed/${seed}-wide/1600/700`;
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type SeedMovie = {
  everyFilmId: string | null;
  slug: string;
  title: string;
  synopsis: string;
  posterUrl: string;
  backdropUrl: string | null;
  trailerUrl: string | null;
  genres: string;
  classification: string;
  language: string;
  runtimeMins: number;
  cast: string;
  director: string | null;
  releaseDate: Date;
  status: "NOW_SHOWING" | "COMING_SOON";
};

async function buildMovieSeedData(): Promise<SeedMovie[]> {
  console.log("Importing real now-showing/upcoming movies from every.film...");
  try {
    const [nowPlaying, upcomingRaw] = await Promise.all([fetchNowPlaying(10), fetchUpcoming(16)]);
    // every.film's "upcoming" list occasionally includes re-releases of classics whose
    // resolved release date still lands in the past — never seed those as Coming Soon.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcoming = upcomingRaw.filter((m) => new Date(m.releaseDate) >= today).slice(0, 8);
    const usedSlugs = new Set<string>();

    const toSeedMovie = (m: ImportedMovie, status: "NOW_SHOWING" | "COMING_SOON"): SeedMovie => {
      const base = slugify(m.title);
      let slug = base;
      let n = 1;
      while (usedSlugs.has(slug)) slug = `${base}-${++n}`;
      usedSlugs.add(slug);

      return {
        everyFilmId: m.everyFilmId,
        slug,
        title: m.title,
        synopsis: m.synopsis,
        posterUrl: m.posterUrl || poster(slug),
        backdropUrl: m.backdropUrl,
        trailerUrl: m.trailerUrl,
        genres: m.genres,
        classification: m.classification,
        language: m.language,
        runtimeMins: m.runtimeMins,
        cast: m.cast,
        director: m.director,
        releaseDate: new Date(m.releaseDate),
        status,
      };
    };

    const seedMovies = [
      ...nowPlaying.map((m) => toSeedMovie(m, "NOW_SHOWING")),
      ...upcoming.map((m) => toSeedMovie(m, "COMING_SOON")),
    ];

    if (seedMovies.length > 0) return seedMovies;
    console.warn("every.film returned no movies — falling back to the built-in fictional catalog.");
  } catch (err) {
    console.error("every.film import failed, falling back to the built-in fictional catalog:", err);
  }

  return MOVIES.map((m) => ({
    everyFilmId: null,
    slug: m.slug,
    title: m.title,
    synopsis: m.synopsis,
    posterUrl: poster(m.slug),
    backdropUrl: backdrop(m.slug),
    trailerUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    genres: m.genres,
    classification: m.classification,
    language: m.language,
    runtimeMins: m.runtimeMins,
    cast: m.cast,
    director: m.director,
    releaseDate: daysFromNow(m.releaseDateOffsetDays, 0),
    status: m.status,
  }));
}

const MOVIES = [
  {
    slug: "the-last-heirloom",
    title: "The Last Heirloom",
    synopsis:
      "When a Lagos jewel appraiser uncovers a forged inheritance at the heart of her family's estate, she must decide between the truth and the fortune that built her name.",
    genres: "Drama, Thriller",
    classification: "15",
    language: "English",
    runtimeMins: 128,
    cast: "Genevieve Eboh, Tunde Alade, Ify Obiora",
    director: "Kemi Adewale",
    releaseDateOffsetDays: -14,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "danfo-nights",
    title: "Danfo Nights",
    synopsis: "Four strangers share a danfo bus stranded in Lagos traffic — and a night none of them will forget.",
    genres: "Comedy, Drama",
    classification: "12",
    language: "English/Pidgin",
    runtimeMins: 104,
    cast: "Bimbo Ade, Chuka Nnamdi, Toyin Bello",
    director: "Segun Rotimi",
    releaseDateOffsetDays: -7,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "iron-tide",
    title: "Iron Tide",
    synopsis: "A deep-sea salvage crew off the Gulf of Guinea awakens something that was never meant to surface.",
    genres: "Action, Sci-Fi",
    classification: "15",
    language: "English",
    runtimeMins: 137,
    cast: "Daniel Okoro, Marcus Reyes, Aisha Bello",
    director: "Frank Ihejirika",
    releaseDateOffsetDays: -3,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "queens-of-agbara",
    title: "Queens of Àgbàrá",
    synopsis: "Three warrior-queens unite ancient kingdoms against an invading empire in this sweeping historical epic.",
    genres: "Epic, Action, History",
    classification: "12",
    language: "Yoruba (subtitled)",
    runtimeMins: 145,
    cast: "Bukky Fashina, Wale Ojo, Nkechi Umeh",
    director: "Adaeze Nwosu",
    releaseDateOffsetDays: -1,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "midnight-frequency",
    title: "Midnight Frequency",
    synopsis: "A late-night radio host in Abuja starts receiving calls from a listener who knows things that haven't happened yet.",
    genres: "Thriller, Mystery",
    classification: "15",
    language: "English",
    runtimeMins: 112,
    cast: "Tope Adisa, Grace Effiong, Simon Katz",
    director: "Kemi Adewale",
    releaseDateOffsetDays: -20,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "the-wedding-price",
    title: "The Wedding Price",
    synopsis: "Two families, one venue, and a wedding planner caught in the middle — a romantic comedy about love and leverage.",
    genres: "Romance, Comedy",
    classification: "PG",
    language: "English",
    runtimeMins: 118,
    cast: "Chidinma Okeke, Richard Mofe, Ijeoma Duru",
    director: "Segun Rotimi",
    releaseDateOffsetDays: -10,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "sky-runners",
    title: "Sky Runners",
    synopsis: "An animated adventure following a young glider pilot racing to save her floating city before it falls from the sky.",
    genres: "Animation, Family, Adventure",
    classification: "G",
    language: "English",
    runtimeMins: 96,
    cast: "Voices of Debby Umeh, Femi Aro, Sandra Ike",
    director: "Paul Chidozie",
    releaseDateOffsetDays: -5,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "vendetta-road",
    title: "Vendetta Road",
    synopsis: "A retired convoy driver is pulled back into the underworld for one last job that isn't what it seems.",
    genres: "Action, Crime",
    classification: "18",
    language: "English",
    runtimeMins: 121,
    cast: "Marcus Reyes, Daniel Okoro, Halima Suleiman",
    director: "Frank Ihejirika",
    releaseDateOffsetDays: -2,
    status: "NOW_SHOWING" as const,
  },
  {
    slug: "the-orchard-house",
    title: "The Orchard House",
    synopsis: "A grieving architect inherits a crumbling estate and the family secrets buried beneath its orchard.",
    genres: "Drama, Mystery",
    classification: "15",
    language: "English",
    runtimeMins: 124,
    cast: "Ify Obiora, Wale Ojo, Grace Effiong",
    director: "Adaeze Nwosu",
    releaseDateOffsetDays: 10,
    status: "COMING_SOON" as const,
  },
  {
    slug: "starlight-academy",
    title: "Starlight Academy",
    synopsis: "A scholarship kid enrolls at Nigeria's most elite music academy and shakes up its stuffiest traditions.",
    genres: "Musical, Family",
    classification: "PG",
    language: "English",
    runtimeMins: 108,
    cast: "Sandra Ike, Toyin Bello, Chuka Nnamdi",
    director: "Paul Chidozie",
    releaseDateOffsetDays: 21,
    status: "COMING_SOON" as const,
  },
  {
    slug: "harmattan",
    title: "Harmattan",
    synopsis: "As dust storms sweep the north, a village must choose between an old rivalry and a shared survival.",
    genres: "Drama",
    classification: "12",
    language: "Hausa (subtitled)",
    runtimeMins: 116,
    cast: "Halima Suleiman, Tunde Alade, Simon Katz",
    director: "Kemi Adewale",
    releaseDateOffsetDays: 35,
    status: "COMING_SOON" as const,
  },
  {
    slug: "the-algorithm",
    title: "The Algorithm",
    synopsis: "A Yaba startup's fraud-detection AI starts flagging its own founders — and it isn't wrong.",
    genres: "Thriller, Sci-Fi",
    classification: "15",
    language: "English",
    runtimeMins: 119,
    cast: "Grace Effiong, Marcus Reyes, Bimbo Ade",
    director: "Frank Ihejirika",
    releaseDateOffsetDays: 45,
    status: "COMING_SOON" as const,
  },
];

const CONCESSIONS = [
  { name: "Classic Popcorn (Regular)", description: "Freshly popped, lightly salted.", itemClass: "Concessions", itemGroup: "Popcorn", defaultPrice: 1500 },
  { name: "Classic Popcorn (Large)", description: "Freshly popped, lightly salted — the big one.", itemClass: "Concessions", itemGroup: "Popcorn", defaultPrice: 2200 },
  { name: "Nachos & Cheese", description: "Crisp nachos with warm cheese sauce.", itemClass: "Concessions", itemGroup: "Snacks", defaultPrice: 2500 },
  { name: "Soft Drink (Regular)", description: "Coke, Fanta, or Sprite.", itemClass: "Concessions", itemGroup: "Drinks", defaultPrice: 1000 },
  { name: "Combo: Popcorn + 2 Drinks", description: "Large popcorn with two regular soft drinks.", itemClass: "Concessions", itemGroup: "Combos", defaultPrice: 4000 },
  { name: "Hot Dog", description: "Grilled hot dog with your choice of sauce.", itemClass: "Concessions", itemGroup: "Snacks", defaultPrice: 2000 },
];

function daysFromNow(offset: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Seeding OJAJA Cinemas...");

  // ---------- Users ----------
  const passwordHash = await bcrypt.hash("Password123!", 12);

  const [circuitAdmin, supervisor, ticketer, accountant, technician, auditor, customer] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@ojaja.cinema" },
      update: {},
      create: { name: "Ada Obinna", email: "admin@ojaja.cinema", phone: "+2348010000001", passwordHash, role: "CIRCUIT_ADMIN" },
    }),
    prisma.user.upsert({
      where: { email: "manager@ojaja.cinema" },
      update: {},
      create: { name: "Bayo Salako", email: "manager@ojaja.cinema", phone: "+2348010000002", passwordHash, role: "SUPERVISOR" },
    }),
    prisma.user.upsert({
      where: { email: "boxoffice@ojaja.cinema" },
      update: {},
      create: { name: "Ronke Idris", email: "boxoffice@ojaja.cinema", phone: "+2348010000003", passwordHash, role: "TICKETER" },
    }),
    prisma.user.upsert({
      where: { email: "accountant@ojaja.cinema" },
      update: {},
      create: { name: "Emeka Uzo", email: "accountant@ojaja.cinema", phone: "+2348010000004", passwordHash, role: "ACCOUNTANT" },
    }),
    prisma.user.upsert({
      where: { email: "technician@ojaja.cinema" },
      update: {},
      create: { name: "Femi Kalu", email: "technician@ojaja.cinema", phone: "+2348010000006", passwordHash, role: "TECHNICIAN" },
    }),
    prisma.user.upsert({
      where: { email: "auditor@ojaja.cinema" },
      update: {},
      create: { name: "Ngozi Eze", email: "auditor@ojaja.cinema", phone: "+2348010000007", passwordHash, role: "AUDITOR" },
    }),
    prisma.user.upsert({
      where: { email: "customer@example.com" },
      update: {},
      create: { name: "Chioma Nwafor", email: "customer@example.com", phone: "+2348010000005", passwordHash, role: "CUSTOMER", loyaltyPoints: 240 },
    }),
  ]);

  // ---------- Branches & Auditoriums & Seats ----------
  const branchDefs = [
    {
      slug: "ile-ife",
      name: "OJAJA Ile-Ife",
      address: "African Village @ Ife Grand Resort and Industrial Hub",
      city: "Ile-Ife, Osun State",
      phone: "+234 36 700 1000",
      openingHours: "Daily 10:00–23:00",
      lat: 7.4667,
      lng: 4.5667,
      auditoriums: [
        { name: "Screen 1", screenType: "IMAX", rows: 8, seatsPerRow: 14 },
        { name: "Screen 2", screenType: "Standard", rows: 7, seatsPerRow: 12 },
        { name: "Screen 3", screenType: "Recliner Suite", rows: 5, seatsPerRow: 8 },
      ],
    },
    {
      slug: "lagos",
      name: "OJAJA Lagos",
      address: "Ojaja Park, Ogombo, Ajah",
      city: "Lagos",
      phone: "+234 1 700 2000",
      openingHours: "Mon–Thu 10:00–23:00 · Fri–Sun 10:00–01:00",
      lat: 6.4698,
      lng: 3.6015,
      auditoriums: [
        { name: "Screen 1", screenType: "Standard", rows: 7, seatsPerRow: 12 },
        { name: "Screen 2", screenType: "Standard", rows: 6, seatsPerRow: 10 },
      ],
    },
    {
      slug: "akure",
      name: "OJAJA Akure",
      address: "Ojaja Park, Alagbaka",
      city: "Akure, Ondo State",
      phone: "+234 34 700 3000",
      openingHours: "Daily 11:00–23:00",
      lat: 7.2571,
      lng: 5.2058,
      auditoriums: [
        { name: "Screen 1", screenType: "Standard", rows: 7, seatsPerRow: 12 },
        { name: "Screen 2", screenType: "Recliner Suite", rows: 5, seatsPerRow: 8 },
      ],
    },
  ];

  const auditoriumIds: { id: string; branchId: string; rows: number; seatsPerRow: number }[] = [];

  for (const b of branchDefs) {
    const branch = await prisma.branch.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        slug: b.slug,
        name: b.name,
        address: b.address,
        city: b.city,
        phone: b.phone,
        openingHours: b.openingHours,
        lat: b.lat,
        lng: b.lng,
      },
    });

    for (const a of b.auditoriums) {
      const existing = await prisma.auditorium.findFirst({ where: { branchId: branch.id, name: a.name } });
      const auditorium =
        existing ??
        (await prisma.auditorium.create({
          data: {
            branchId: branch.id,
            name: a.name,
            screenType: a.screenType,
            rows: a.rows,
            seatsPerRow: a.seatsPerRow,
          },
        }));

      auditoriumIds.push({ id: auditorium.id, branchId: branch.id, rows: a.rows, seatsPerRow: a.seatsPerRow });

      const seatCount = await prisma.seat.count({ where: { auditoriumId: auditorium.id } });
      if (seatCount === 0) {
        const rowLetters = "ABCDEFGHIJ".slice(0, a.rows).split("");
        const seatsToCreate: { auditoriumId: string; row: string; number: number; category: SeatCategory }[] = [];
        rowLetters.forEach((row, rowIndex) => {
          for (let n = 1; n <= a.seatsPerRow; n++) {
            let category: SeatCategory = "STANDARD";
            if (a.screenType === "Recliner Suite") category = "RECLINER";
            else if (rowIndex >= a.rows - 2) category = "PREMIUM";
            if (row === rowLetters[0] && (n === 1 || n === a.seatsPerRow)) category = "ACCESSIBLE";
            seatsToCreate.push({ auditoriumId: auditorium.id, row, number: n, category });
          }
        });
        await prisma.seat.createMany({ data: seatsToCreate });
      }
    }
  }

  // ---------- Movies ----------
  const seedMovies = await buildMovieSeedData();
  const movieIds: { id: string; status: string }[] = [];
  for (const m of seedMovies) {
    const movie = await prisma.movie.upsert({
      where: { slug: m.slug },
      update: {},
      create: {
        everyFilmId: m.everyFilmId,
        title: m.title,
        slug: m.slug,
        synopsis: m.synopsis,
        posterUrl: m.posterUrl,
        backdropUrl: m.backdropUrl,
        trailerUrl: m.trailerUrl,
        genres: m.genres,
        classification: m.classification,
        language: m.language,
        runtimeMins: m.runtimeMins,
        cast: m.cast,
        director: m.director,
        releaseDate: m.releaseDate,
        status: m.status,
      },
    });
    movieIds.push({ id: movie.id, status: m.status });
  }

  // ---------- Showtimes (for now-showing movies, next 7 days) ----------
  // Not every movie plays at every branch — mirrors real multiplex distribution
  // (wide releases everywhere, smaller titles limited to one or two cinemas) and
  // makes location-aware "Now Showing" listings actually differ between branches.
  const nowShowing = movieIds.filter((m) => m.status === "NOW_SHOWING");
  const hours = [12, 15, 18, 21];
  const branchIdsInOrder = Array.from(new Set(auditoriumIds.map((a) => a.branchId)));

  // ---------- Assign seeded staff to a home branch ----------
  // CircuitAdmin stays circuit-wide (no single branch); everyone else gets a home
  // cinema and an employee number so the Staff page has real, filterable data.
  const staffAssignments = [
    { user: supervisor, code: "SUP" },
    { user: ticketer, code: "TCK" },
    { user: accountant, code: "ACC" },
    { user: technician, code: "TEC" },
    { user: auditor, code: "AUD" },
  ];
  for (const [i, { user, code }] of staffAssignments.entries()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        branchId: branchIdsInOrder[i % branchIdsInOrder.length],
        staffNumber: user.staffNumber ?? `STF-${code}-001`,
      },
    });
  }

  const existingShowtimeCount = await prisma.showtime.count();
  if (existingShowtimeCount === 0) {
    for (let i = 0; i < nowShowing.length; i++) {
      let assignedBranchIds: string[];
      if (i % 4 === 0) assignedBranchIds = branchIdsInOrder; // wide release — every branch
      else if (i % 4 === 1 || i % 4 === 2) assignedBranchIds = branchIdsInOrder.slice(0, 2); // two branches
      else assignedBranchIds = [branchIdsInOrder[i % branchIdsInOrder.length]]; // one branch only

      const auditoriumsForMovie = auditoriumIds.filter((a) => assignedBranchIds.includes(a.branchId));

      for (let day = 0; day < 7; day++) {
        const auditorium = auditoriumsForMovie[(i + day) % auditoriumsForMovie.length];
        const hour = hours[(i + day) % hours.length];
        await prisma.showtime.create({
          data: {
            movieId: nowShowing[i].id,
            auditoriumId: auditorium.id,
            startTime: daysFromNow(day, hour, i % 2 === 0 ? 0 : 30),
            basePrice: 3500 + (hour >= 18 ? 1000 : 0),
            language: "English",
            format: auditorium.id.length % 2 === 0 ? "2D" : "3D",
          },
        });
      }
    }
  }

  // ---------- POS Items (HO catalog + per-location activation) ----------
  for (const c of CONCESSIONS) {
    const existingHoItem = await prisma.posItem.findFirst({ where: { branchId: null, name: c.name } });
    if (!existingHoItem) {
      await prisma.posItem.create({ data: { ...c, branchId: null } });
    }

    for (const branchId of branchIdsInOrder) {
      const existingLocationItem = await prisma.posItem.findFirst({ where: { branchId, name: c.name } });
      if (!existingLocationItem) {
        await prisma.posItem.create({ data: { ...c, branchId } });
      }
    }
  }

  // ---------- Promo Codes ----------
  await prisma.promoCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", discountType: "PERCENT", discountValue: 10, isActive: true },
  });
  await prisma.promoCode.upsert({
    where: { code: "OJAJA2000" },
    update: {},
    create: { code: "OJAJA2000", discountType: "FIXED", discountValue: 2000, isActive: true },
  });

  // ---------- Reviews ----------
  const reviewTargets = movieIds.slice(0, 4);
  const reviewSamples = [
    { rating: 5, comment: "Absolutely gripping from start to finish — the sound design at Ile-Ife's IMAX screen made it even better." },
    { rating: 4, comment: "Great performances, pacing dragged a little in the second act but stuck the landing." },
    { rating: 5, comment: "Took the whole family, even my mother-in-law loved it. Book early, it sells out fast!" },
  ];
  for (const target of reviewTargets) {
    for (const r of reviewSamples) {
      const existing = await prisma.review.findFirst({ where: { movieId: target.id, userId: customer.id, comment: r.comment } });
      if (!existing) {
        await prisma.review.create({
          data: { movieId: target.id, userId: customer.id, rating: r.rating, comment: r.comment, status: "APPROVED" },
        });
      }
    }
  }

  // ---------- Claims & default role permissions ----------
  const claimByKey = new Map<string, string>();
  for (const c of CLAIM_DEFINITIONS) {
    const claim = await prisma.claim.upsert({ where: { key: c.key }, update: { label: c.label }, create: c });
    claimByKey.set(c.key, claim.id);
  }
  for (const [role, keys] of Object.entries(DEFAULT_ROLE_CLAIMS) as [Role, string[]][]) {
    for (const key of keys) {
      const claimId = claimByKey.get(key);
      if (!claimId) continue;
      await prisma.roleClaim.upsert({
        where: { role_claimId: { role, claimId } },
        update: {},
        create: { role, claimId },
      });
    }
  }

  console.log("Seed complete.");
  console.log("Demo accounts (password: Password123!):");
  console.log(`  Circuit Admin: ${circuitAdmin.email}`);
  console.log(`  Supervisor:    ${supervisor.email}`);
  console.log(`  Ticketer:      ${ticketer.email}`);
  console.log(`  Accountant:    ${accountant.email}`);
  console.log(`  Technician:    ${technician.email}`);
  console.log(`  Auditor:       ${auditor.email}`);
  console.log(`  Customer:      ${customer.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
