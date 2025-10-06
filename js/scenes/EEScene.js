export default class EEScene extends Phaser.Scene {
	constructor() {
		super('EEScene');
	}

	create() {
		const { width, height } = this.scale;

		// Fondo semi-transparente
		this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);

		// Título del "error"
		this.add.text(width / 2, height / 2 - 100, 'SERVER ERROR', {
			fontSize: '60px',
			fontStyle: 'bold',
			fontFamily: 'monospace',
			color: '#00ccff',
			stroke: '#000000',
			strokeThickness: 8,
			shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 5, stroke: true, fill: true }
		}).setOrigin(0.5);

		this.add.text(width / 2, height / 2 - 40, 'Reconnecting...', {
			fontSize: '24px',
			fontFamily: 'monospace',
			color: '#cccccc'
		}).setOrigin(0.5);

		// Barra de progreso
		const barWidth = 400;
		const barHeight = 30;
		const barX = width / 2 - barWidth / 2;
		const barY = height / 2 + 20;

		const progressBg = this.add.rectangle(width / 2, barY, barWidth, barHeight, 0x222222).setOrigin(0.5);
		const progressBar = this.add.rectangle(width / 2 - barWidth / 2, barY, 0, barHeight, 0x00ccff).setOrigin(0, 0.5);

		let progress = 0;
		const duration = Phaser.Math.Between(3000, 5000); // entre 3 y 5 segundos

		// Tween para animar la barra
		this.tweens.add({
			targets: progressBar,
			width: barWidth,
			duration: duration,
			ease: 'Linear',
			onUpdate: (tween) => {
				progress = progressBar.displayWidth / barWidth;
			},
			onComplete: () => {
				// Texto de reconexión exitosa
				this.add.text(width / 2, height / 2 + 80, 'Connection restored', {
					fontSize: '22px',
					fontFamily: 'monospace',
					color: '#00ff99'
				}).setOrigin(0.5);

				// Pequeña pausa antes de volver al juego
				this.time.delayedCall(800, () => {
					this.scene.stop('EEScene');
					this.scene.resume('GameScene');
				});
			}
		});
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
