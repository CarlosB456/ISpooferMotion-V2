import { emit } from '@tauri-apps/api/event';
import { useCallback, useRef, useState } from 'react';

import { commands } from '../bindings';

export type DiscordLoginState = 'idle' | 'opening' | 'waiting' | 'success' | 'error';

export function useDiscordLogin(onSuccess?: () => void) {
  const [loginState, setLoginState] = useState<DiscordLoginState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const startLogin = useCallback(async () => {
    if (loginState === 'opening' || loginState === 'waiting') return;
    setLoginState('opening');
    setErrorMessage(null);
    abortRef.current = false;

    try {
      const result = await commands.startDiscordLogin(false);
      if (result.status === 'error') {
        throw new Error(result.error);
      }

      const payload = result.data as unknown as {
        sessionId: string;
        authorizationUrl: string;
      };
      if (!payload?.sessionId || !payload?.authorizationUrl) {
        throw new Error('Invalid response from login server');
      }

      setLoginState('waiting');

      let attempts = 0;
      const maxAttempts = 60;

      pollRef.current = setInterval(async () => {
        if (abortRef.current) {
          stopPolling();
          setLoginState('idle');
          return;
        }

        attempts++;
        if (attempts > maxAttempts) {
          stopPolling();
          setLoginState('error');
          setErrorMessage('Login timed out. Please try again.');
          return;
        }

        try {
          const pollResult = await commands.pollDiscordLogin(payload.sessionId);
          if (pollResult.status === 'error') return;

          const pollData = pollResult.data as unknown as {
            pending?: boolean;
            loginToken?: string;
          };

          if (pollData?.pending) return;

          if (pollData?.loginToken) {
            stopPolling();

            let userId = 'unknown';
            let userName = 'Unknown User';
            let userAvatarUrl: string | null = null;
            try {
              const payloadBase64 = pollData.loginToken.split('.')[1];
              if (payloadBase64) {
                const payloadJson = atob(payloadBase64);
                const payload = JSON.parse(payloadJson);
                userId = payload.sub || payload.id || 'unknown';
                userName = payload.name || 'Unknown User';
                userAvatarUrl = payload.image || null;
              }
            } catch (e) {
              console.error('Failed to decode JWT payload:', e);
            }

            const authPayload = {
              loginToken: pollData.loginToken,
              user: {
                id: userId,
                username: userName,
                globalName: userName,
                avatarUrl: userAvatarUrl,
              },
            };
            await commands.saveDiscordReportAuth(JSON.stringify(authPayload));

            await emit('discord-login-success', {}).catch(() => {});
            setLoginState('success');
            onSuccess?.();
          }
        } catch {}
      }, 3000);
    } catch (err) {
      setLoginState('error');
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [loginState, onSuccess]);

  const cancelLogin = useCallback(() => {
    abortRef.current = true;
    stopPolling();
    setLoginState('idle');
    setErrorMessage(null);
  }, []);

  return { loginState, errorMessage, startLogin, cancelLogin };
}
