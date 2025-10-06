export default class MusicScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MusicScene', active: true }); // siempre activa
    }

    preload() {
        this.load.audio('bgMusic', 'assets/audio/music.mp3');
    }

    create() {
        const saved = sessionStorage.getItem('settings');
        const volume = saved ? JSON.parse(saved).volume : 0.5;

        this.bgMusic = this.sound.add('bgMusic', { loop: true, volume });
        this.bgMusic.play();
    }

    // Permite cambiar el volumen desde otras escenas
    setVolume(volume) {
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.setVolume(volume);
        }
    }

    // Opcional: pausar/reanudar música
    pauseMusic() {
        if (this.bgMusic && this.bgMusic.isPlaying) {
            this.bgMusic.pause();
        }
    }

    resumeMusic() {
        if (this.bgMusic && this.bgMusic.isPaused) {
            this.bgMusic.resume();
        }
    }
}
