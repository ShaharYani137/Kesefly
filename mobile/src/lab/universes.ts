/**
 * Symbol lists the Lab scanner can run on, besides the user's watchlist and holdings.
 *
 * KESEFLY DESIGN DECISION: fixed snapshots (index members change a few times a year; a
 * missing or extra name only changes what the scan looks at, not any math). Yahoo symbols
 * (BRK-B, .TA for Tel Aviv). Every TA-35 symbol is checked against the app's TASE list.
 */
export type UniverseId =
  | 'mine'
  | 'sp100'
  | 'ndx100'
  | 'dow30'
  | 'etfs'
  | 'israelUS'
  | 'tech'
  | 'banks'
  | 'energy'
  | 'health'
  | 'ta35'
  | 'ta125'
  | 'ta90'
  | 'taBanks'
  | 'taRealEstate'
  | 'taTech'
  | 'taFinance'
  | 'taEnergy';

/** Order shown in the scanner. */
export const UNIVERSES: UniverseId[] = [
  'mine',
  'ta35',
  'ta125',
  'ta90',
  'taBanks',
  'taRealEstate',
  'taTech',
  'taFinance',
  'taEnergy',
  'israelUS',
  'sp100',
  'ndx100',
  'dow30',
  'etfs',
  'tech',
  'banks',
  'energy',
  'health',
];

/** Lists that trade in Tel Aviv (shekels, Israeli hours) or are Israeli companies. */
export const ISRAELI_LISTS: UniverseId[] = ['ta35', 'ta125', 'ta90', 'taBanks', 'taRealEstate', 'taTech', 'taFinance', 'taEnergy', 'israelUS'];

export const SP100 = [
  'AAPL', 'ABBV', 'ABT', 'ACN', 'ADBE', 'AIG', 'AMD', 'AMGN', 'AMT', 'AMZN', 'AVGO', 'AXP', 'BA', 'BAC', 'BK', 'BKNG', 'BLK', 'BMY', 'BRK-B', 'C',
  'CAT', 'CHTR', 'CL', 'CMCSA', 'COF', 'COP', 'COST', 'CRM', 'CSCO', 'CVS', 'CVX', 'DE', 'DHR', 'DIS', 'DUK', 'EMR', 'F', 'FDX', 'GD', 'GE',
  'GILD', 'GM', 'GOOG', 'GOOGL', 'GS', 'HD', 'HON', 'IBM', 'INTC', 'INTU', 'ISRG', 'JNJ', 'JPM', 'KHC', 'KO', 'LIN', 'LLY', 'LMT', 'LOW', 'MA',
  'MCD', 'MDLZ', 'MDT', 'MET', 'META', 'MMM', 'MO', 'MRK', 'MS', 'MSFT', 'NEE', 'NFLX', 'NKE', 'NOW', 'NVDA', 'ORCL', 'PEP', 'PFE', 'PG', 'PLTR',
  'PM', 'PYPL', 'QCOM', 'RTX', 'SBUX', 'SCHW', 'SO', 'SPG', 'T', 'TGT', 'TMO', 'TMUS', 'TSLA', 'TXN', 'UBER', 'UNH', 'UNP', 'UPS', 'USB', 'V',
  'VZ', 'WFC', 'WMT', 'XOM',
];

export const NDX100 = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'AVGO', 'TSLA', 'COST', 'NFLX', 'ASML', 'AMD', 'PEP', 'TMUS', 'CSCO', 'ADBE', 'LIN', 'QCOM', 'INTU',
  'TXN', 'AMGN', 'ISRG', 'CMCSA', 'BKNG', 'HON', 'AMAT', 'PDD', 'ARM', 'PANW', 'ADP', 'VRTX', 'GILD', 'SBUX', 'MU', 'ADI', 'MELI', 'LRCX', 'INTC', 'KLAC',
  'CRWD', 'CTAS', 'MDLZ', 'PYPL', 'SNPS', 'CDNS', 'ABNB', 'MAR', 'ORLY', 'CEG', 'FTNT', 'WDAY', 'DASH', 'REGN', 'MRVL', 'CSX', 'ADSK', 'ROP', 'PCAR', 'NXPI',
  'CHTR', 'AEP', 'MNST', 'TTD', 'CPRT', 'PAYX', 'FANG', 'ROST', 'KDP', 'FAST', 'AZN', 'ODFL', 'BKR', 'EA', 'VRSK', 'CTSH', 'GEHC', 'LULU', 'XEL', 'EXC',
  'CCEP', 'KHC', 'IDXX', 'DDOG', 'TEAM', 'ZS', 'CSGP', 'TTWO', 'ON', 'DXCM', 'CDW', 'GFS', 'BIIB', 'WBD', 'MDB', 'PLTR', 'APP', 'MSTR', 'AXON', 'SHOP',
];

export const TA35 = [
  'LUMI', 'POLI', 'DSCT', 'MZTF', 'FIBI', 'TEVA', 'NICE', 'ESLT', 'ICL', 'BEZQ', 'AZRG', 'MLSR', 'BIG', 'AMOT', 'PHOE', 'HARL', 'CLIS', 'MGDL', 'ENLT', 'ORA',
  'NVMI', 'TSEM', 'DLEKG', 'NWMD', 'SPEN', 'STRS', 'SAE', 'FTAL', 'ELAL', 'OPCE', 'CAMT', 'MVNE', 'ALHE', 'NXSN', 'ENRG',
].map((s) => `${s}.TA`);

export const DOW30 = [
  'AAPL', 'AMGN', 'AMZN', 'AXP', 'BA', 'CAT', 'CRM', 'CSCO', 'CVX', 'DIS', 'GS', 'HD', 'HON', 'IBM', 'JNJ',
  'JPM', 'KO', 'MCD', 'MMM', 'MRK', 'MSFT', 'NKE', 'NVDA', 'PG', 'SHW', 'TRV', 'UNH', 'V', 'VZ', 'WMT',
];

