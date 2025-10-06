export default class OptionsScene extends Phaser.Scene {
	constructor() {
		super('OptionsScene');
	}

	create(data) {
		const { width, height } = this.scale;

		// 🔹 Cargar configuración guardada desde sessionStorage
		const saved = sessionStorage.getItem('settings');
		const savedSettings = saved ? JSON.parse(saved) : {};

		this.settings = {
			volume: data?.volume ?? savedSettings.volume ?? 0.5,
			difficulty: data?.difficulty ?? savedSettings.difficulty ?? 'NOOB',
			ship: data?.ship ?? savedSettings.ship ?? 'DEFAULT',
			ability: data?.ability ?? savedSettings.ability ?? 'SHIELD'
		};

		this.add.text(width / 2, 80, '⚙️ OPCIONES DE JUEGO', {
			fontSize: '32px',
			color: '#00ccff',
			fontStyle: 'bold'
		}).setOrigin(0.5);

		// ---- VOLUMEN ----
		this.add.text(width / 2 - 150, 150, 'Volumen:', { fontSize: '20px', color: '#fff' });
		this.volumeText = this.add.text(width / 2 + 85, 145, `${Math.round(this.settings.volume * 100)}%`, { fontSize: '20px', color: '#fff' });

		this.createButton(width / 2 + 50, 150, 30, 30, '-', () => this.adjustVolume(-0.1));
		this.createButton(width / 2 + 150, 150, 30, 30, '+', () => this.adjustVolume(0.1));

		// ---- DIFICULTAD ----
		this.add.text(width / 2 - 150, 210, 'Dificultad:', { fontSize: '20px', color: '#fff' });
		this.difficulties = ['NOOB', 'CASUAL', 'DEFCORP'];
		this.difficultyIndex = this.difficulties.indexOf(this.settings.difficulty);
		this.difficultyButton = this.createButton(width / 2 + 100, 210, 150, 40, this.settings.difficulty, () => this.nextDifficulty());

		// ---- NAVE ----
		this.add.text(width / 2 - 150, 270, 'Nave:', { fontSize: '20px', color: '#fff' });
		this.ships = ['DEFAULT', 'EMP', 'DRONE'];
		this.shipIndex = this.ships.indexOf(this.settings.ship);
		this.shipButton = this.createButton(width / 2 + 100, 270, 150, 40, this.settings.ship, () => this.nextShip());

		// ---- HABILIDAD ----
		this.add.text(width / 2 - 150, 330, 'Habilidad:', { fontSize: '20px', color: '#fff' });
		this.abilities = ['SHIELD', 'QUANTUM-JUMP'];
		this.abilityIndex = this.abilities.indexOf(this.settings.ability);
		this.abilityButton = this.createButton(width / 2 + 100, 330, 150, 40, this.settings.ability, () => this.nextAbility());

		// ---- VOLVER ----
		this.createButton(width / 2, 420, 200, 50, 'VOLVER', () => {
        this.saveSettings();
    
        const returnScene = this.scene.settings.returnScene || 'MenuScene';
        this.scene.start(returnScene, this.settings);
    });
  
	}

	createButton(x, y, w, h, label, callback) {
		const rect = this.add.rectangle(x, y, w, h, 0x007bff)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', callback)
			.on('pointerover', () => rect.setFillStyle(0x3399ff))
			.on('pointerout', () => rect.setFillStyle(0x007bff));

		const text = this.add.text(x, y, label, { fontSize: '18px', color: '#fff' }).setOrigin(0.5);

		return {
			rect,
			text,
			setText: (newLabel) => text.setText(newLabel)
		};
	}

	adjustVolume(delta) {
      this.settings.volume = Phaser.Math.Clamp(this.settings.volume + delta, 0, 1);
      this.volumeText.setText(`${Math.round(this.settings.volume * 100)}%`);

      // Actualizar música persistente
      const musicScene = this.scene.get('MusicScene');
      if (musicScene) {
          musicScene.setVolume(this.settings.volume);
      }

      this.saveSettings(); // sessionStorage
  }

	nextDifficulty() {
		this.difficultyIndex = (this.difficultyIndex + 1) % this.difficulties.length;
		this.settings.difficulty = this.difficulties[this.difficultyIndex];
		this.difficultyButton.setText(this.settings.difficulty);
		this.saveSettings();
	}

	nextShip() {
		this.shipIndex = (this.shipIndex + 1) % this.ships.length;
		this.settings.ship = this.ships[this.shipIndex];
		this.shipButton.setText(this.settings.ship);
		this.saveSettings();
	}

	nextAbility() {
		this.abilityIndex = (this.abilityIndex + 1) % this.abilities.length;
		this.settings.ability = this.abilities[this.abilityIndex];
		this.abilityButton.setText(this.settings.ability);
		this.saveSettings();
	}

	// 💾 Guardar configuración en sessionStorage
	saveSettings() {
		sessionStorage.setItem('settings', JSON.stringify(this.settings));
	}
}