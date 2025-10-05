export default class GameOverScene extends Phaser.Scene {
    constructor() { super('GameOverScene'); }
  
    init(data) { this.finalScore = data.score || 0; }
  
    create() {
        const { width, height } = this.scale;
    
        // Detener la música de fondo si está sonando
        const gameScene = this.scene.get('GameScene');
        if (gameScene && gameScene.bgMusic) {
            gameScene.bgMusic.stop(); // detiene y resetea la música
        }
    
        // Fondo semi-transparente
        this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    
        // Título
        const title = this.add.text(width / 2, height / 3, '💀 GAME OVER 💀', {
            fontSize: '60px',
            fontStyle: 'bold',
            fontFamily: 'monospace',
            color: '#ff3333',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 3, stroke: true, fill: true }
        }).setOrigin(0.5);
    
        // Puntuación
        this.add.text(width / 2, height / 2 - 20, `Puntuación: ${this.finalScore}`, {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);
    
        // Botones
        const btnRestart = this.createButton(width / 2, height / 2 + 60, 200, 50, 'REINICIAR', () => {
            // Iniciar GameScene con la música reseteada
            this.scene.start('GameScene', { playMusic: true });
        });
    
        const btnMenu = this.createButton(width / 2, height / 2 + 130, 200, 50, 'MENÚ PRINCIPAL', () => {
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
  