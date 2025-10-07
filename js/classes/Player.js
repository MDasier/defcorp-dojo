export default class Player extends Phaser.Physics.Arcade.Sprite {
	constructor(scene, x, y, spriteKey = 'ship', ability = 'SHIELD') {
		super(scene, x, y, spriteKey);
		scene.add.existing(this);
		scene.physics.add.existing(this);
		this._scene = scene;
		this.setDamping(true);
		this.setDrag(0.98);
		this.setMaxVelocity(300);
		this.setCollideWorldBounds(true);
		this.setScale(0.10);

		const ships = ['LIGHT', 'MEDIUM', 'DEFAULT'];
		if (spriteKey === 'RNG') Math.random() > 0.5 ? spriteKey = ships[0] : spriteKey = ships[1];
		switch (spriteKey) {
			case 'LIGHT':
				this.setScale(0.10);
				break;
			case 'MEDIUM':
				this.setScale(0.15);
				break;
			default:
				this.setScale(0.15);
				break;
		}

		this.hp = 100;
		this.maxHp = 100;
		this.fuel = 1000;
		this.fuelConsumptionRate = 0.1;
		this.score = 0;
		this.special = ability;
		this.shieldCD = 0;
		this.shieldActive = false;
		this.specialSkillUses = 5;
		this.shieldSprite = scene.add.image(x, y, 'shield').setVisible(false).setScale(0.2);
		this.lastScoreCheckpoint = Math.floor(this.score / 100);

		this.invincible = false;
		this.invincibleTimer = 0;
		this.invincibleTween = null; // Tween de parpadeo

		// Diferentes estadísticas según la nave
		switch (spriteKey) {
			case 'LIGHT':
				this.speed = 300;
				this.hp = 80;
				this.maxHp = 80;
				break;
			case 'MEDIUM':
				this.speed = 200;
				this.hp = 150;
				this.maxHp = 150;
				break;
			default:
				this.speed = 250;
				this.hp = 100;
				this.maxHp = 100;
				break;
		}
	}

	getStats() {
		return {
			hp: this.hp,
			maxHp: this.maxHp || 100, 
			fuel: this.fuel,
			specialSkillUses: this.specialSkillUses,
			special: this.special
		};
	}
	

	update(cursors, mouse, time, scene) {
		if (!this.body || !this.active) return;

		//if (this.scene.player.shipColor) this.setTint(this.scene.player.shipColor);
		this.setTint(this.shipColor ?? 0xffffff);
		const baseSpeed = this.speed;
		const maxSpeed = 400;

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
		if (this.shieldActive || this.specialSkillUses <= 0) return;

		// --- reproducir sonido del escudo ---
		scene.sound.play('shieldSound', { volume: 0.6 });
	
		this.shieldActive = true;
		this.shieldSprite.setVisible(true);
		this.shieldSprite.setAlpha(0.4); // transparente mientras activo
		this.shieldCD = scene.time.now + 2000;
		this.specialSkillUses--;

	}
	
	deactivateShield() {
		this.shieldActive = false;
		this.shieldSprite.setVisible(false);
		this.shieldSprite.setAlpha(1); // restaurar opacidad completa
	}
	
	activateEMP(scene) {
		// Comprobación de cooldown y usos
		if ((this.empCooldown && scene.time.now < this.empCooldown) || this.specialSkillUses <= 0) return;
	
		const empRadius = 400; // Radio del EMP
	
		// Círculo visual alrededor del jugador
		const empCircle = scene.add.circle(this.x, this.y, empRadius, 0x00ffff, 0.3);
		empCircle.setDepth(1000); // encima de todo
		empCircle.setStrokeStyle(2, 0x00ffff, 0.8);
	
		// Tween para parpadeo y desaparición
		scene.tweens.add({
			targets: empCircle,
			alpha: 0,
			scale: 1.2,
			duration: 400,
			yoyo: false,
			onComplete: () => empCircle.destroy()
		});
	
		// Sonido
		scene.sound.play('shieldSound', { volume: 0.4 });
	
		// Desactivar enemigos cercanos dentro del radio
		scene.enemies.children.each(enemy => {
			if (!enemy.active) return;
			const dist = Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y);
			if (dist <= empRadius) {
				enemy.destroy();
	
				// Pequeña explosión
				const pulse = scene.add.circle(enemy.x, enemy.y, 20, 0x00ffff).setAlpha(0.6);
				scene.tweens.add({
					targets: pulse,
					scale: 2,
					alpha: 0,
					duration: 800,
					onComplete: () => pulse.destroy()
				});
			}
		});
	
		this.specialSkillUses--;
		this.empCooldown = scene.time.now + 3000; // ejemplo cooldown 3s
	}
	
	activateQuantumJump(scene) {
		if (this.specialCooldown && scene.time.now < this.specialCooldown || this.specialSkillUses <= 0) return;
	
		const cam = scene.cameras.main;
	
		// Efecto de salto cuántico (teletransporte corto en dirección del cursor)
		const pointer = scene.input.activePointer;
		const angle = Phaser.Math.Angle.Between(this.x, this.y, pointer.x, pointer.y);
		const jumpDistance = 400;
	
		const newX = this.x + Math.cos(angle) * jumpDistance;
		const newY = this.y + Math.sin(angle) * jumpDistance;
	
		cam.flash(100, 0, 0, 255);
		//scene.sound.play('teleport', { volume: 0.6 });
		scene.sound.play('shieldSound', { volume: 0.6 });
	
		const clampedX = Phaser.Math.Clamp(newX, 0, scene.scale.width);
		const clampedY = Phaser.Math.Clamp(newY, 0, scene.scale.height);

		this.setPosition(clampedX, clampedY);
		this.specialCooldown = scene.time.now + 3000; // 3s de recarga
		this.specialSkillUses--;

	}	

	die() {
		if (this.scene.bgMusic && this.scene.bgMusic.isPlaying) {
			this.scene.bgMusic.stop();
		}
		this.scene.scene.start('GameOverScene', { score: this.score });
	}
}
