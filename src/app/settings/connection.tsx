import { router } from 'expo-router';
import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';
import { api } from '../../api';
import { BackBar, Button, Eyebrow, Screen, useUi } from '../../components/ui';
import { DEFAULT_ND, DEFAULT_URL, ndLogin, saveConfig, saveNd, useConfig } from '../../config';
import { nd } from '../../navidrome';
import { refreshAll } from '../../store';
import { F, fs, useTheme } from '../../theme';

type Result = { ok: boolean; text: string } | null;

export default function Connection() {
  const u = useUi();
  const { c } = useTheme();
  const cfg = useConfig();
  const [url, setUrl] = useState(cfg.url);
  const [token, setToken] = useState(cfg.token);
  const [ndUrl, setNdUrl] = useState(cfg.nd.url);
  const [ndUser, setNdUser] = useState(cfg.nd.user);
  const [ndPass, setNdPass] = useState('');
  const [apiResult, setApiResult] = useState<Result>(null);
  const [ndResult, setNdResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);
  const first = !cfg.token;
  const clean = () => ({ url: url.trim().replace(/\/+$/, '') || DEFAULT_URL, token: token.trim() });

  const testApi = async () => {
    setBusy(true);
    setApiResult(null);
    try {
      const r = await api.hello(clean());
      setApiResult({ ok: true, text: `connected: ${r.hello} answered` });
    } catch (e) {
      setApiResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const saveApi = async () => {
    if (!token.trim()) return setApiResult({ ok: false, text: 'paste the token first; it is in api.env on ares.' });
    await saveConfig(clean());
    refreshAll();
    if (first) router.replace('/');
  };
  const signIn = async () => {
    if (!ndPass) return setNdResult({ ok: false, text: 'type the navidrome password first.' });
    setBusy(true);
    setNdResult(null);
    try {
      const login = await ndLogin(ndUrl || DEFAULT_ND, ndUser, ndPass);
      const r = await nd.ping(login);
      await saveNd(login);
      setNdPass('');
      setNdResult({ ok: true, text: `signed in · navidrome ${r.serverVersion ?? ''}`.trim() });
      refreshAll();
    } catch (e) {
      setNdResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  const input = { height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: c.panel, color: c.text, fontFamily: F.sans, fontSize: fs(15) };
  type Kind = 'url' | 'token' | 'user' | 'password';
  const KIND = {
    url: { keyboardType: 'url', textContentType: 'URL', autoComplete: 'url' },
    token: { textContentType: 'none', autoComplete: 'off' },
    user: { textContentType: 'username', autoComplete: 'username' },
    password: { textContentType: 'password', autoComplete: 'current-password' },
  } as const satisfies Record<Kind, TextInputProps>;
  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, kind: Kind) => (
    <View style={{ gap: 8 }}>
      <Eyebrow>{label}</Eyebrow>
      <TextInput accessibilityLabel={label} value={value} onChangeText={set} placeholder={placeholder} placeholderTextColor={c.muted} autoCapitalize="none" autoCorrect={false} secureTextEntry={kind === 'token' || kind === 'password'} {...KIND[kind]} style={input} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {first ? <View style={{ height: 54 }} /> : <BackBar label="account" />}
      <Screen top={false} gap={16}>
        <Text accessibilityRole="header" style={u.h1}>{first ? 'connect to ares' : 'connections'}</Text>
        <Text accessibilityRole="header" style={u.h2}>calliope api</Text>
        <Text style={[u.soft, { color: c.muted }]}>books, audiobooks, stats. reached over tailscale; the token is in /srv/config/calliope/api.env on ares and kept in this iphone&apos;s keychain.</Text>
        {field('api address', url, setUrl, DEFAULT_URL, 'url')}
        {field('token', token, setToken, 'bearer token', 'token')}
        <View style={[u.row, { gap: 10 }]}>
          <Button label="test" kind="outline" onPress={testApi} busy={busy} />
          <Button label="save" onPress={saveApi} style={{ flex: 1 }} />
        </View>
        {apiResult ? <Text style={[u.soft, { color: apiResult.ok ? c.ok : c.warn }]}>{apiResult.text}</Text> : null}

        <Text accessibilityRole="header" style={[u.h2, { marginTop: 12 }]}>navidrome</Text>
        <Text style={[u.soft, { color: c.muted }]}>music. only a salted token is kept on this iphone, never the password.{nd.ready() ? ` signed in as ${cfg.nd.user}.` : ''}</Text>
        {field('address', ndUrl, setNdUrl, DEFAULT_ND, 'url')}
        {field('user', ndUser, setNdUser, 'mars', 'user')}
        {field('password', ndPass, setNdPass, 'navidrome password', 'password')}
        <Button label={nd.ready() ? 'sign in again' : 'sign in'} onPress={signIn} busy={busy} />
        {ndResult ? <Text style={[u.soft, { color: ndResult.ok ? c.ok : c.warn }]}>{ndResult.text}</Text> : null}
      </Screen>
    </View>
  );
}
