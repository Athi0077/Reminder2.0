class AlarmService {
  constructor() {
    this.audio = new Audio();
    this.audio.loop = true;
    
    this.sounds = {
      default: 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
      sound1: 'https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg',
      sound2: 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
      sound3: 'https://actions.google.com/sounds/v1/alarms/phone_ringing.ogg'
    };
    this.isPlaying = false;
  }

  play(soundKey = 'default') {
    if (this.isPlaying) this.stop();
    
    const src = this.sounds[soundKey] || this.sounds.default;
    this.audio.src = src;
    
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.then(() => {
        this.isPlaying = true;
      }).catch(error => {
        console.warn('Audio playback blocked by browser policies:', error);
        this.isPlaying = false;
      });
    }
  }

  stop() {
    if (this.isPlaying || !this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isPlaying = false;
    }
  }
}

const alarmService = new AlarmService();
export default alarmService;
