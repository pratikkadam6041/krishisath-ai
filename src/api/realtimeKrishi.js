const REALTIME_CONNECT_URL = '/api/realtime/connect';

function createSession(language, farmContext) {
  return {
    type: 'realtime',
    model: 'gpt-4o-mini-realtime-preview',
    instructions: `You are Krishi, a warm Indian farming voice companion. Speak naturally in ${language === 'mr' ? 'Marathi' : language === 'hi' ? 'Hindi' : 'English'} with short, practical answers. Use this farm context when useful: ${farmContext || 'No farm context is available.'} Never claim that hardware was changed. Irrigation and valve actions require the farmer's confirmation in the app.`,
    audio: {
      input: {
        turn_detection: { type: 'server_vad', create_response: true, interrupt_response: true },
        transcription: { model: 'gpt-4o-mini-transcribe', language },
      },
      output: { voice: 'marin' },
    },
  };
}

function parseEvent(event) {
  try {
    return JSON.parse(event.data);
  } catch {
    return null;
  }
}

export async function connectKrishiRealtime({ language, farmContext, onStatus, onTranscript, onError }) {
  if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
    throw new Error('Realtime voice needs a modern browser with microphone support.');
  }

  onStatus?.('connecting');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const peer = new RTCPeerConnection();
  const audio = new Audio();
  audio.autoplay = true;
  const events = peer.createDataChannel('oai-events');

  stream.getTracks().forEach((track) => peer.addTrack(track, stream));
  peer.ontrack = (event) => {
    audio.srcObject = event.streams[0];
    audio.play().catch(() => {});
  };
  peer.onconnectionstatechange = () => {
    onStatus?.(peer.connectionState === 'connected' ? 'listening' : peer.connectionState);
  };
  events.onmessage = (event) => {
    const payload = parseEvent(event);
    if (!payload) return;
    if (payload.type === 'conversation.item.input_audio_transcription.completed') {
      onTranscript?.(payload.transcript || '');
    }
    if (payload.type === 'error') {
      onError?.(payload.error?.message || 'Realtime voice error.');
    }
  };

  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  const response = await fetch(REALTIME_CONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdp: offer.sdp, session: createSession(language, farmContext) }),
  });
  const answer = await response.text();
  if (!response.ok) {
    let message = 'Unable to start Realtime voice.';
    try { message = JSON.parse(answer).error || message; } catch {}
    stream.getTracks().forEach((track) => track.stop());
    peer.close();
    throw new Error(message);
  }

  await peer.setRemoteDescription({ type: 'answer', sdp: answer });
  events.onopen = () => {
    events.send(JSON.stringify({
      type: 'response.create',
      response: { modalities: ['audio', 'text'], instructions: 'Greet the farmer warmly, then ask how you can help with their farm today.' },
    }));
  };

  return {
    close: () => {
      events.close();
      peer.close();
      stream.getTracks().forEach((track) => track.stop());
      audio.srcObject = null;
      onStatus?.('idle');
    },
  };
}
