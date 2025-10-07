export default class EnemyBullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "bullet");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.speed = 300;
    this.shooter = null;
    this.damage = 1;
    this.setSize(0.2, 0.2);
  }

  fire(x, y, angle, shooter, speed = 300, damage = 1) {
    this.setPosition(x, y);
    this.body.reset(x, y);
    this.setActive(true);
    this.setVisible(true);
    this.scene.physics.velocityFromRotation(
      angle,
      speed,
      this.body.velocity
    );
    this.damage = damage;
    this.setAlpha(0.8);
    this.setTint(0xff0000);
    this.setScale(0.2);
    this.shooter = shooter;
  }

  update() {
    if (this.x < 0 || this.x > this.scene.scale.width || this.y < 0 || this.y > this.scene.scale.height) {
        this.setActive(false);
        this.setVisible(false);
        this.body.stop();
    }
    // 🔄 Rotar la bala según su dirección
    if (this.body && (this.body.velocity.x !== 0 || this.body.velocity.y !== 0)) {
        const angle = Phaser.Math.Angle.Between(0, 0, this.body.velocity.x, this.body.velocity.y);
        this.setRotation(angle);
    }
  }
}
