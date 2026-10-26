'use strict';
const ZhEngine = (() => {
  let worker = null, sequence = 0, progress = null;
  const pending = new Map();
  function reset(error) {
    worker?.terminate(); worker = null;
    for (const request of pending.values()) {clearTimeout(request.timer); request.reject(error);}
    pending.clear(); progress = null;
  }
  function connect() {
    if (worker) return worker;
    worker = new Worker('zh-asr-worker.js');
    worker.onerror = () => reset(new Error('Speech worker failed'));
    worker.onmessageerror = () => reset(new Error('Speech worker response unreadable'));
    worker.onmessage = ({data}) => {
      if (data.type === 'prog' || data.type === 'phase') {progress?.(data); return;}
      const request = pending.get(data.id);
      if (!request) return;
      clearTimeout(request.timer); pending.delete(data.id);
      if (data.type === 'err') request.reject(new Error(data.msg)); else request.resolve(data);
    };
    return worker;
  }
  function request(type, fields = {}, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => reset(new Error('Speech worker timed out')), timeout);
      pending.set(id, {resolve, reject, timer});
      try {connect().postMessage({type, id, ...fields});} catch (e) {reset(e);}
    });
  }
  return {
    supported: () => typeof Worker !== 'undefined' && typeof WebAssembly !== 'undefined' && 'caches' in globalThis,
    status: () => request('status', {}, 4000).catch(() => ({cached: false, ready: false})),
    load: callback => {progress = callback; return request('load', {}, 120000).finally(() => {progress = null;});},
    run: (pcm, targets) => request('run', {pcm, targets, n: targets.length}, 30000),
    forget: async () => {reset(new Error('Speech model removed')); await caches.delete('htt-engine-v1'); return {cached:false,ready:false};},
  };
})();
