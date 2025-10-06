export default class PauseScene extends Phaser.Scene {
	constructor() { super('PauseScene'); }

	create() {
		this.cursors = this.input.keyboard.addKeys('ESC');
		this.cursors.ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
		// Escuchar tecla ESC
		this.input.keyboard.on('keydown-ESC', () => {
			if (musicScene) musicScene.resumeMusic(); // reanuda la música
			this.scene.stop();                       // cierra PauseScene
			this.scene.resume('GameScene');          // reanuda el juego
		});
		const musicScene = this.scene.get('MusicScene');
		if (musicScene) {
			musicScene.pauseMusic(); // pausa la música
		}

		const { width, height } = this.scale;

		// Fondo semi-transparente
		this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.6);

		// Título
		const title = this.add.text(width / 2, height / 2 - 80, 'PAUSA', {
			fontSize: '60px',
			fontStyle: 'bold',
			fontFamily: 'monospace',
			color: '#00ccff',
			stroke: '#000000',
			strokeThickness: 6,
			shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, stroke: true, fill: true }
		}).setOrigin(0.5);

		// Botones estilo UI
		const btnResume = this.createButton(width / 2, height / 2 + 20, 200, 50, 'REANUDAR', () => {
			if (musicScene) {
				musicScene.resumeMusic(); // reanuda la música
			}

			this.scene.stop();
			this.scene.resume('GameScene');
		});
		
		const btnMenu = this.createButton(width / 2, height / 2 + 80, 200, 50, 'MENÚ PRINCIPAL', () => {
			if (musicScene) {
				musicScene.pauseMusic(); // para la música
			}
			this.scene.stop('GameScene');
			this.scene.start('MenuScene');
		});

		// Boton para mutear la música
		let musicOn = musicScene && musicScene.bgMusic && musicScene.bgMusic.volume > 0;

		const switchWidth = 80;
		const switchHeight = 40;
		const switchRadius = switchHeight / 2;
		const padding = 4;

		const centerX = width / 2;
		const centerY = height / 2 + 160;

		// Dibujar fondo del switch
		const switchBg = this.add.graphics();
		switchBg.fillStyle(musicOn ? 0x00ccff : 0x888888, 1);
		switchBg.fillRoundedRect(centerX - switchWidth/2, centerY - switchHeight/2, switchWidth, switchHeight, switchRadius);

		// Dibujar círculo
		const circle = this.add.circle(
			centerX + (musicOn ? (switchWidth/2 - switchRadius) : -(switchWidth/2 - switchRadius)),
			centerY,
			switchRadius - padding,
			0xffffff
		);

		// Emoji dentro del círculo
		const emoji = this.add.text(circle.x, circle.y, musicOn ? '🔊' : '🔇', {
			fontSize: `${switchRadius - padding}px`,
		}).setOrigin(0.5);

		// Función toggle
		const toggleSwitch = () => {
			if (!musicScene || !musicScene.bgMusic) return;

			musicOn = !musicOn;

			// Cambiar volumen
			if (musicOn) {
				musicScene.bgMusic.setVolume(musicScene.savedVolume ?? 0.4);
			} else {
				musicScene.savedVolume = musicScene.bgMusic.volume;
				musicScene.bgMusic.setVolume(0);
			}

			// Mover círculo y actualizar emoji
			circle.x = centerX + (musicOn ? (switchWidth/2 - switchRadius) : -(switchWidth/2 - switchRadius));
			emoji.x = circle.x;
			emoji.setText(musicOn ? '🔊' : '🔇');

			// Cambiar color de fondo
			switchBg.clear();
			switchBg.fillStyle(musicOn ? 0x00ccff : 0x888888, 1);
			switchBg.fillRoundedRect(centerX - switchWidth/2, centerY - switchHeight/2, switchWidth, switchHeight, switchRadius);
		};

		// Hacer interactivo
		switchBg.setInteractive(new Phaser.Geom.Rectangle(centerX - switchWidth/2, centerY - switchHeight/2, switchWidth, switchHeight), Phaser.Geom.Rectangle.Contains)
			.on('pointerdown', toggleSwitch);
		circle.setInteractive().on('pointerdown', toggleSwitch);
		emoji.setInteractive().on('pointerdown', toggleSwitch);
		
	}

	createButton(x, y, w, h, label, callback) {
		const rect = this.add.rectangle(x, y, w, h, 0x007bff)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', callback)
			.on('pointerover', () => rect.setFillStyle(0x3399ff))
			.on('pointerout', () => rect.setFillStyle(0x007bff));

		const text = this.add.text(x, y, label, { fontSize: '20px', color: '#fff' }).setOrigin(0.5);

		return { rect, text };
	}

}
