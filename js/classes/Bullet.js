export default class Bullet extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'bullet');

        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setAllowGravity(false);
        this.setActive(false);
        this.setVisible(false);

        this.setSize(0.2, 0.2);
    }

    fire(x, y, angle) {
        this.setPosition(x, y);
        this.setActive(true);
        this.setVisible(true);

        if (this.body) { 
            this.body.enable = true;
            const speed = 400;
            this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            this.setRotation(angle);// + Math.PI / 2
            this.setAlpha(0.9);
            this.setScale(0.2);
        }

        // destruir/desactivar bala después de 2s
        this.scene.time.delayedCall(2000, () => {
            this.setActive(false);
            this.setVisible(false);
            if (this.body) this.body.enable = false;
        });
    }

    update() {
        if (!this.active) return;
    }
}
