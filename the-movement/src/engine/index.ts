// Public engine API (named per the specification).
export * from './types';
export * from './config';
export { Rng, hashString, randomSeed } from './rng';
export { createMovement, interpretDoctrine, deriveNames, defaultFounderTitle, generateProclamation, moderate, buildProfile, applyAttributeOverrides } from './ideology';
export {
  newGame as generateWorld,
  newGame,
  initializeStartingCities,
  launchCampaign,
  allocateZealots,
  endCampaign,
  scout,
  establishOutpost,
  upgradeOutpost,
  unlockUpgrade,
  issueProclamation,
  advanceSimulation,
  applyOfflineProgress,
  calculateConversionRate,
  processCityThresholds,
  snapshot as createHistoricalSnapshot,
  startingCityInfo,
  debug,
} from './sim';
export { revealCandidates as generateCityCandidates, availableZealots, campaignSlots, outpostCapacity } from './core';
export { evaluateOpposition, triggerEvent, resolveChoice as applyEventChoice, runEventCheck } from './events';
export { factionTick as evaluateFactionStability, respondToFaction } from './factions';
export { calculateRegionalStatistics, statsToCSV } from './stats';
export { evaluateVictory, victoryProgress, chooseEnding } from './victory';
export { serializeGame, loadGame, migrate } from './save';
