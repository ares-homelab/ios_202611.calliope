import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import * as TaskManager from 'expo-task-manager';
import { api, type Audiobook } from './api';
import { readJson, writeJson } from './files';
import { getPrefs } from './theme';

/** local only: a free apple id can't receive push, so ares-side events are found by a background check */

const TASK = 'calliope-check';
const CARDS = ['the fool', 'the magician', 'the high priestess', 'the empress', 'the emperor', 'the hierophant', 'the lovers', 'the chariot', 'strength', 'the hermit', 'wheel of fortune', 'justice', 'the hanged man', 'death', 'temperance', 'the devil', 'the tower', 'the star', 'the moon', 'the sun', 'judgement', 'the world'];

/** same as ares: digit sum of the date, reduced to 0–21 */
export function calculated(d: Date) {
  let n = [...`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`].reduce((a, ch) => a + Number(ch), 0);
  while (n > 21) n = [...String(n)].reduce((a, ch) => a + Number(ch), 0);
  return n;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

const at = (hhmm: string, day = new Date()) => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
};

/** replaces every scheduled notification with what the settings ask for; the card days are refreshed on each open */
export async function reschedule() {
  const p = getPrefs().notify;
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (p.reading === 'off' && p.card === 'off' && !p.issues && !p.audiobooks) return;
  if (!(await Notifications.getPermissionsAsync()).granted && !(await Notifications.requestPermissionsAsync()).granted) return;
  if (p.reading !== 'off') {
    const [hour, minute] = p.reading.split(':').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'reading', body: 'a few pages tonight? your streak is waiting.', data: { url: '/reading' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
  if (p.card !== 'off') {
    const now = new Date();
    for (let i = 0; i < 8; i++) {
      const date = at(p.card, new Date(now.getFullYear(), now.getMonth(), now.getDate() + i));
      if (date <= now) continue;
      await Notifications.scheduleNotificationAsync({
        content: { title: 'card of the day', body: `${CARDS[calculated(date)]} · and a mix to go with it`, data: { url: '/mix/cotd' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
      });
    }
  }
  if (p.issues) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'the new yorker', body: "this week's issue is in calliope and on its way to the kindle", data: { url: '/reading?view=issues' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 16, minute: 0 },
    });
  }
}

/** audiobooks that became ready since the last look; the first look only remembers what is there */
async function newAudiobooks(notify: boolean) {
  const list: Audiobook[] = await api.audiobooks();
  const seen = readJson<number[] | null>('seen-audiobooks.json', null);
  if (seen && notify) {
    for (const a of list.filter((x) => x.complete && !seen.includes(x.id))) {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'audiobook ready', body: `${a.title} can be heard now`, data: { url: `/audiobook/${a.id}` } },
        trigger: null,
      });
    }
  }
  writeJson('seen-audiobooks.json', list.filter((x) => x.complete).map((x) => x.id));
}

TaskManager.defineTask(TASK, async () => {
  try {
    await newAudiobooks(getPrefs().notify.audiobooks);
  } catch {}
  return BackgroundTask.BackgroundTaskResult.Success;
});

/** the background check runs only while "audiobook ready" is on */
export async function syncBackground() {
  const registered = await TaskManager.isTaskRegisteredAsync(TASK);
  if (getPrefs().notify.audiobooks && !registered) await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 180 }).catch(() => {});
  if (!getPrefs().notify.audiobooks && registered) await BackgroundTask.unregisterTaskAsync(TASK).catch(() => {});
}

export async function startNotifications() {
  reschedule().catch(() => {});
  newAudiobooks(false).catch(() => {});
  await syncBackground();
  const open = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') router.push(url as never);
  };
  open(await Notifications.getLastNotificationResponseAsync());
  return Notifications.addNotificationResponseReceivedListener(open);
}
