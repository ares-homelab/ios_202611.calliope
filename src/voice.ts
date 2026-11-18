import { RecordingPresets, type RecordingOptions } from 'expo-audio';
import { File, Paths, UploadType } from 'expo-file-system';
import { api, authHeaders } from './api';
import { getConfig } from './config';
import { readJson, writeJson } from './files';

/** mono AAC at 64 kbps: about 0.5 MB a minute, plenty for speech */
export const VOICE: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

type Waiting = { id: string; name: string };
let waiting = readJson<Waiting[]>('voice-outbox.json', []);

function drop(id: string) {
  waiting = waiting.filter((w) => w.id !== id);
  writeJson('voice-outbox.json', waiting);
}

/** keeps the recording in documents until ares has it; true when it was sent now */
export async function sendVoice(id: string, uri: string) {
  const name = `voice-${id}.m4a`;
  const f = new File(Paths.document, name);
  if (f.exists) f.delete();
  new File(uri).copy(f);
  waiting = [...waiting.filter((w) => w.id !== id), { id, name }];
  writeJson('voice-outbox.json', waiting);
  await flushVoice();
  return !waiting.some((w) => w.id === id);
}

export async function flushVoice() {
  for (const w of [...waiting]) {
    const f = new File(Paths.document, w.name);
    if (!f.exists) {
      drop(w.id);
      continue;
    }
    try {
      const r = await f.upload(`${getConfig().url}/notes/${w.id}/voice`, {
        httpMethod: 'PUT',
        uploadType: UploadType.BINARY_CONTENT,
        headers: { ...authHeaders(), 'Content-Type': 'audio/mp4' },
      });
      if ((r.status >= 200 && r.status < 300) || r.status === 404) {
        f.delete();
        drop(w.id);
      }
    } catch {
      return;
    }
  }
}

/** waits for ares to transcribe a voice note, up to about 45 s */
export async function transcript(id: string) {
  for (let i = 0; i < 22; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const s = await api.voiceState(id);
      if (s.state !== 'pending') return s;
    } catch {}
  }
  return null;
}
