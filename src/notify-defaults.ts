/** notification settings: a time or 'off' for the daily ones, on/off for the rest */
export type NotifyPrefs = { reading: string; card: string; issues: boolean; audiobooks: boolean };
export const NOTIFY_DEFAULTS: NotifyPrefs = { reading: '21:00', card: '08:00', issues: true, audiobooks: true };
