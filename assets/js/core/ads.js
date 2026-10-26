const CLIENT = '';
const FREQUENCY = '60s';
const FALLBACK_MS = 2000;

const live = CLIENT.startsWith('ca-pub-');
const local = ['localhost', '127.0.0.1'].includes(location.hostname);

let booted = false;
let blocked = false;

function boot() {
  if (!live || booted) return;
  booted = true;
  window.adsbygoogle = window.adsbygoogle || [];
  window.adBreak = window.adConfig = options => window.adsbygoogle.push(options);
  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  script.dataset.adClient = CLIENT;
  script.dataset.adFrequencyHint = FREQUENCY;
  if (local) script.dataset.adbreakTest = 'on';
  script.addEventListener('error', () => {
    blocked = true;
  });
  document.head.append(script);
  window.adConfig({ preloadAdBreaks: 'on', sound: 'on' });
}

const usable = () => live && booted && !blocked;

export const ads = {
  init: boot,

  interstitial({ before, after }) {
    return new Promise(resolve => {
      if (!usable()) {
        resolve(false);
        return;
      }
      let shown = false;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(shown);
      };
      const timer = setTimeout(finish, FALLBACK_MS);
      window.adBreak({
        type: 'next',
        name: 'play-again',
        beforeAd() {
          shown = true;
          clearTimeout(timer);
          before();
        },
        afterAd() {
          after();
        },
        adBreakDone: finish
      });
    });
  },

  reward({ available, before, after, viewed }) {
    if (!usable()) return;
    window.adBreak({
      type: 'reward',
      name: 'double-coins',
      beforeReward: show => available(show),
      beforeAd: before,
      afterAd: after,
      adViewed: viewed,
      adDismissed() {},
      adBreakDone() {}
    });
  }
};