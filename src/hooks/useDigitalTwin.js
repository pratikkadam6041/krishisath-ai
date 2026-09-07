import { useState, useCallback } from 'react';
import { predictPumpOutcome, predictValveOutcome, predictFertigationOutcome } from '../ai-ml/digitalTwin.js';

export function useDigitalTwin() {
  const [prediction, setPrediction] = useState(null);
  const [pending, setPending] = useState(null); // { device, zoneId, action, onConfirm }

  const requestPrediction = useCallback((device, zoneId, action, currentState, onConfirm) => {
    let result = null;

    if (device === 'pump') {
      result = predictPumpOutcome(zoneId, 2, currentState);
    } else if (device === 'valve') {
      result = predictValveOutcome(zoneId, 2, currentState);
    } else if (['tankA', 'tankB', 'tankC'].includes(device)) {
      result = predictFertigationOutcome(device, 50, currentState);
    }

    setPrediction(result);
    setPending({ device, zoneId, action, onConfirm });
  }, []);

  const confirm = useCallback(() => {
    if (pending?.onConfirm) pending.onConfirm();
    setPrediction(null);
    setPending(null);
  }, [pending]);

  const cancel = useCallback(() => {
    setPrediction(null);
    setPending(null);
  }, []);

  const updateDuration = useCallback((hours) => {
    if (!pending) return;
    const { device, zoneId, onConfirm } = pending;
    const currentState = prediction ? { moisture: prediction.moistureBefore } : {};
    let result = null;
    if (device === 'pump') result = predictPumpOutcome(zoneId, hours, currentState);
    else if (device === 'valve') result = predictValveOutcome(zoneId, hours, currentState);
    setPrediction(result);
    setPending({ ...pending, onConfirm });
  }, [pending, prediction]);

  return {
    prediction,
    pending,
    requestPrediction,
    confirm,
    cancel,
    updateDuration,
    isOpen: !!prediction,
  };
}
