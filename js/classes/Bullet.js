export default class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "bullet");

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body.setAllowGravity(false);
    this.setActive(false);
    this.setVisible(false);
    this.setSize(0.2, 0.2);
  }

  fire(x, y, angle, shooter, speed = 400, damage = 1) {
    this.setPosition(x, y);
    this.setActive(true);
    this.setVisible(true);
	if (this.scene.player.shotColor) this.setTint(this.scene.player.shotColor);
    if (this.body) {
      this.body.enable = true;
      this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
      this.setRotation(angle); // + Math.PI / 2
      this.setAlpha(0.9);
      this.setScale(0.2);
    }

    // destruir/desactivar bala después de 2s
    this.scene.time.delayedCall(4000, () => {
      this.setActive(false);
      this.setVisible(false);
      if (this.body) this.body.enable = false;
    });
  }

  update() {
    if (!this.active) return;
  }
}
