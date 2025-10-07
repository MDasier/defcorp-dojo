export default class Player extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y) {
		super(scene, x, y, 'ship');
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this._scene = scene;
		this.setDamping(true);
		this.setDrag(0.98);
		this.setMaxVelocity(300);
		this.setCollideWorldBounds(true);
		this.setScale(0.10);

		this.hp = 100;
		this.fuel = 1000;
		this.fuelConsumptionRate = 0.1;
		this.score = 0;
		this.shieldCD = 0;
		this.shieldActive = false;
		this.shieldUses = 3;
		this.shieldSprite = scene.add.image(x, y, 'shield').setVisible(false).setScale(0.2);
		this.lastScoreCheckpoint = Math.floor(this.score / 100);

		this.invincible = false;
		this.invincibleTimer = 0;
		this.invincibleTween = null; // Tween de parpadeo
	}

	update(cursors, mouse, time, scene) {
		if (!this.body || !this.active) return;

		const baseSpeed = 150;
		const maxSpeed = 300;

		let moveX = 0, moveY = 0;
		if (cursors.W.isDown) moveY -= 1;
		if (cursors.S.isDown) moveY += 1;
		if (cursors.A.isDown) moveX -= 1;
		if (cursors.D.isDown) moveX += 1;

		const len = Math.hypot(moveX, moveY);
		if (len > 0) {
			moveX /= len;
			moveY /= len;
		}

		const pointer = scene.input.activePointer;
		const toCursorX = pointer.x - this.x;
		const toCursorY = pointer.y - this.y;
		const toCursorLen = Math.hypot(toCursorX, toCursorY);
		const normCursorX = toCursorX / toCursorLen;
		const normCursorY = toCursorY / toCursorLen;

		const dot = moveX * normCursorX + moveY * normCursorY;
		const speed = baseSpeed + (maxSpeed - baseSpeed) * Math.max(0, dot);

		this.setVelocity(moveX * speed, moveY * speed);

		if (len > 0) {
			this.fuel = Math.max(0, this.fuel - this.fuelConsumptionRate * (speed / maxSpeed));
		}

		this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, scene.input.x, scene.input.y));

		if (this.shieldActive) {
			this.shieldSprite.x = this.x;
			this.shieldSprite.y = this.y;
			if (scene.time.now > this.shieldCD) this.deactivateShield();
		}

		// FIN DE INVENCIBILIDAD
		if (this.invincible && time > this.invincibleTimer) {
			this.invincible = false;
			if (this.invincibleTween) {
				this.invincibleTween.stop();
				this.invincibleTween = null;
			}
			this.setAlpha(1);
		}

		if (this.fuel <= 0) {
			this.fuel = 0;
			this.die();
			return;
		}
	}

	takeDamage(amount) {
		if (this.shieldActive || this.invincible) return;
	
		this.hp -= amount;
	
		if (this.hp <= 0) {
			this.hp = 0;
			this.die();
			return;
		}
	
		// Activar invencibilidad
		this.invincible = true;
		this.invincibleTimer = this._scene.time.now + 800;
	
		if (!this.invincibleTween) {
			this.invincibleTween = this._scene.tweens.add({
				targets: this,
				alpha: 0.2,
				yoyo: true,
				repeat: -1,
				duration: 200
			});
		}
	}
	

	addScore(points) {
		this.score += points;
		const checkpoint = Math.floor(this.score / 100);
		if (checkpoint > this.lastScoreCheckpoint) {
			const extraUses = checkpoint - this.lastScoreCheckpoint;
			this.shieldUses = Math.min(this.shieldUses + extraUses, 3);
			this.lastScoreCheckpoint = checkpoint;
		}
	}

	activateShield(scene) {
		if (this.shieldActive || this.shieldUses <= 0) return;

		// --- reproducir sonido del escudo ---
		scene.sound.play('shieldSound', { volume: 0.6 });
	
		this.shieldActive = true;
		this.shieldSprite.setVisible(true);
		this.shieldSprite.setAlpha(0.4); // transparente mientras activo
		this.shieldCD = scene.time.now + 2000;
		this.shieldUses--;

	}
	
	deactivateShield() {
		this.shieldActive = false;
		this.shieldSprite.setVisible(false);
		this.shieldSprite.setAlpha(1); // restaurar opacidad completa
	}
	

	die() {
		if (this.scene.bgMusic && this.scene.bgMusic.isPlaying) {
			this.scene.bgMusic.stop();
		}
		this.scene.scene.start('GameOverScene', { score: this.score });
	}
}