/** Widely traded ETFs: broad index, sector, bonds, commodities. */
export const ETFS = [
  'SPY', 'QQQ', 'IWM', 'DIA', 'VOO', 'VTI', 'VT', 'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLY', 'XLP', 'XLU',
  'SMH', 'SOXX', 'ARKK', 'TLT', 'IEF', 'HYG', 'GLD', 'SLV', 'USO', 'EEM', 'EFA', 'EIS',
];

/** Israeli companies listed in New York (traded in dollars on Wall Street hours). */
export const ISRAEL_US = [
  'TEVA', 'CHKP', 'NICE', 'CYBR', 'WIX', 'MNDY', 'ESLT', 'ICL', 'ORA', 'TSEM', 'NVMI', 'CAMT', 'GLBE', 'SEDG',
  'FVRR', 'INMD', 'PLTK', 'ZIM', 'CEVA', 'NNOX', 'SPNS', 'OPRX', 'LMND', 'PAYO', 'S',
];

export const TECH = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'AVGO', 'ORCL', 'CRM', 'ADBE', 'AMD', 'INTC', 'QCOM', 'TXN', 'CSCO', 'IBM', 'NOW', 'INTU', 'MU', 'AMAT', 'LRCX', 'KLAC', 'PANW', 'CRWD', 'PLTR', 'SNPS', 'CDNS', 'ADI', 'MRVL', 'UBER'];
export const BANKS = ['JPM', 'BAC', 'WFC', 'C', 'GS', 'MS', 'SCHW', 'USB', 'PNC', 'TFC', 'COF', 'BK', 'AXP', 'BLK', 'MET', 'AIG', 'PYPL', 'V', 'MA'];
export const ENERGY = ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'OXY', 'PSX', 'MPC', 'VLO', 'KMI', 'WMB', 'HAL', 'DVN', 'FANG', 'BKR', 'NEE', 'DUK', 'SO', 'CEG'];
export const HEALTH = ['LLY', 'UNH', 'JNJ', 'ABBV', 'MRK', 'PFE', 'TMO', 'ABT', 'DHR', 'AMGN', 'ISRG', 'GILD', 'VRTX', 'REGN', 'BMY', 'CVS', 'MDT', 'SYK', 'BSX', 'ZTS'];

/*
 * Tel Aviv lists beyond TA-35. KESEFLY DESIGN DECISION: APPROXIMATE snapshots built from large
 * Tel Aviv shares (every symbol checked against the app's TASE securities list), not the
 * official index member files, which change every half year. A scan only looks at these charts.
 */
const ta = (list: string) => list.split(/\s+/).filter(Boolean).map((s) => `${s}.TA`);

/** TA-90: the next 90 by size after TA-35 (approximate). */
export const TA90 = ta(`
  JBNK MMHD GVYM RIT1 SLARL AURA ISCN AFRE DIMRI ARPT PRSK ELCRE BLSR ASHG ISRS SKBN DANE ELCO
  ELTR ONE MTRX FORTY HLAN AUDC ENOG DORL NOFR RATI ISRA FOX RMLI YHNF PTNR CEL KEN ILCO TDRN ECP
  EQTL AYAL KMDA SCOP MTAV BSEN SMT ARGO ALMA GCT TMRP DUNI ISHO ELLO NTML MNIF ISRO AMRM MAXO
  PLSN OPK ARIN ALTF IDIN MRIN PRTC ISCD ISTA MDTR ELRN TRPZ OPAL HGG INRM ILDC PLRM
`);
/** TA-125 = TA-35 + TA-90 (approximate). */
export const TA125 = [...TA35, ...TA90];
export const TA_BANKS = ta('LUMI POLI DSCT MZTF FIBI JBNK');
export const TA_REAL_ESTATE = ta('AZRG MLSR BIG AMOT ALHE MVNE GVYM RIT1 SLARL AURA ISCN AFRE DIMRI ARPT PRSK ELCRE BLSR ASHG ISRS SKBN DANE ARGO GCT DUNI MDTR ILDC SMT');
export const TA_TECH = ta('NICE ESLT NVMI TSEM CAMT NXSN ONE MTRX FORTY HLAN AUDC ELRN PRTC');
export const TA_FINANCE = ta('HARL PHOE CLIS MGDL MMHD IDIN MTAV ISCD ALTF MNIF');
export const TA_ENERGY = ta('DLEKG NWMD ENOG ENRG OPCE ENLT ORA DORL NOFR RATI ISRA TMRP ELLO');

export function universe(id: UniverseId, mine: string[]): string[] {
  if (id === 'sp100') return SP100;
  if (id === 'ndx100') return NDX100;
  if (id === 'ta35') return TA35;
  if (id === 'ta125') return TA125;
  if (id === 'ta90') return TA90;
  if (id === 'taBanks') return TA_BANKS;
  if (id === 'taRealEstate') return TA_REAL_ESTATE;
  if (id === 'taTech') return TA_TECH;
  if (id === 'taFinance') return TA_FINANCE;
  if (id === 'taEnergy') return TA_ENERGY;
  if (id === 'dow30') return DOW30;
  if (id === 'etfs') return ETFS;
  if (id === 'israelUS') return ISRAEL_US;
  if (id === 'tech') return TECH;
  if (id === 'banks') return BANKS;
  if (id === 'energy') return ENERGY;
  if (id === 'health') return HEALTH;
  // Funds (number.TA) have no intraday bars.
  return [...new Set(mine.map((s) => s.toUpperCase()))].filter((s) => !/^\d{5,9}\.TA$/.test(s) && !s.startsWith('^'));
}
