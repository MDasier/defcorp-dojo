export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y) {
		super(scene, x, y, 'bullet');
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this.speed = 300;
        this.shooter = null;
	}

	fire(x, y, angle, shooter) {
		this.setPosition(x, y);
		this.setActive(true);
		this.setVisible(true);
		this.scene.physics.velocityFromRotation(angle, this.speed, this.body.velocity);
        this.setAlpha(0.8);
        this.setTint(0xff0000);
        this.setScale(0.2);
        this.shooter = shooter;
	}

	update() {
        if (
            this.x < 0 || this.x > this.scene.scale.width ||
            this.y < 0 || this.y > this.scene.scale.height
        ) {
            this.destroy();
        }
    }
}
