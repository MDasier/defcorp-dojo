import Player from "../classes/Player.js";
import Enemy from "../classes/Enemy.js";
import Bullet from "../classes/Bullet.js";
import EnemyBullet from "../classes/EnemyBullet.js";
import Boss from "../classes/Boss.js";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
    this.enemyCount = 0;
    this.bossSpawnedRecently = false;
  }

  preload() {
    this.load.image("ship", "assets/ship.webp");
    this.load.image("enemy1", "assets/enemy.webp");
    this.load.image("enemy2", "assets/enemy_1.webp");
    this.load.image("boss", "assets/boss.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.image("shield", "assets/shield.png");
    //this.load.image("bg1", "assets/bg1.png");
    //this.load.image("bg2", "assets/bg2.jpg");
    this.load.image("bg3", "assets/bg3.png");
    // --- Audio ---
    this.load.audio("bgMusic", "assets/audio/music.mp3");
    this.load.audio("shieldSound", "assets/audio/shield.mp3");
    //this.load.audio('errorBeep', 'assets/sounds/error-beep.mp3');
  }

  create() {
    // Desactivar clic derecho en el juego
    this.input.mouse.disableContextMenu();
    const cx = this.scale.width / 2,
      cy = this.scale.height / 2;

	// Escuchar cambios de tamaño del canvas
	this.scale.on('resize', (gameSize) => {
		const width = gameSize.width;
		const height = gameSize.height;
	  
		// Fondo
		this.bgLayers.forEach((layer, i) => {
		  layer.setSize(width, height);
		  layer.setPosition(width / 2, height / 2);
		});
	  
		// Límites del mundo
		this.physics.world.setBounds(0, 0, width, height);
	  
		// Reposicionar jugador y HUD
		if (this.player) this.player.setPosition(width / 2, height / 2);
	  
		if (this.HPHUDText) this.HPHUDText.setPosition(10, height - 100);
		if (this.HPHUDIcon) this.HPHUDIcon.setPosition(10, height - 80);
		if (this.fuelHUDText) this.fuelHUDText.setPosition(10, height - 36);
		if (this.fuelBarBg) this.fuelBarBg.setPosition(10, height - 16);
		if (this.fuelBar) this.fuelBar.setPosition(10, height - 16);
		if (this.HPBOSSHUDText) this.HPBOSSHUDText.setPosition(width - 100, height - 60);
		if (this.HPBOSSHUDIcon) this.HPBOSSHUDIcon.setPosition(width - 85, height - 40);
		if (this.shieldHUDIcon) this.shieldHUDIcon.setPosition(10, 10);
		if (this.shieldHUDText) this.shieldHUDText.setPosition(50, 10);
	  });
	  

    // Fondo
    this.bgLayers = [
    	//this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, "bg1"),
    	//this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, "bg2"),
		this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, "bg3"),
    ];

    // Jugador
    this.player = new Player(this, cx, cy);
    this.player.setSize(this.player.width * 0.6, this.player.height * 0.6); // hitbox 60% del sprite
    this.player.setOffset(this.player.width * 0.2, this.player.height * 0.2); // centrar la hitbox

    // Lista de balas
    this.bullets = this.physics.add.group({
      classType: Bullet,
      maxSize: 30,
      runChildUpdate: true,
    });

    // Lista de enemigos
    this.enemies = this.physics.add.group();

    // Lista de balas enemigos
    this.enemyBullets = this.physics.add.group({
      classType: EnemyBullet,
      maxSize: 20,
      runChildUpdate: true,
    });

    // Lista de objetos de vida y fuel
    this.healthItems = this.physics.add.group();
    this.fuelItems = this.physics.add.group();

    // Teclas disponibles
    this.cursors = this.input.keyboard.addKeys("W,A,S,D,TAB,ESC");
    this.lastShot = 0;

    // --- EASTER EGG: secuencia de teclas "ADADADAD" ---
    this.secretSequence = [
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
      "A",
      "D",
    ];
    this.sequenceIndex = 0;

    this.input.keyboard.on("keydown", (event) => {
      const key = event.key.toUpperCase();

      if (key === "A" || key === "D") {
        this.handleSecretInput(key);
      }
    });

    // HUD Escudo
    this.shieldHUDIcon = this.add
      .image(10, 10, "shield")
      .setScale(0.1)
      .setScrollFactor(0)
      .setOrigin(0);
    this.shieldHUDText = this.add
      .text(50, 10, "", { fontSize: "16px", fill: "#00ccff" })
      .setScrollFactor(0);

    // HUD HP
    this.HPHUDText = this.add
      .text(10, this.scale.height - 100, "HP", {
        fontSize: "20px",
        fill: "#00ccff",
      })
      .setScrollFactor(0);

    this.HPHUDIcon = this.add
      .image(10, this.scale.height - 80, "ship")
      .setScale(0.1)
      .setScrollFactor(0)
      .setOrigin(0);

    // HUD HP BOSS
    this.HPBOSSHUDText = this.add
      .text(this.scale.width - 100, this.scale.height - 60, "BOSS HP", {
        fontSize: "20px",
        fill: "#00ccff",
      })
      .setScrollFactor(0)
      .setVisible(false);

    this.HPBOSSHUDIcon = this.add
      .image(this.scale.width - 85, this.scale.height - 40, "boss")
      .setScale(0.2)
      .setScrollFactor(0)
      .setOrigin(0)
      .setVisible(false);

    // HUD Fuel
    this.fuelHUDText = this.add
      .text(10, this.scale.height - 36, "Fuel", {
        fontSize: "20px",
        fill: "#00ccff",
      })
      .setScrollFactor(0);
    this.fuelBarBg = this.add
      .rectangle(10, this.scale.height - 16, 104, 16, 0x333333)
      .setOrigin(0, 0);
    this.fuelBar = this.add
      .rectangle(10, this.scale.height - 16, 100, 12, 0x00ff00)
      .setOrigin(0, 0);
    this.fuelBar.setScrollFactor(0);

    // HUD modal oculto
    this.hudVisible = false;
    this.hud = this.add
      .rectangle(cx, cy, 400, 300, 0x000000, 0.6)
      .setVisible(false);
    this.hudText = this.add
      .text(cx - 180, cy - 120, "", { color: "#fff", fontSize: "16px" })
      .setVisible(false);

    // ESC menú pausa
    this.cursors.ESC = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC
    );

    // Eventos
    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown()) this.player.activateShield(this);
      else this.shoot(pointer);
    });

    this.time.addEvent({
      delay: 1500,
      callback: () => this.spawnEnemy(),
      loop: true,
    });

    // Colisiones de Disparos del jugador contra enemigos
    this.physics.add.overlap(
      this.bullets,
      this.enemies,
      this.hitEnemy,
      null,
      this
    );
    this.physics.add.overlap(
      this.enemies,
      this.player,
      this.hitPlayer,
      null,
      this
    );
    //this.physics.add.overlap(this.enemyBullets, this.enemies, this.hitEnemyBullet, null, this);

    // Colisiones de disparos del jugador contra enemigos
    this.physics.add.overlap(this.bullets, this.enemies, (bullet, enemy) => {
      bullet.destroy();
      enemy.hit(1);
      if (!enemy.active) this.player.addScore(10);
    });

    // Colisiones de enemigos con jugador
    this.physics.add.overlap(this.enemies, this.player, (enemy, player) => {
      if (player.shieldActive || player.invincible) {
        this.enemyFlee(enemy, player);
        return;
      }
      this.player.takeDamage(10);
    });

    // Colisiones de balas enemigas con enemigos
    this.physics.add.overlap(
      this.enemyBullets,
      this.enemies,
      (bullet, enemy) => {
        if (bullet.shooter === enemy) return;
        bullet.destroy();
        enemy.hit(1);
      }
    );

    // Colisiones de balas enemigas con jugador
	this.physics.add.overlap(
		this.enemyBullets,
		this.player,
		(player, bullet) => {
		if (!bullet.active || !player.active) return;
	
		// Solo torpedos (alto daño)
		if (bullet.damage >= 40) {
			// Efecto de explosión
			const explosion = this.add.circle(bullet.x, bullet.y, 15, 0xffaa00)
			.setDepth(200)
			.setAlpha(0.7);
	
			this.tweens.add({
			targets: explosion,
			scale: 2,
			alpha: 0,
			duration: 200,
			onComplete: () => explosion.destroy()
			});
		}
	
		bullet.disableBody(true, true); // desactivar la bala
		player.takeDamage(bullet.damage);
	
		// Destruir bullet después de un breve delay
		this.time.delayedCall(100, () => {
			if (bullet) bullet.destroy();
		});
		}
	);
  

    // Colisiones de objetos de vida y fuel con jugador
    this.physics.add.overlap(
      this.player,
      this.healthItems,
      this.collectItem,
      null,
      this
    );
    this.physics.add.overlap(
      this.player,
      this.fuelItems,
      this.collectItem,
      null,
      this
    );

	// 💥 Balas del jugador pueden destruir torpedos del boss
	this.physics.add.overlap(this.bullets, this.enemyBullets, (playerBullet, enemyBullet) => {
		if (!enemyBullet.active || !playerBullet.active) return;

		// Solo afecta a torpedos (no a las balas normales)
		if (enemyBullet.damage >= 40) {
			// Efecto de explosión pequeña
			const explosion = this.add.circle(enemyBullet.x, enemyBullet.y, 15, 0xffaa00)
				.setDepth(200)
				.setAlpha(0.7);
			this.tweens.add({
				targets: explosion,
				scale: 2,
				alpha: 0,
				duration: 200,
				onComplete: () => explosion.destroy()
			});

			// Destruir ambos proyectiles
			playerBullet.destroy();
			enemyBullet.destroy();
		}
	}, null, this);

  
  }

  handleSecretInput(key) {
    if (key === this.secretSequence[this.sequenceIndex]) {
      // Correcto, avanzamos
      this.sequenceIndex++;
      if (this.sequenceIndex === this.secretSequence.length) {
        this.triggerEasterEgg();
        this.sequenceIndex = 0;
      }
    } else {
      // No coincide, buscar el mayor prefijo que coincida
      this.sequenceIndex = 0;
      for (let i = 1; i < this.secretSequence.length; i++) {
        // Verificamos si la secuencia termina en los últimos i caracteres + tecla actual coincide
        const subSeq = this.secretSequence.slice(0, i);
        const recentKeys = this.recentKeys ? this.recentKeys.slice(-i) : [];
        if ([...recentKeys, key].join("") === subSeq.join("")) {
          this.sequenceIndex = i;
          break;
        }
      }
    }

    // Guardamos las últimas teclas pulsadas
    this.recentKeys = this.recentKeys || [];
    this.recentKeys.push(key);
    if (this.recentKeys.length > this.secretSequence.length) {
      this.recentKeys.shift();
    }
  }

  triggerEasterEgg() {
    if (this.scene.isActive("EEScene")) return;

    // 🎵 Pitido de error
    //this.sound.play('errorBeep', { volume: 0.5 });

    // 💥 Efecto glitch visual
    this.cameras.main.flash(150, 255, 0, 0); // flash rojo
    this.cameras.main.shake(400, 0.02); // sacudida leve

    // 🔁 Parpadeo tipo interferencia
    this.time.addEvent({
      delay: 50,
      repeat: 10,
      callback: () => {
        this.cameras.main.flash(30, Phaser.Math.Between(150, 255), 0, 0);
      },
    });

    // Pequeña pausa antes de lanzar la escena del error
    this.time.delayedCall(600, () => {
      this.scene.pause();
      this.scene.launch("EEScene");
    });
  }

  update(time) {
    this.player.update(this.cursors, this.input.mousePointer, time, this);

    // Actualizar HUD HP
    // Porcentaje de HP
    const hpPercent = Phaser.Math.Clamp(this.player.hp / 100, 0, 1);
    // Interpolación de color: de blanco (0xffffff) a rojo (0xff0000)
    const r = 0xff;
    const g = Math.floor(0xff * hpPercent); // disminuye hacia 0 cuando HP baja
    const b = Math.floor(0xff * hpPercent); // disminuye hacia 0 cuando HP baja
    const tint = (r << 16) | (g << 8) | b;
    this.HPHUDIcon.setTint(tint);

    // Actualizar boss
    if (this.boss) {
		if (this.boss.active) {
		  this.boss.update(time, this.player, this.enemyBullets);
		} else {
		  this.HPBOSSHUDText.setVisible(false);
		  this.HPBOSSHUDIcon.setVisible(false);
		}
	}
    // Actualizar HUD HP Boss
    if (this.boss && this.boss.active) {
      this.HPBOSSHUDText.setVisible(true);
      this.HPBOSSHUDIcon.setVisible(true);
      // Porcentaje de HP
      const hpBossPercent = Phaser.Math.Clamp(this.boss.hp / 400, 0, 1);
      // Interpolación de color: de blanco (0xffffff) a rojo (0xff0000)
      const rb = 0xff;
      const gb = Math.floor(0xff * hpBossPercent); // disminuye hacia 0 cuando HP baja
      const bb = Math.floor(0xff * hpBossPercent); // disminuye hacia 0 cuando HP baja
      const tintb = (rb << 16) | (gb << 8) | bb;
      this.HPBOSSHUDIcon.setTint(tintb);
    }

    //TODO
    // Alerta HP y/o Fuel al límite

    // Actualizar HUD Fuel
    //this.fuelHUDText.setText(`${'Fuel: ' + this.player.fuel}`);
    const fuelPercent = this.player.fuel / 1000; // fuel máximo = 1000
    this.fuelBar.width = 100 * fuelPercent;
    if (fuelPercent > 0.6) this.fuelBar.fillColor = 0x00ff00;
    else if (fuelPercent > 0.3) this.fuelBar.fillColor = 0xffff00;
    else this.fuelBar.fillColor = 0xff0000;

    // Actualizar HUD escudo
    this.shieldHUDText.setText(`${this.player.shieldUses}`);
    if (this.player.shieldActive) {
      this.shieldHUDIcon.setTint(0x00ff00, 0.5); // 'verde' si activo
    } else if (this.player.shieldUses > 0) {
      this.shieldHUDIcon.setTint(0x414141); // 'gris' si listo
    } else {
      this.shieldHUDIcon.setTint(0xff0000, 0.5); // 'rojo' si agotado
    }

    // HUD visible mientras se mantiene TAB presionado
    this.hudVisible = this.cursors.TAB.isDown;
    this.hud.setVisible(this.hudVisible);
    this.hudText.setVisible(this.hudVisible);

    if (this.hudVisible) {
      this.hudText.setText(
        `🧩 HUD\n\n` +
          `Score: ${this.player.score}\n` +
          `HP: ${this.player.hp}\n` +
          `SHIELD: ${this.player.shieldActive ? "Activo" : "Listo"}`
      );
    }

    // ESC menú pausa
    if (Phaser.Input.Keyboard.JustDown(this.cursors.ESC)) {
      if (this.bgMusic && this.bgMusic.isPlaying) {
        this.bgMusic.pause(); // pausa la música al entrar en pausa
      }
      this.scene.launch("PauseScene");
      this.scene.pause();
    }

    // Fondo parallax
    this.bgLayers.forEach((layer, i) => {
      layer.tilePositionX += this.player.body.velocity.x * 0.002 * (i + 1);
      layer.tilePositionY += this.player.body.velocity.y * 0.002 * (i + 1);
    });

    // Balas y enemigos
    this.bullets.children.each((b) => b.update(time));
    this.enemies.children.each((e) =>
      e.update(this.player, time, this.enemies)
    );
    this.enemyBullets.children.each((eb) => eb.update());
  }

  shoot(pointer) {
    const time = this.time.now;
    if (time < this.lastShot) return;

    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      pointer.x,
      pointer.y
    );
    const bullet = this.bullets.get();

    if (bullet) bullet.fire(this.player.x, this.player.y, angle);

    this.lastShot = time + 200;
  }

  collectItem(player, item) {
    if (!item.active) return;

    item.disableBody(true, true); // desaparecer el ítem

    // Determinar efecto según tipo
    const type = item.getData("type");

    let text = "";
    let color = "";

    if (type === "health") {
      player.hp = Math.min(player.hp + 10, 100);
      text = "+10 HP";
      color = "#00ff00"; // verde
    } else if (type === "fuel") {
      player.fuel = Math.min(player.fuel + 100, 1000);
      text = "+100 Fuel";
      color = "#ffa500"; // naranja
    }

    // Efecto visual para el texto
    const itemText = this.add
      .text(player.x, player.y - 20, text, {
        fontSize: "16px",
        fill: color,
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: itemText,
      y: itemText.y - 30,
      alpha: 0,
      duration: 800,
      onComplete: () => itemText.destroy(),
    });
  }

  spawnBoss() {
    if (this.boss && this.boss.active) return;

    const x = Phaser.Math.Between(100, this.scale.width - 100);
    const y = 100;

    // Crear instancia
    this.boss = new Boss(this, x, y);

    // Hitbox
    const width = this.boss.width * 0.6;
    const height = this.boss.height * 0.6;
    this.boss.setSize(width, height);
    this.boss.setOffset(
      (this.boss.width - width) / 2,
      (this.boss.height - height) / 2
    );

    // Crear grupo de un solo boss
    if (!this.bossGroup) {
      this.bossGroup = this.physics.add.group();
    }
    this.bossGroup.add(this.boss);

    // Colisión jugador - Boss
    this.physics.add.overlap(this.player, this.bossGroup, (player, boss) => {
      if (!player.active || !boss.active) return;
      player.takeDamage(30);
    });

    // Colisión balas
    this.physics.add.overlap(this.bullets, this.bossGroup, (bullet, boss) => {
      if (!boss.active) return;
      bullet.destroy();
      boss.hit(1);
      if (!boss.active) this.player.addScore(100);
    });
  }

  spawnEnemy() {
    if (this.boss && this.boss.active) return;
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    switch (side) {
      case 0:
        x = -50;
        y = Phaser.Math.Between(0, 600);
        break;
      case 1:
        x = 850;
        y = Phaser.Math.Between(0, 600);
        break;
      case 2:
        x = Phaser.Math.Between(0, 800);
        y = -50;
        break;
      case 3:
        x = Phaser.Math.Between(0, 800);
        y = 650;
        break;
    }

    const type = Phaser.Math.Between(1, 3);
    const enemy = new Enemy(this, x, y, type);

    this.enemyCount++;

    // Cada 10 enemigos → uno especial
    if (this.enemyCount % 10 === 0) {
      enemy.isSpecial = true;
      enemy.setTint(0x414141);
    }

    // Cada 25 enemigos → un boss
    if (this.enemyCount % 25 === 0) {
      if (!this.boss || !this.boss.active) {
        this.spawnBoss();
      }
    }

    this.enemies.add(enemy);
  }

  hitEnemy(bullet, enemy) {
    bullet.destroy();
    enemy.hit(1);
    //if (!enemy.active) this.player.score += 10;
    if (!enemy.active) this.player.addScore(10);
  }

  hitPlayer(player, enemy) {
    if (player.shieldActive || player.invincible) {
      // Empujar al enemigo
      this.enemyFlee(enemy, player);
      return;
    }

    enemy.destroy();
    player.takeDamage(10);
  }

  // Función auxiliar para que el enemigo huya del jugador
  enemyFlee(enemy, player) {
    const fleeDistance = 300; // más distancia para “empujón”

    // Calcular ángulo desde el jugador hacia el enemigo (huyendo)
    const angle = Phaser.Math.Angle.Between(
      player.x,
      player.y,
      enemy.x,
      enemy.y
    );

    // Coordenadas destino
    const targetX = enemy.x + Math.cos(angle) * fleeDistance;
    const targetY = enemy.y + Math.sin(angle) * fleeDistance;

    // Rotación hacia la dirección de huida
    const targetRotation = angle + Math.PI / 2;

    // Tween para mover y rotar al enemigo
    this.tweens.add({
      targets: enemy,
      x: targetX,
      y: targetY,
      rotation: targetRotation,
      duration: 1500,
      ease: "easeInOut",
      onComplete: () => {
        // todo: reiniciar dirección normal del enemigo o comportamiento
      },
    });
  }
}
