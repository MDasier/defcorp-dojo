export default class PauseScene extends Phaser.Scene {
	constructor() { super('PauseScene'); }

	create() {
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
			const gameScene = this.scene.get('GameScene');
			if (gameScene && gameScene.bgMusic) {
				gameScene.bgMusic.resume(); // reanuda la música
			}
			this.scene.stop();
			this.scene.resume('GameScene');
		});
		
		const btnMenu = this.createButton(width / 2, height / 2 + 90, 200, 50, 'MENÚ PRINCIPAL', () => {
			const gameScene = this.scene.get('GameScene');
			if (gameScene && gameScene.bgMusic) {
				gameScene.bgMusic.stop(); // detener la música al volver al menú
			}
			this.scene.stop('GameScene');
			this.scene.start('MenuScene');
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
