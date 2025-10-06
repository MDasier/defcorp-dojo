export default class Boss extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, "boss");

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);

        this.hp = 1600;
        this.speed = 30;
        this.setScale(1.5);

        this.moveAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        this.changeDirTimer = 0;

        this.lastShot = 0;
        this.fireRate = 1500; 
        this.PDCoff = 4; // Torpedos en distancia larga
        this.PDCon = 8; // Torretas normales
    }

    hit(damage, bulletX, bulletY) {
        this.hp -= damage;
    
        const scene = this.scene;
    
        // 🔴 Parpadeo rápido sin acumular tint
        this.setTintFill(0xffffff); // resetear antes
        scene.tweens.addCounter({
            from: 0xff,
            to: 0x00,
            duration: 100,
            yoyo: true,
            repeat: 0,
            onUpdate: tween => {
                const val = Math.floor(tween.getValue());
                this.setTint(Phaser.Display.Color.GetColor(255, val, val));
            }
        });
    
        // 💥 Impacto lateral: rectángulo rojo
        const impactSize = 30;
        const impact = scene.add.rectangle(0, 0, impactSize, impactSize, 0xff0000)
            .setOrigin(0.5)
            .setDepth(100);
    
        // Ajustar posición según disparo, considerando escala
        const scaledWidth = this.displayWidth;
        const scaledHeight = this.displayHeight;
    
        if (Math.abs(bulletX - this.x) > Math.abs(bulletY - this.y)) {
            impact.x = bulletX < this.x ? this.x - scaledWidth / 2 : this.x + scaledWidth / 2;
            impact.y = bulletY;
        } else {
            impact.y = bulletY < this.y ? this.y - scaledHeight / 2 : this.y + scaledHeight / 2;
            impact.x = bulletX;
        }
    
        // Tween para desaparecer el impacto
        scene.tweens.add({
            targets: impact,
            alpha: 0,
            scale: 2,
            duration: 300,
            ease: "Cubic.easeOut",
            onComplete: () => impact.destroy()
        });
    
        // 💥 Efecto de explosión si muere
        if (this.hp <= 0) {
            scene.tweens.add({
                targets: this,
                scale: this.scale * 2, // crecer al doble
                alpha: 0,              // desaparecer
                duration: 500,
                ease: "Cubic.easeOut",
                onComplete: () => this.destroy()
            });
        }
    }    

    update(time, player, enemyBulletsGroup) {
        if (!this.active) return;

        this.changeDirTimer -= 16;
        if (this.changeDirTimer <= 0) {
            this.moveAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            this.changeDirTimer = Phaser.Math.Between(1000, 3000);
        }

        const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);
        const blendFactor = 0.02;
        this.moveAngle = Phaser.Math.Angle.RotateTo(this.moveAngle, angleToPlayer, blendFactor);

        this.body.setVelocity(Math.cos(this.moveAngle) * this.speed, Math.sin(this.moveAngle) * this.speed);

        const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
        this.turretCount = distance < 400 ? this.PDCon : this.PDCoff;
        this.fireRate = distance < 400 ? 1500 : 3500;

        if (time > this.lastShot) {
            this.shoot(enemyBulletsGroup, player);
            this.lastShot = time + this.fireRate;
        }
    }

    shoot(enemyBulletsGroup, player) {
        if (!this.active) return;

        const horizontalLong = this.width >= this.height;

        // Torretas en lado largo
        let startX, startY, endX, endY;

        if (horizontalLong) {
            startX = this.x - this.width / 2;
            endX = this.x + this.width / 2;
            startY = player.y < this.y ? this.y - this.height / 2 : this.y + this.height / 2;
            endY = startY;
        } else {
            startY = this.y - this.height / 2;
            endY = this.y + this.height / 2;
            startX = player.x < this.x ? this.x - this.width / 2 : this.x + this.width / 2;
            endX = startX;
        }

        for (let i = 0; i < this.turretCount; i++) {
            const t = this.turretCount === 1 ? 0.5 : i / (this.turretCount - 1);
            const turretX = Phaser.Math.Linear(startX, endX, t);
            const turretY = Phaser.Math.Linear(startY, endY, t);

            const bullet = enemyBulletsGroup.get();
            if (bullet) {
                const angleToPlayer = Phaser.Math.Angle.Between(turretX, turretY, player.x, player.y);
                bullet.fire(turretX, turretY, angleToPlayer);
                bullet.shooter = this;
            }
        }

        // Torpedos solo si turretCount === PDCoff
        if (this.turretCount === this.PDCoff) {
            if (horizontalLong) {
                [-this.height / 2, this.height / 2].forEach(offsetY => {
                    const turretX1 = this.x - this.width / 2;
                    const turretY1 = this.y + offsetY;
                    this.fireHoming(enemyBulletsGroup, turretX1, turretY1, player, 150); // velocidad lenta

                    const turretX2 = this.x + this.width / 2;
                    this.fireHoming(enemyBulletsGroup, turretX2, turretY1, player, 150);
                });
            } else {
                [-this.width / 2, this.width / 2].forEach(offsetX => {
                    const turretX1 = this.x + offsetX;
                    const turretY1 = this.y - this.height / 2;
                    this.fireHoming(enemyBulletsGroup, turretX1, turretY1, player, 150);

                    const turretY2 = this.y + this.height / 2;
                    this.fireHoming(enemyBulletsGroup, turretX1, turretY2, player, 150);
                });
            }
        }
    }

    // fireHoming con velocidad configurable
    fireHoming(enemyBulletsGroup, x, y, player, speed = 200) {
        const bullet = enemyBulletsGroup.get();
        if (!bullet) return;

        bullet.fire(x, y, Phaser.Math.Angle.Between(x, y, player.x, player.y));
        bullet.shooter = this;
        bullet.setTint(0xFFFF00);
        bullet.setScale(0.5);
        bullet.setSize(bullet.width * 0.5, bullet.height * 0.5);

        const homingTime = 4000;
        const interval = 50;
        const timer = bullet.scene.time.addEvent({
            delay: interval,
            repeat: Math.floor(homingTime / interval),
            callback: () => {
                if (!bullet.active) {
                    timer.remove(false);
                    return;
                }
                const angle = Phaser.Math.Angle.Between(bullet.x, bullet.y, player.x, player.y);
                bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            }
        });
    }
}
