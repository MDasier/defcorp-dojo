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
    this.nextSpecialAt = Phaser.Math.Between(6, 11);
    // Propiedades para las capas y decoraciones
    this.bgLayers = [];
    this.debrisGroup = null; // restos  (depth 1)
    this.cloudsGroup = null; // nubes (depth 3)
    this.parallaxConfig = {
      bgSpeed: 0.01, // velocidad tilePosition por ms para fondo principal
      debrisMinSpeed: 10,
      debrisMaxSpeed: 40,
      cloudsSpeed: 60,
    };
  }

  preload() {
    this.load.image("LIGHT", "assets/ship.webp");
    this.load.image("MEDIUM", "assets/enemy.webp");
    this.load.image("DEFAULT", "assets/enemy_1.webp");
    this.load.image("enemy1", "assets/enemy.webp");
    this.load.image("enemy2", "assets/enemy_1.webp");
    this.load.image("boss", "assets/boss.png");
    this.load.image("bullet", "assets/bullet.png");
    this.load.image("shield", "assets/shield.png");
    this.load.image("emp", "assets/shield.png");
    this.load.image("quantum", "assets/shield.png");

    // Fondos (varios tamaños)
    this.load.image("bg1", "assets/bg1.png");
    this.load.image("bg2", "assets/bg2.jpg");
    this.load.image("bg3", "assets/bg3.png");
    this.load.image("bg4", "assets/background.jpg");

    // Agujero de gusano
    this.load.image("wormholeCore", "assets/worm.png");

    // Decoraciones (asteroides)
    this.load.image("debris1", "assets/debris1.png");

    // --- Audio ---
    this.load.audio("bgMusic", "assets/audio/music.mp3");
    this.load.audio("shieldSound", "assets/audio/shield.mp3");
  }

  create() {
    // Desactivar clic derecho en el juego
    this.input.mouse.disableContextMenu();
    const cx = this.scale.width / 2,
      cy = this.scale.height / 2;

    // Escuchar cambios de tamaño del canvas
    this.scale.on("resize", (gameSize) => {
      const width = gameSize.width;
      const height = gameSize.height;

      // Fondo: ajustar tamaño y posición
      this.bgLayers.forEach((layer) => {
        // tileSprite: setSize recibe width, height
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
      if (this.HPBOSSHUDText)
        this.HPBOSSHUDText.setPosition(width - 100, height - 60);
      if (this.HPBOSSHUDIcon)
        this.HPBOSSHUDIcon.setPosition(width - 85, height - 40);
      if (this.shieldHUDIcon) this.shieldHUDIcon.setPosition(10, 10);
      if (this.shieldHUDText) this.shieldHUDText.setPosition(50, 10);

      // Reubicar decoraciones: las reposicionamos de forma simple
      if (this.debrisGroup) {
        this.debrisGroup.getChildren().forEach((d) => {
          // Mantener dentro de pantalla
          d.x = Phaser.Math.Clamp(d.x, 0, width);
          d.y = Phaser.Math.Clamp(d.y, 0, height);
        });
      }
    });

    // Cargar configuración guardada
    const saved = sessionStorage.getItem("settings");
    this.settings = saved
      ? JSON.parse(saved)
      : { ship: "DEFAULT", ability: "SHIELD" };

    // --- BACKGROUNDS y capas (0 = fondo principal) ---
    this.createBackgrounds();
    this.nextSpecialAt = Phaser.Math.Between(6, 11);

    // Jugador
    this.player = new Player(this, cx, cy, this.settings.ship);
    this.player.setSize(this.player.width * 0.6, this.player.height * 0.6); // hitbox 60% del sprite
    this.player.setOffset(this.player.width * 0.2, this.player.height * 0.2); // centrar la hitbox
    this.player.shotColor = this.settings.shotColor ?? "";
    this.player.shipColor = this.settings.shipColor ?? "";
    this.playerOriginalScale = {
      x: this.player.scaleX || 1,
      y: this.player.scaleY || 1,
    };
    // PONER DEPTH del jugador entre debris y clouds
    this.player.setDepth(2);

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
      .image(10, this.scale.height - 80, this.player.texture.key)
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

    // Detectar si el jugador mantiene presionado el clic izquierdo
    this.input.on("pointerdown", (pointer) => {
      if (pointer.rightButtonDown()) {
        switch (this.settings.ability) {
          case "SHIELD":
            this.player.activateShield(this);
            break;
          case "QUANTUM-JUMP":
            this.player.activateQuantumJump(this);
            break;
          case "EMP":
            this.player.activateEMP(this);
            break;
          default:
            this.player.activateShield(this);
            break;
        }
      } else {
        this.isShooting = true;
      }
    });

    this.input.on("pointerup", (pointer) => {
      if (!pointer.rightButtonDown()) {
        this.isShooting = false;
      }
    });

    this.time.addEvent({
      delay: 2750,
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
          const explosion = this.add
            .circle(bullet.x, bullet.y, 15, 0xffaa00)
            .setDepth(200)
            .setAlpha(0.7);

          this.tweens.add({
            targets: explosion,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => explosion.destroy(),
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
    this.physics.add.overlap(
      this.bullets,
      this.enemyBullets,
      (playerBullet, enemyBullet) => {
        if (!enemyBullet.active || !playerBullet.active) return;

        // Solo afecta a torpedos (no a las balas normales)
        if (enemyBullet.damage >= 40) {
          // Efecto de explosión pequeña
          const explosion = this.add
            .circle(enemyBullet.x, enemyBullet.y, 15, 0xffaa00)
            .setDepth(200)
            .setAlpha(0.7);
          this.tweens.add({
            targets: explosion,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => explosion.destroy(),
          });

          // Destruir ambos proyectiles
          playerBullet.destroy();
          enemyBullet.destroy();
        }
      },
      null,
      this
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

    // Inicializar decoraciones (restos detrás y nubes delante)
    this.createDecorations();
    this.reset();

    // Generar agujero de gusano (después de 23 segundos) con posición aleatoria
    this.time.delayedCall(3000, () => {
      const x = Phaser.Math.Between(100, this.scale.width - 100);
      const y = Phaser.Math.Between(100, this.scale.height - 100);
      this.spawnWormhole(x, y);
    });
  }

  reset() {
    // Reiniciar conteos y flags
    this.enemyCount = 0;
    this.boss = null;
    this.bossSpawnedRecently = false;

    // Limpiar grupos de la anterior ejecución
    if (this.enemies) this.enemies.clear(true, true);
    if (this.bullets) this.bullets.clear(true, true);
    if (this.enemyBullets) this.enemyBullets.clear(true, true);

    // Limpiar timers si existían
    if (this.enemyTimer) this.enemyTimer.remove(false);
    this.enemyTimer = this.time.addEvent({
      delay: 2750,
      callback: () => this.spawnEnemy(),
      loop: true,
    });
  }

  spawnWormhole(x, y) {
    // evita duplicados
    if (this.wormholeActive) return;
    this.wormholeActive = true;

    // crea el núcleo (core)
    this.time.delayedCall(
      600,
      () => {
        const core = this.add
          .image(x, y, "wormholeCore")
          .setAlpha(0)
          .setScale(0.01)
          .setDepth(1);

        this.tweens.add({
          targets: core,
          scaleX: 300 / core.width,
          scaleY: 300 / core.height,
          alpha: 1,
          ease: "Sine.easeOut",
          duration: 1200,
        });

        // Rotación continua
        core._rotationSpeed = -0.02;
        core._onUpdate = () => {
          core.rotation += core._rotationSpeed;
        };
        this.events.on("update", core._onUpdate);

        // timer de comprobación
        const checkTimer = this.time.addEvent({
          delay: 50,
          loop: true,
          callback: () => {
            if (!this.player || !core.active) return;
            const dx = this.player.x - core.x;
            const dy = this.player.y - core.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              checkTimer.remove(false);
              this.absorbPlayer(core, checkTimer);
            }
          },
          callbackScope: this,
        });

        // fallback: si no atravesaron en 5s, desaparece
        const vanishTimer = this.time.delayedCall(
          5000,
          () => {
            if (!core.active) return;
            // quitar update rotation
            this.events.off("update", core._onUpdate);
            // destruir core con tween
            this.tweens.add({
              targets: core,
              scaleX: 0,
              scaleY: 0,
              alpha: 0,
              duration: 1000,
              ease: "Sine.easeIn",
              onComplete: () => {
                core.destroy();
                this.wormholeActive = false;
              },
            });
          },
          null,
          this
        );
      },
      null,
      this
    );

    // Forzar que el HUD esté visible aunque el jugador esté "absorbido"
    this.HPHUDText.setVisible(true);
    this.HPHUDIcon.setVisible(true);
    this.fuelHUDText.setVisible(true);
    this.fuelBar.setVisible(true);
    this.shieldHUDIcon.setVisible(true);
    this.shieldHUDText.setVisible(true);
  }

  absorbPlayer(core, checkTimer) {
    if (!this.player || !this.player.active) return;

    // asegurar que no se intente absorber dos veces
    if (this._absorbing) return;
    this._absorbing = true;

    // Detener enemigos existentes
    if (this.enemies) {
		this.enemies.clear(true, true);		
    }
    // Limpiar las balas enemigas
    if (this.enemyBullets) {
		this.enemyBullets.clear(true, true);
    }
	// Limpiar el boss
	if (this.boss && this.boss.active) {
		this.boss.destroy();
		this.boss = null;
		this.bossSpawnedRecently = false;
	}

	this.bullets.getChildren().forEach(b => {
		b.destroy(); 
	});
	this.bullets.clear(true);

    // Desactivar controles / física del jugador para que no pueda moverse
    if (this.player.body) {
      this.player.body.setVelocity(0, 0);
      this.player.body.enable = false;
	  this.player.controlsEnabled = false;
    }

    // Tween de parpadeo del core
    this.tweens.add({
      targets: core,
      alpha: { from: 1, to: 0.5 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    // Tween: atraer al jugador al centro y hacerlo pequeño / transparente
    this.tweens.add({
      targets: this.player,
      x: core.x,
      y: core.y,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 1000,
      ease: "Cubic.easeIn",
      onComplete: () => {
        // oculta el jugador realmente
        //this.player.setActive(false).setVisible(false);
        this.player.body.enable = false; // desactiva física
        this.player.controlsEnabled = false;

        // cancelar el timer de comprobación si todavía existe
        if (checkTimer && checkTimer.remove) checkTimer.remove(false);

        // iniciar la transición de fondo y reaparición
        this.transitionBackground(core);
      },
    });
    this.time.delayedCall(21000, () => {
      // 21s después de terminar transición
      const x = Phaser.Math.Between(100, this.scale.width - 100);
      const y = Phaser.Math.Between(100, this.scale.height - 100);
      this.spawnWormhole(x, y);
    });
  }

  transitionBackground(core) {
    // fade y crecimiento del corewormhole
    this.tweens.add({
      targets: core,
      alpha: { from: 1, to: 0 },
      scaleX: { from: 0, to: 1.2 },
      scaleY: { from: 1, to: 1.2 },
      duration: 540,
      ease: "Sine.easeIn",
    });
    // fade out del fondo actual
    const oldBg = this.bgLayers && this.bgLayers[0];
    this.tweens.add({
      targets: oldBg,
      alpha: 0,
      duration: 950,
      onComplete: () => {
        // destruir el core + fondo viejo si existen
        if (core && core.destroy) core.destroy();
        if (oldBg && oldBg.destroy) oldBg.destroy();

        // crear nuevo fondo
        this.createBackgrounds();

        // asegurar que el nuevo fondo empieza invisible
        if (this.bgLayers && this.bgLayers[0]) this.bgLayers[0].alpha = 0;

        // Fade in del nuevo fondo
        this.tweens.add({
          targets: this.bgLayers[0],
          alpha: 1,
          duration: 800,
          onComplete: () => {
            // Reposicionar/reiniciar jugador en el centro
            const cx = this.scale.width / 2;
            const cy = this.scale.height / 2;
            this.player.x = cx;
            this.player.y = cy;

            // Restaurar escala original
            const orig = this.playerOriginalScale || { x: 1, y: 1 };
            // aseguramos que el jugador esté invisible y con escala 0 antes del tween
            this.player
              .setScale(0)
              .setAlpha(1)
              .setActive(true)
              .setVisible(true);

            // Reactivar física antes de animar
            if (this.player.body) {
              this.player.body.enable = true;
			  this.player.controlsEnabled = true;
              this.player.body.setVelocity(0, 0);
            }
			// Limpia las balas existentes sin romper el grupo ni las colisiones
			this.bullets.getChildren().forEach(b => b.destroy());
			this.bullets.clear(true);
			// Restaurar el escudo si estaba activo
			if (this.player.shieldActive) {
				this.player.shieldSprite
					.setVisible(true)
					.setAlpha(0.4)
					.setPosition(this.player.x, this.player.y)
					.setDepth(6);
			}

            // Tween para "aparecer" con la escala original
            this.tweens.add({
              targets: this.player,
              scaleX: orig.x,
              scaleY: orig.y,
              ease: "Back.easeOut",
              duration: 600,
              onComplete: () => {
                this._absorbing = false;
                this.wormholeActive = false;
              },
            });
            // Después de absorber al jugador y crear el nuevo fondo
            this.HPHUDText.setVisible(true).setDepth(500);
            this.HPHUDIcon.setVisible(true).setDepth(500);
            this.fuelHUDText.setVisible(true).setDepth(500);
            this.fuelBar.setVisible(true).setDepth(500);
            this.shieldHUDIcon.setVisible(true).setDepth(500);
            this.shieldHUDText.setVisible(true).setDepth(500);
			this.hudText.setDepth(500);
			this.hud.setDepth(500);
			this.player.shieldSprite.setDepth(500);
          },
        });
      },
    });
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

  createBackgrounds() {
    if (!this.bgPool || this.bgPool.length === 0) {
      this.bgPool = Phaser.Utils.Array.Shuffle(["bg1", "bg2", "bg3", "bg4"]);
    }

    const chosenKey = this.bgPool.pop();
    this.lastBgKey = chosenKey;

    const width = 3440;
    const height = 1440;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const bg = this.add
      .tileSprite(cx, cy, width, height, chosenKey)
      .setScrollFactor(0)
      .setOrigin(0.5, 0.5)
      .setDepth(0);

    this.bgLayers = [bg];
  }

  createDecorations() {
    // Grupo para restos (detrás del jugador, depth 1)
    this.debrisGroup = this.add.group();
    // Grupo para nubes/efectos delante del jugador (depth 3)
    this.cloudsGroup = this.add.group();

    const screenW = this.scale.width;
    const screenH = this.scale.height;

    // Generar algunos restos (detrás) - depth 1
    const debrisKeys = ["debris1"];
    for (let i = 0; i < 3; i++) {
      const key = Phaser.Utils.Array.GetRandom(debrisKeys);
      const x = Phaser.Math.Between(0, screenW);
      const y = Phaser.Math.Between(0, screenH);
      const s = Phaser.Math.FloatBetween(0.2, 0.7);
      const sprite = this.add.image(x, y, key).setScale(s);
      sprite.setOrigin(0.5, 0.5);
      sprite.setDepth(1); // DETRÁS del jugador

      // metadata para parallax/movimiento
      sprite._parallaxSpeed = Phaser.Math.Between(
        this.parallaxConfig.debrisMinSpeed,
        this.parallaxConfig.debrisMaxSpeed
      );
      sprite._driftAngle = Phaser.Math.FloatBetween(-0.5, 0.5);

      // New: velocidad de rotación en radianes por ms (o por segundo si lo divides)
      sprite._rotationSpeed = Phaser.Math.FloatBetween(-0.001, 0.001); // valores pequeños, rota lentamente

      this.debrisGroup.add(sprite);
    }
  }

  update(time, delta) {
    // Actualizar restos (detrás) - se mueven lentamente y hacen wrap cuando salen
    if (this.debrisGroup) {
      const screenW = this.scale.width;
      const screenH = this.scale.height;
      this.debrisGroup.getChildren().forEach((d) => {
        d.x -= (d._parallaxSpeed * delta) / 1000; // velocidad px/s
        d.y += Math.sin((time / 1000) * d._driftAngle) * 0.3;
        // Wrap sencillo en X
        if (d.x < -50) d.x = screenW + 50;
        if (d.x > screenW + 50) d.x = -50;
        if (d.y < -50) d.y = screenH + 50;
        if (d.y > screenH + 50) d.y = -50;
      });
    }

    // Actualizar jugador
    this.player.update(this.cursors, this.input.mousePointer, time, this);
    if (this.isShooting) this.shoot(this.input.mousePointer);
	const stats = this.player.getStats();
    // --- HUD HP ---
    if (this.player) {
      const stats = this.player
        ? this.player.getStats()
        : {
            hp: 0,
            maxHp: 100,
            fuel: 0,
            specialSkillUses: 0,
            special: "SHIELD",
            speed: 0,
          };
      const hpPercent = Phaser.Math.Clamp(stats.hp / stats.maxHp, 0, 1);
      const r = 0xff;
      const g = Math.floor(0xff * hpPercent);
      const b = Math.floor(0xff * hpPercent);
      const tint = (r << 16) | (g << 8) | b;
      this.HPHUDIcon.setTint(tint);
    } else {
      // jugador ausente: mostrar HP como 0
      this.HPHUDIcon.setTint(0xff0000);
    }

    // --- HUD Fuel ---
    const fuelPercent = this.player ? this.player.getStats().fuel / 1000 : 0;
    this.fuelBar.width = 100 * fuelPercent;
    if (fuelPercent > 0.6) this.fuelBar.fillColor = 0x00ff00;
    else if (fuelPercent > 0.3) this.fuelBar.fillColor = 0xffff00;
    else this.fuelBar.fillColor = 0xff0000;

    // --- HUD Escudo / Habilidad ---
    this.shieldHUDText.setText(`${stats.specialSkillUses}`);
    if (stats.special === "SHIELD") {
      if (this.player.shieldActive)
        this.shieldHUDIcon.setTint(0x00ff00, 0.5); // activo
      else if (stats.specialSkillUses > 0)
        this.shieldHUDIcon.setTint(0x414141); // listo
      else this.shieldHUDIcon.setTint(0xff0000, 0.5); // agotado
    } else {
      this.shieldHUDIcon.setTexture(stats.special.toLowerCase());
      this.shieldHUDText.setText("");
    }

    // --- HUD Boss ---
    if (this.boss && this.boss.active) {
      this.HPBOSSHUDText.setVisible(true);
      this.HPBOSSHUDIcon.setVisible(true);
      const hpBossPercent = Phaser.Math.Clamp(this.boss.hp / 400, 0, 1);
      const rb = 0xff;
      const gb = Math.floor(0xff * hpBossPercent);
      const bb = Math.floor(0xff * hpBossPercent);
      const tintb = (rb << 16) | (gb << 8) | bb;
      this.HPBOSSHUDIcon.setTint(tintb);
      this.boss.update(time, this.player, this.enemyBullets);
    } else if (this.HPBOSSHUDText) {
      this.HPBOSSHUDText.setVisible(false);
      this.HPBOSSHUDIcon.setVisible(false);
    }

    // --- HUD visible con TAB ---
    this.hudVisible = this.cursors.TAB.isDown;
    this.hud.setVisible(this.hudVisible);
    this.hudText.setVisible(this.hudVisible);

    if (this.hudVisible && this.player) {
      const stats = {
        hp: this.player.active ? this.player.hp : 0,
        special: this.settings.ability,
      };

      this.hudText.setText(
        `STATS\n\n` +
          `Score: ${this.player.score}\n` +
          `HP: ${stats.hp}\n` +
          `Skill: ${
            stats.special === "SHIELD"
              ? this.player.shieldActive
                ? "Activo"
                : "Listo"
              : "Listo"
          }\n\n` +
          `Speed: ${this.player.speed}`
      );
    }

    // --- ESC Pausa ---
    if (Phaser.Input.Keyboard.JustDown(this.cursors.ESC)) {
      if (this.bgMusic && this.bgMusic.isPlaying) this.bgMusic.pause();
      this.scene.launch("PauseScene");
      this.scene.pause();
    }

    // --- Fondo parallax ---
    this.bgLayers.forEach((layer, i) => {
      layer.tilePositionX += this.player.body.velocity.x * 0.002 * (i + 1);
      layer.tilePositionY += this.player.body.velocity.y * 0.002 * (i + 1);
    });

    // --- Actualizar balas y enemigos ---
    this.bullets.children.each((b) => b.update(time));
    this.enemies.children.each((e) =>
      e.update(this.player, time, this.enemies)
    );
    this.enemyBullets.children.each((eb) => eb.update());

    // Actualizar rotaciones de debris
    if (this.debrisGroup) {
      this.debrisGroup.getChildren().forEach((sprite) => {
        if (sprite._rotationSpeed) {
          sprite.rotation += sprite._rotationSpeed * delta;
        }
      });
    }
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

    this.lastShot = time + 300;
  }

  collectItem(player, item) {
    if (!item.active) return;

    item.disableBody(true, true); // desaparecer el ítem

    // Determinar efecto según tipo
    const type = item.getData("type");

    let text = "";
    let color = "";
    let rngHP = Phaser.Math.Between(15, 55);
    let rngFuel = Phaser.Math.Between(100, 450);
    if (type === "health") {
      player.hp = Math.min(player.hp + rngHP, 100);
      text = "+ " + rngHP + " HP";
      color = "#00ff00"; // verde
    } else if (type === "fuel") {
      player.fuel = Math.min(player.fuel + rngFuel, 1000);
      text = "+ " + rngFuel + " Fuel";
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
	if (!this.player || !this.player.active) return;
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
    //if (this.boss && this.boss.active) return;
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

    // Cada 6-11 enemigos → uno especial
    if (this.enemyCount >= this.nextSpecialAt) {
      enemy.isSpecial = true;
      enemy.setTint(0x414141);

      // Calcular cuándo aparece el próximo especial
      this.nextSpecialAt = this.enemyCount + Phaser.Math.Between(6, 11);
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
