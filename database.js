const movies = [
{
title: "Heneral Luna",
year: 2015,
genre: "Historical, Biographical, Action",
mainLeads: ["John Arcilla", "Mon Confiado", "Arron Villaflor"],
synopsis: "Set during the Philippine-American War, the film follows General Antonio Luna, a brilliant yet hot-headed military leader determined to unite Filipino forces against American occupation. As Luna fights courageously on the battlefield, he also faces betrayal, corruption, and political conflict within his own ranks. His intense personality and uncompromising ideals create enemies among fellow Filipinos, leading to tragic consequences that shape the nation’s history.",
poster: "https://images.squarespace-cdn.com/content/v1/5a1ce2ac1f318d6ebcd77607/1526177109740-TU6EAYDXDWJL8BU4E6IB/Heneral+Luna+-+poster.jpg"
},

{
title: "Kita Kita",
year: 2017,
genre: "Romance, Comedy, Drama",
mainLeads: ["Alessandra de Rossi", "Empoy Marquez"],
synopsis: "Lea, a Filipina tour guide living in Japan, temporarily loses her eyesight after discovering her fiancé’s betrayal. Depressed and isolated, she unexpectedly meets Tonyo, a cheerful and persistent Filipino who slowly brings happiness back into her life. As the two spend more time together exploring the streets of Sapporo, their friendship blossoms into a heartfelt connection that teaches Lea how to love and trust again.",
poster: "https://3.bp.blogspot.com/-uwoV2BfimyA/WVy3ja8KJHI/AAAAAAAApLI/xiK3nwCyvEg9GpsPMjvebSYFBbHGwA96wCLcBGAs/s1600/Kita-Kita.jpg"
},

{
title: "On the Job",
year: 2013,
genre: "Crime, Thriller, Action",
mainLeads: ["Piolo Pascual", "Gerald Anderson", "Joel Torre"],
synopsis: "Inside the corrupt underworld of Manila, prison inmates are secretly released by powerful officials to carry out assassinations before returning unnoticed to jail. A veteran hitman and his young apprentice become entangled in a dangerous network of crime and politics while two law enforcers attempt to uncover the truth. As loyalties are tested and violence escalates, the film exposes the dark realities of corruption and survival.",
poster: "https://cityonfire.com/wp-content/uploads/2021/10/on-the-job-hbo.jpg"
},

{
title: "That Thing Called Tadhana",
year: 2014,
genre: "Romance, Drama",
mainLeads: ["Angelica Panganiban", "JM de Guzman"],
synopsis: "After suffering heartbreak, Mace meets Anthony at an airport in Rome when both encounter travel complications. The strangers decide to journey together through different places while sharing stories about love, pain, and missed chances. Along the way, their growing connection helps them heal emotionally and rediscover hope, proving that sometimes destiny appears when least expected.",
poster: "https://i.pinimg.com/originals/7f/01/b4/7f01b45d9863a75578213bfe06d2505b.jpg"
},

{
title: "Four Sisters and a Wedding",
year: 2013,
genre: "Family, Drama, Comedy",
mainLeads: ["Toni Gonzaga", "Bea Alonzo", "Angel Locsin", "Shaina Magdayao"],
synopsis: "Four sisters reunite after learning that their younger brother plans to marry someone they barely know. Determined to stop the wedding, old family issues and personal resentments resurface during their time together. Through emotional confrontations, humor, and painful truths, the siblings rediscover the importance of family, forgiveness, and unconditional love.",
poster: "images/four-sisters-and-a-wedding.jpg"
},

{
title: "Hello, Love, Goodbye",
year: 2019,
genre: "Romance, Drama",
mainLeads: ["Kathryn Bernardo", "Alden Richards"],
synopsis: "Joy is an ambitious overseas Filipino worker in Hong Kong struggling to support her family while dreaming of a better future in Canada. She meets Ethan, a charming bartender who hides his own emotional burdens behind humor and optimism. As their romance deepens, the two are forced to choose between love and personal ambitions, realizing that timing and sacrifice play important roles in relationships.",
poster: "https://m.media-amazon.com/images/M/MV5BZTdjMmM3N2YtNGY1Yy00M2JhLTkxMjktZGFhMTRhNTUzYTNjXkEyXkFqcGc@._V1_FMjpg_UX1000_.jpg"
},

{
title: "The Hows of Us",
year: 2018,
genre: "Romance, Drama",
mainLeads: ["Kathryn Bernardo", "Daniel Padilla"],
synopsis: "Primo and George are a young couple deeply in love and determined to build a future together. They invest everything they have into achieving their dreams, including purchasing a home and supporting each other’s careers. However, financial struggles, emotional exhaustion, and personal insecurities slowly place pressure on their relationship, forcing them to confront whether love alone is enough to keep them together.",
poster: "https://m.media-amazon.com/images/M/MV5BMWQxZTA3YjgtZmE0MC00NGVmLTkyMzItZDA3Nzk1ZmRjN2YzXkEyXkFqcGc@._V1_.jpg"
},

{
title: "Starting Over Again",
year: 2014,
genre: "Romance, Drama",
mainLeads: ["Piolo Pascual", "Toni Gonzaga"],
synopsis: "Ginny once gave up everything for her boyfriend Marco, only to be left heartbroken after he abruptly ended their relationship. Years later, the former lovers unexpectedly meet again, forcing them to revisit painful memories and unresolved emotions. As they reconnect, both must decide whether their love deserves another chance or if some relationships are better left in the past.",
poster: "https://www.themoviedb.org/t/p/original/rYhlpMYHmnBkZSw8zwvHFK4p620.jpg"
},

{
title: "Seven Sundays",
year: 2017,
genre: "Family, Drama",
mainLeads: ["Aga Muhlach", "Dingdong Dantes", "Cristine Reyes", "Enrique Gil"],
synopsis: "After learning that their father has a terminal illness, four estranged siblings are forced to spend time together every Sunday. While trying to care for their father, they confront long-standing misunderstandings, jealousy, and emotional wounds within the family. Through laughter, arguments, and heartfelt moments, they slowly rebuild the bond they once shared.",
poster: "https://tse3.mm.bing.net/th/id/OIP.Wp3DKzq1mJQwC53rWv0DrAHaKq?pid=Api&P=0&h=180"
},

{
title: "Seklusyon",
year: 2016,
genre: "Horror, Mystery",
mainLeads: ["Rhed Bustamante", "Neil Ryan Sese", "Dominic Roque"],
synopsis: "A group of deacons preparing for priesthood undergoes a sacred retreat inside a secluded convent where they must remain isolated from the outside world. During their stay, terrifying supernatural events begin to occur, challenging their faith and sanity. As dark secrets unfold, the young men realize that evil may be lurking within the convent itself.",
poster: "https://radar.ph/wp-content/uploads/2025/11/Seklusyon-768x1110.jpg"
},
{
title: "Goyo: The Boy General",
year: 2018,
genre: "Historical, Drama, Action",
mainLeads: ["Paolo Avelino", "Mon Confiado"],
synopsis: "After the death of General Antonio Luna, the young General Gregorio 'Goyo' del Pilar struggles to balance loyalty, ambition, and the Filipino fight for independence. As the country faces betrayal and foreign pressure, Goyo's ideals are tested in the chaos of war.",
poster: "https://m.media-amazon.com/images/M/MV5BMjY1MjNiNmQtMDU1Mi00ZTAyLWIyYTAtNWI4NjYyODRlMzYyXkEyXkFqcGdeQXVyNjUwMzkyOQ@@._V1_.jpg"
},
{
title: "Birdshot",
year: 2016,
genre: "Thriller, Drama",
mainLeads: ["Mary Joy Apostol", "John Arcilla"],
synopsis: "A young farm girl shoots a rare Philippine eagle, setting off a violent chain of events. A rookie cop and a scientist race to uncover the truth while powerful forces attempt to hide the murder and preserve their own secrets.",
poster: "https://cdn.mos.cms.futurecdn.net/QDmpE8GNE5v8a6NHfC2fsY-650-80.jpg"
},
{
title: "Ang Babae sa Septic Tank",
year: 2011,
genre: "Comedy, Satire",
mainLeads: ["Eugene Domingo", "Jasmine Curtis-Smith"],
synopsis: "An aspiring indie filmmaker obsesses over making a socially relevant film to impress producers. His chaotic passion project exposes the absurdities of show business, art, and the Philippine indie scene.",
poster: "https://upload.wikimedia.org/wikipedia/en/9/90/Ang_Babae_sa_Septic_Tank_poster.jpg"
},
{
title: "Goyo: Ang Batang Heneral",
year: 2018,
genre: "Historical, Drama",
mainLeads: ["Paolo Avelino", "Mon Confiado"],
synopsis: "The journey of Gregorio 'Goyo' del Pilar continues as he struggles with the burdens of leadership, honor, and the fight for Philippine independence in the wake of Luna's death.",
poster: "https://m.media-amazon.com/images/M/MV5BNjY1OGM0NWYtZjIyOS00ZDZkLWJkNTAtYjczNTY3NjI2ZTVlXkEyXkFqcGdeQXVyNDQ2MTMzODA@._V1_.jpg"
},
{
title: "Fan Girl",
year: 2020,
genre: "Drama, Thriller",
mainLeads: ["Sofia Andres", "Angelo Ilagan"],
synopsis: "A teenage fan sneaks into her idol's life for a backstage story, but what she discovers is much darker than she ever expected. Her passion becomes a dangerous game when the truth proves more destructive than the fantasy.",
poster: "https://m.media-amazon.com/images/M/MV5BYjI1N2VmMGItOTdiNC00YmQxLTljZGUtNDc2M2Y0ZDk2MzQwXkEyXkFqcGdeQXVyNDkyNjAzNzI@._V1_.jpg"
}
];

const defaultAdminTheaters = [
    { id: 101, name: 'Bronze', totalSeats: 240, seatPrice: 180, availableSeats: 240 },
    { id: 102, name: 'Silver', totalSeats: 240, seatPrice: 200, availableSeats: 240 },
    { id: 103, name: 'Gold', totalSeats: 240, seatPrice: 220, availableSeats: 240 }
];

const defaultAdminShowtimes = [
    { id: 201, movie: 'Heneral Luna', movieTitle: 'Heneral Luna', theaterId: 101, theaterName: 'Bronze', date: '2026-06-20', time: '14:00' },
    { id: 202, movie: 'Heneral Luna', movieTitle: 'Heneral Luna', theaterId: 102, theaterName: 'Silver', date: '2026-06-20', time: '15:00' },
    { id: 203, movie: 'Heneral Luna', movieTitle: 'Heneral Luna', theaterId: 103, theaterName: 'Gold', date: '2026-06-20', time: '16:00' }
];

window.CineBookSeedData = {
    movies,
    defaultAdminTheaters,
    defaultAdminShowtimes
};
