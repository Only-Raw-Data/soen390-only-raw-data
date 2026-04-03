export const CLASS_PREFIXES: string[] = [
  // Faculty of Arts and Science
  "AHSC", "BIOL", "CHEM", "CLAS", "MARA", "MCHI", "GERM", "ITAL", "SPAN", "LING", "HEBR",
  "MGRK", "MODL", "MRUS", "COMS", "ECON", "ADED", "EDUC", "ESL", "INST", "LIBS", "TESL",
  "ENGL", "FRAI", "FRAN", "FRAA", "FLIT", "FTRA", "CATA", "EXCI", "KCEP", "GEOG", "GEOL",
  "URBS", "HIST", "LAWS", "BLST", "INOV", "INTE", "JOUR", "ACTU", "MACF", "MATH", "MAST",
  "STAT", "PHIL", "PHYS", "POLI", "NEUR", "PSYC", "RELI", "ANTH", "SOCI", "THEO", "LBCL",
  "LOYC", "IRST", "FPST", "ILBE", "SCPA", "SCOL", "SFYX", "SSDB", "WSDB",
  // Gina Cody School of Engineering and Computer Science
  "ENCS", "ENGR", "AERO", "BCEE", "BLDG", "CHME", "CIVI", "COEN", "ELEC", "IADI", "INDU",
  "MECH", "MIAE", "COMP", "SOEN",
  // John Molson School of Business
  "COMM", "ACCO", "BSTA", "BTM", "SCOM", "FINA", "MARK", "MANA", "HRM", "ADIP",
  // Faculty of Fine Arts
  "FFAR", "FASS", "ARTE", "ARTH", "FMST", "FMAN", "FMPR", "CATS", "ATRP", "DTHY", "MTHY",
  "CART", "DART", "ARTX", "ARTT", "CERA", "DRAW", "FBRS", "IMCA", "PTNG", "PHOT", "PRIN",
  "SCUL", "VDEO", "DANC",
];

export function isClassEvent(title: string): boolean {
  const upper = title.toUpperCase();
  return CLASS_PREFIXES.some((prefix) => upper.startsWith(prefix));
}
