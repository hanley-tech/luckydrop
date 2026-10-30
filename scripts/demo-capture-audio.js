// Init script for scripts/demo-capture.mjs: mirror every sound the page
// makes into two MediaRecorders — a MUSIC stem (the background tracks) and an
// SFX stem (sample effects + the Web Audio synth) — so an editor can mix them
// apart. window.__recStart() → epoch ms; window.__recStop() → { music, sfx }
// as base64 webm/opus.
(() => {
  const RealAC = window.AudioContext;
  // Background music files (src/lib/audio.ts MusicTrack); everything else is an effect
  const MUSIC_SRC = /\/(lobby|game|winner)\.mp3(\?|$)/;
  let rec = null; // { ctx, music: {dest, chunks, mr}, sfx: {…} }
  function recorder() {
    if (rec) return rec;
    const ctx = new RealAC();
    const stem = () => ({ dest: ctx.createMediaStreamDestination(), chunks: [], mr: null });
    rec = { ctx, music: stem(), sfx: stem() };
    return rec;
  }
  window.__recStart = () => {
    const r = recorder();
    r.ctx.resume();
    for (const s of [r.music, r.sfx]) {
      s.mr = new MediaRecorder(s.dest.stream, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 256000 });
      s.mr.ondataavailable = (e) => e.data.size && s.chunks.push(e.data);
      s.mr.start(1000);
    }
    // Epoch ms, comparable with the screencast's frame timestamps
    return performance.timeOrigin + performance.now();
  };
  const finish = (s) => new Promise((res) => {
    s.mr.onstop = async () => {
      const u = new Uint8Array(await new Blob(s.chunks).arrayBuffer());
      let str = "";
      for (let i = 0; i < u.length; i += 0x8000) str += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      res(btoa(str));
    };
    s.mr.stop();
  });
  window.__recStop = async () => ({ music: await finish(rec.music), sfx: await finish(rec.sfx) });

  // Page AudioContexts (the synth): anything connected to ctx.destination also goes to the SFX stem
  const taps = new WeakMap();
  function tapFor(ctx) {
    let t = taps.get(ctx);
    if (!t) {
      const msd = ctx.createMediaStreamDestination();
      const r = recorder();
      r.ctx.createMediaStreamSource(msd.stream).connect(r.sfx.dest);
      t = msd; taps.set(ctx, t);
    }
    return t;
  }
  const realConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (target, ...rest) {
    const out = realConnect.call(this, target, ...rest);
    if (target instanceof AudioDestinationNode && this.context !== (rec && rec.ctx)) {
      try { realConnect.call(this, tapFor(this.context)); } catch (e) {}
    }
    return out;
  };
  // HTMLAudio (music + sample SFX): capture each element's output into its stem
  const realPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (...a) {
    if (!this.__tapped) {
      this.__tapped = true;
      try {
        const st = this.captureStream ? this.captureStream() : null;
        const hook = () => {
          if (this.__hooked || !st || st.getAudioTracks().length === 0) return;
          this.__hooked = true;
          const r = recorder();
          const src = r.ctx.createMediaStreamSource(st);
          const g = r.ctx.createGain();
          src.connect(g).connect(MUSIC_SRC.test(this.currentSrc || this.src) ? r.music.dest : r.sfx.dest);
          const upd = () => { g.gain.value = this.muted ? 0 : this.volume; };
          upd(); this.addEventListener("volumechange", upd);
        };
        st && st.addEventListener("addtrack", hook);
        this.addEventListener("playing", hook);
      } catch (e) {}
    }
    return realPlay.apply(this, a);
  };
})();
