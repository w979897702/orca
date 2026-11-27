declare const ORCA_DISABLE_OFFICIAL_APP_UPDATES: boolean

export const officialAppUpdatesEnabled =
  typeof ORCA_DISABLE_OFFICIAL_APP_UPDATES !== 'boolean' || !ORCA_DISABLE_OFFICIAL_APP_UPDATES
