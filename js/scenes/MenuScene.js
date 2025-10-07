export default class MenuScene extends Phaser.Scene {
	constructor() {
		super('MenuScene');
	}

	preload() {
		this.load.image('menu-bg', 'assets/background.jpg');
		this.load.image('logo', 'assets/logo.png');
		this.load.audio('bgMusic', 'assets/audio/music.mp3');
	}

	create() {
		const { width, height } = this.scale;
		const saved = sessionStorage.getItem('settings');
		const volumen = saved ? JSON.parse(saved).volume : 0.5;

		// Fondo parallax
		this.bg = this.add.tileSprite(width / 2, height / 2, width, height, 'menu-bg')
		.setAlpha(0.3);

		const logo = this.add.image(width / 2, 200, 'logo')
		.setOrigin(0.5)
		.setScale(0.1);
		
		/*this.title = this.add.text(width / 2, 130, 'DEFCORP CITIZEN', {
			fontSize: '60px',
			fontStyle: 'bold',
			fontFamily: 'monospace',
			color: '#00ccff',
			stroke: '#000000',
			strokeThickness: 6,
			shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, stroke: true, fill: true }
		}).setOrigin(0.5);*/
		
		// Animación pulsante del título
		/*this.tweens.add({
			targets: this.title,
			scale: 1.1,
			yoyo: true,
			repeat: -1,
			duration: 2000,
			ease: 'Sine.easeInOut'
		});*/

		// Botones
		const btnPlay = this.createButton(width / 2, 290, 200, 50, 'JUGAR', () => {
			this.scene.start('GameScene', this.settings); // solo cambia de escena, la música sigue sonando
		});		
		
		const btnOptions = this.createButton(width / 2, 360, 200, 50, 'OPCIONES', () => {
			this.scene.start('OptionsScene', this.settings);
		});

		const btnExit = this.createButton(width / 2, 430, 200, 50, 'SALIR', () => {
			window.close();
		});		

		// Valores por defecto
		this.settings = {
			volume: volumen,
			difficulty: 'NOOB',
			ship: 'DEFAULT',
			ability: 'SHIELD'
		};
	}

	createButton(x, y, w, h, label, callback) {
		const rect = this.add.rectangle(x, y, w, h, 0x007bff)
			.setInteractive({ useHandCursor: true })
			.on('pointerdown', callback)
			.on('pointerover', () => rect.setFillStyle(0x3399ff))
			.on('pointerout', () => rect.setFillStyle(0x007bff));

		const text = this.add.text(x, y, label, { fontSize: '22px', color: '#fff' }).setOrigin(0.5);

		return { rect, text };
	}

	update() {
		this.bg.tilePositionY += 0.2;
	}
}
