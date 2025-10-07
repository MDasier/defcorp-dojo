export default class Boss extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "boss");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);

    this.hp = 400;
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
      onUpdate: (tween) => {
        const val = Math.floor(tween.getValue());
        this.setTint(Phaser.Display.Color.GetColor(255, val, val));
      },
    });

    // 💥 Impacto lateral: rectángulo rojo
    const impactSize = 30;
    const impact = scene.add
      .rectangle(0, 0, impactSize, impactSize, 0xff0000)
      .setOrigin(0.5)
      .setDepth(100);

    // Ajustar posición según disparo, considerando escala
    const scaledWidth = this.displayWidth;
    const scaledHeight = this.displayHeight;

    if (Math.abs(bulletX - this.x) > Math.abs(bulletY - this.y)) {
      impact.x =
        bulletX < this.x ? this.x - scaledWidth / 2 : this.x + scaledWidth / 2;
      impact.y = bulletY;
    } else {
      impact.y =
        bulletY < this.y
          ? this.y - scaledHeight / 2
          : this.y + scaledHeight / 2;
      impact.x = bulletX;
    }

    // Tween para desaparecer el impacto
    scene.tweens.add({
      targets: impact,
      alpha: 0,
      scale: 2,
      duration: 300,
      ease: "Cubic.easeOut",
      onComplete: () => impact.destroy(),
    });

    // 💥 Efecto de explosión si muere
    if (this.hp <= 0) {
      this.setActive(false);
      scene.tweens.add({
        targets: this,
        scale: this.scale * 2, // crecer al doble
        alpha: 0, // desaparecer
        duration: 500,
        ease: "Cubic.easeOut",
        onComplete: () => this.destroy(),
      });
    }
  }

  update(time, player, enemyBulletsGroup) {
    if (!this.active) return;

    const scene = this.scene;
    const distance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);
    const angleToPlayer = Phaser.Math.Angle.Between(this.x, this.y, player.x, player.y);

    // 🔄 Decisión táctica cada cierto tiempo
    if (!this.nextDecisionTime || time > this.nextDecisionTime) {
        this.nextDecisionTime = time + Phaser.Math.Between(2000, 4000);

        // Decidir estado según distancia
        if (distance > 600) {
            this.state = "APPROACH";
        } else if (distance < 300) {
            this.state = "RETREAT";
        } else {
            const rand = Phaser.Math.Between(0, 100);
            if (rand < 40) this.state = "FLANK";
            else if (rand < 75) this.state = "PATROL";
            else this.state = "EVADE";
        }

        // Objetivo temporal para movimiento lateral/flanqueo
        const side = Phaser.Math.Between(0, 1) ? 1 : -1;
        const lateralOffset = Phaser.Math.DegToRad(60) * side;
        this.targetAngle = angleToPlayer + lateralOffset;
    }

    // ⚙️ Acción según estado
    switch (this.state) {
        case "APPROACH":
            // Se acerca suavemente manteniendo lateralidad
            this.targetAngle = Phaser.Math.Angle.RotateTo(this.targetAngle, angleToPlayer, 0.02);
            this.speed = 70;
            break;

        case "RETREAT":
            // Se aleja manteniendo los lados apuntando al jugador
            this.targetAngle = Phaser.Math.Angle.Wrap(angleToPlayer + Math.PI + Phaser.Math.FloatBetween(-0.3, 0.3));
            this.speed = 120;
            break;

        case "FLANK":
            // Flanqueo lateral con ligera oscilación
            this.targetAngle += Phaser.Math.FloatBetween(-0.02, 0.02);
            this.speed = 90;
            break;

        case "EVADE":
            // Movimiento evasivo rápido y aleatorio
            this.targetAngle += Phaser.Math.FloatBetween(-0.5, 0.5);
            this.speed = 140;
            break;

        case "PATROL":
        default:
            // Patrulla suavemente
            this.targetAngle += Phaser.Math.FloatBetween(-0.02, 0.02);
            this.speed = 50;
            break;
    }

    // 💨 Movimiento suave hacia el targetAngle
    this.moveAngle = Phaser.Math.Angle.RotateTo(this.moveAngle, this.targetAngle, 0.03);
    this.body.setVelocity(
        Math.cos(this.moveAngle) * this.speed,
        Math.sin(this.moveAngle) * this.speed
    );

    // 🔁 Mantener rotación hacia el jugador (para disparo desde ambos lados)
	this.rotation = angleToPlayer - Phaser.Math.DegToRad(90); // lateral perfecto para 8 torretas

	// 🔄 Ajustar el colisionador según la orientación del boss (simulación rotacional)
	const angleDeg = Phaser.Math.RadToDeg(this.rotation) % 180;
	const absAngle = Math.abs(angleDeg);

	let offsetX = 0;
	let offsetY = 0;

	// Si está "más acostado" (horizontal)
	if (absAngle < 45 || absAngle > 135) {
		this.body.setSize(this.displayWidth * 0.6, this.displayHeight * 0.4);
		offsetY = -15; // 🔸 subir un poco el colisionador
	}
	// Si está "más de pie" (vertical)
	else {
		this.body.setSize(this.displayWidth * 0.25, this.displayHeight * 0.9);
		offsetX = -30; // 🔸 mover ligeramente hacia la izquierda
	}

	// Mantener el body centrado respecto al sprite, con desplazamiento extra
	this.body.setOffset(
		this.displayWidth / 2 - this.body.width / 2 + offsetX,
		this.displayHeight / 2 - this.body.height / 2 + offsetY
	);



    // 💥 Control de disparo
    this.turretCount = distance < 400 ? this.PDCon : this.PDCoff;
    this.fireRate = distance < 400 ? 1500 : 3500;

    if (time > this.lastShot) {
        this.shoot(enemyBulletsGroup, player);
        this.lastShot = time + this.fireRate;
    }

	// Limitar el boss dentro de la pantalla
	const halfWidth = this.displayWidth / 2;
	const halfHeight = this.displayHeight / 2;

	// Definir un margen extra que permita asomar medio cuerpo
	const marginX = halfWidth * 0.5;   // deja asomar 50% del ancho
	const marginY = halfHeight * 0.5;  // deja asomar 50% de la altura

	this.x = Phaser.Math.Clamp(this.x, marginX, this.scene.scale.width - marginX);
	this.y = Phaser.Math.Clamp(this.y, marginY, this.scene.scale.height - marginY);

}


  shoot(enemyBulletsGroup, player) {
    if (!this.active) return;

    const horizontalLong = this.width >= this.height;

    // Torretas en lado largo
    let startX, startY, endX, endY;

    if (horizontalLong) {
      startX = this.x - this.width / 2;
      endX = this.x + this.width / 2;
      startY =
        player.y < this.y ? this.y - this.height / 2 : this.y + this.height / 2;
      endY = startY;
    } else {
      startY = this.y - this.height / 2;
      endY = this.y + this.height / 2;
      startX =
        player.x < this.x ? this.x - this.width / 2 : this.x + this.width / 2;
      endX = startX;
    }

    // ⚙️ Disparos normales (rápidos, menos daño)
    if (this.turretCount === this.PDCon) {
      for (let i = 0; i < this.turretCount; i++) {
        const t = this.turretCount === 1 ? 0.5 : i / (this.turretCount - 1);
        const turretX = Phaser.Math.Linear(startX, endX, t);
        const turretY = Phaser.Math.Linear(startY, endY, t);

        const bullet = enemyBulletsGroup.get(); // ✅ Mover aquí
        if (bullet) {
          const angleToPlayer = Phaser.Math.Angle.Between(
            turretX,
            turretY,
            player.x,
            player.y
          );

          bullet.fire(turretX, turretY, angleToPlayer, this, 350, 2);
          bullet.shooter = this;
          bullet.setTint(0xff4444);
          bullet.setScale(0.4);
          bullet.body.setVelocity(
            Math.cos(angleToPlayer) * 350,
            Math.sin(angleToPlayer) * 350
          );
        }
      }
    }

    // 🚀 Torpedos (lentos, alto daño y teledirigidos)
    else if (this.turretCount === this.PDCoff) {
      if (horizontalLong) {
        [-this.height / 2, this.height / 2].forEach((offsetY) => {
          const turretX1 = this.x - this.width / 2;
          const turretY1 = this.y + offsetY;
          this.fireHoming(enemyBulletsGroup, turretX1, turretY1, player, 150);

          const turretX2 = this.x + this.width / 2;
          this.fireHoming(enemyBulletsGroup, turretX2, turretY1, player, 150);
        });
      } else {
        [-this.width / 2, this.width / 2].forEach((offsetX) => {
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

    bullet.damage = 40;

    bullet.fire(
      x,
      y,
      Phaser.Math.Angle.Between(x, y, player.x, player.y),
      this,
      speed,
      bullet.damage
    );
    bullet.shooter = this;
    bullet.setTint(0xffff00); // Amarillo
    bullet.setScale(0.6);
    bullet.setSize(bullet.width * 0.6, bullet.height * 0.6);

    const homingTime = 4000;
    const interval = 50;
	bullet.rotation = Phaser.Math.Angle.Between(x, y, player.x, player.y);

    const timer = bullet.scene.time.addEvent({
      delay: interval,
      repeat: Math.floor(homingTime / interval),
      callback: () => {
        if (!bullet.active) {
          timer.remove(false);
          return;
        }
        const angle = Phaser.Math.Angle.Between(
          bullet.x,
          bullet.y,
          player.x,
          player.y
        );
        bullet.body.setVelocity(
          Math.cos(angle) * speed,
          Math.sin(angle) * speed
        );
      },
    });
  }
}
