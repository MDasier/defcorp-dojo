import Player from '../classes/Player.js';
import Enemy from '../classes/Enemy.js';
import Bullet from '../classes/Bullet.js';
import EnemyBullet from '../classes/EnemyBullet.js';


export default class GameScene extends Phaser.Scene {
constructor() { super('GameScene');this.enemyCount = 0; }

preload() {
	this.load.image('ship', 'assets/ship.webp');
	this.load.image('enemy1', 'assets/enemy.webp');
	this.load.image('enemy2', 'assets/enemy_1.webp');
	this.load.image('bullet', 'assets/bullet.png');
	this.load.image('shield', 'assets/shield.png');
	this.load.image('bg1', 'assets/background1.png');
	this.load.image('bg2', 'assets/background2.png');
	this.load.image('bg3', 'assets/background.jpg');
	// --- Audio ---
    this.load.audio('bgMusic', 'assets/audio/music.mp3');
    this.load.audio('shieldSound', 'assets/audio/shield.mp3');
}

create() {

	// Desactivar clic derecho en el juego
	this.input.mouse.disableContextMenu();
	const cx = this.scale.width / 2, cy = this.scale.height / 2;

	// Fondo
	this.bgLayers = [
		this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, 'bg1'),
		this.add.tileSprite(cx, cy, this.scale.width, this.scale.height, 'bg2'),
		this.add.tileSprite(cx, cy, this.scale.width * 2.8, this.scale.height * 2.8, 'bg3')
	];

	// Jugador
	this.player = new Player(this, cx, cy);

	// Lista de balas
	this.bullets = this.physics.add.group({
		classType: Bullet,
		maxSize: 30,
		runChildUpdate: true    
	});

	// Lista de enemigos
	this.enemies = this.physics.add.group();

	// Lista de balas enemigos
	this.enemyBullets = this.physics.add.group({
		classType: EnemyBullet,
		maxSize: 20,
		runChildUpdate: true
	});	

	// Lista de objetos de vida
	this.healthItems = this.physics.add.group();


	// Teclas disponibles
	this.cursors = this.input.keyboard.addKeys('W,A,S,D,TAB,ESC');
	this.lastShot = 0;

	// HUD Escudo
	this.shieldHUDIcon = this.add.image(10, 10, 'shield').setScale(0.1).setScrollFactor(0).setOrigin(0);
	this.shieldHUDText = this.add.text(50, 10, '', { fontSize: '16px', fill: '#00ccff' }).setScrollFactor(0);

	// HUD HP
	this.HPHUDText = this.add.text(10, this.scale.height - 100, 'HP', { fontSize: '20px', fill: '#00ccff' }).setScrollFactor(0);
	this.HPHUDIcon = this.add.image(10, this.scale.height - 80, 'ship').setScale(0.1).setScrollFactor(0).setOrigin(0);

	// HUD Fuel
	this.fuelHUDText = this.add.text(10, this.scale.height - 36, 'Fuel', { fontSize: '20px', fill: '#00ccff' }).setScrollFactor(0);
	this.fuelBarBg = this.add.rectangle(10, this.scale.height - 16, 104, 16, 0x333333).setOrigin(0, 0);
	this.fuelBar = this.add.rectangle(10, this.scale.height - 16, 100, 12, 0x00ff00).setOrigin(0, 0);
	this.fuelBar.setScrollFactor(0); 

	// HUD modal oculto
	this.hudVisible = false;
	this.hud = this.add.rectangle(cx, cy, 400, 300, 0x000000, 0.6).setVisible(false);
	this.hudText = this.add.text(cx - 180, cy - 120, '', { color: '#fff', fontSize: '16px' }).setVisible(false);

	// ESC menú pausa
	this.cursors.ESC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

	// Eventos
	this.input.on('pointerdown', (pointer) => {
		if (pointer.rightButtonDown()) this.player.activateShield(this);
		else this.shoot(pointer);
	});

	this.time.addEvent({ delay: 1500, callback: () => this.spawnEnemy(), loop: true });

	// Colisiones de Disparos del jugador contra enemigos
	this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
	this.physics.add.overlap(this.enemies, this.player, this.hitPlayer, null, this);
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
	this.physics.add.overlap(this.enemyBullets, this.enemies, (bullet, enemy) => {
		if (bullet.shooter === enemy) return;
		bullet.destroy();
		enemy.hit(1);
	});

	// Colisiones de balas enemigas con jugador
	this.physics.add.overlap(this.enemyBullets, this.player, (player, bullet) => {
		if (!bullet.active || !player.active) return;
	
		bullet.disableBody(true, true); // 💡 desactivar sin destruir directamente
		player.takeDamage(1);
	
		// Destruir más tarde si no reutilizas las balas
		this.time.delayedCall(100, () => {
			if (bullet) bullet.destroy();
		});
	});	

	// Colisiones de objetos de vida con jugador
	this.physics.add.overlap(this.player, this.healthItems, this.collectHealth, null, this);

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

	// Alerta HP al límite
	//TODO


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
			`SHIELD: ${this.player.shieldActive ? 'Activo' : 'Listo'}`
		);
	}

	// ESC menú pausa
	if (Phaser.Input.Keyboard.JustDown(this.cursors.ESC)) {
		if (this.bgMusic && this.bgMusic.isPlaying) {
			this.bgMusic.pause(); // pausa la música al entrar en pausa
		}
		this.scene.launch('PauseScene');
		this.scene.pause();               
	}

	// Fondo parallax
	this.bgLayers.forEach((layer, i) => {
	layer.tilePositionX += this.player.body.velocity.x * 0.002 * (i + 1);
	layer.tilePositionY += this.player.body.velocity.y * 0.002 * (i + 1);
	});

	// Balas y enemigos
	this.bullets.children.each(b => b.update(time));
	this.enemies.children.each(e => e.update(this.player,time, this.enemies));
	this.enemyBullets.children.each(eb => eb.update());	
}

shoot(pointer) {
    const time = this.time.now;
    if (time < this.lastShot) return;

    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
    const bullet = this.bullets.get();

    if (bullet) bullet.fire(this.player.x, this.player.y, angle);

    this.lastShot = time + 200;
}

collectHealth(player, item) {
    if (!item.active) return;

    item.disableBody(true, true); // desaparecer el ítem
    player.hp = Math.min(player.hp + 10, 100);

    // Efecto visual opcional
    const healText = this.add.text(player.x, player.y - 20, '+10 HP', {
        fontSize: '16px',
        fill: '#00ff00',
        stroke: '#000',
        strokeThickness: 2
    }).setOrigin(0.5);

    this.tweens.add({
        targets: healText,
        y: healText.y - 30,
        alpha: 0,
        duration: 800,
        onComplete: () => healText.destroy()
    });
}


spawnEnemy() {
    const side = Phaser.Math.Between(0, 3);
    let x, y;
    switch (side) {
        case 0: x = -50; y = Phaser.Math.Between(0, 600); break;
        case 1: x = 850; y = Phaser.Math.Between(0, 600); break;
        case 2: x = Phaser.Math.Between(0, 800); y = -50; break;
        case 3: x = Phaser.Math.Between(0, 800); y = 650; break;
    }

    const type = Phaser.Math.Between(1, 3);
    const enemy = new Enemy(this, x, y, type);

    this.enemyCount++;

    // Cada 10 enemigos → uno especial
    if (this.enemyCount % 10 === 0) {
        enemy.isSpecial = true;
        enemy.setTint(0x414141); // verde brillante para distinguirlo
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
        // Hacer que el enemigo huya del jugador
        this.enemyFlee(enemy, player);
        return;
    }

    enemy.destroy();
    player.takeDamage(10);
}

// Función auxiliar para que el enemigo huya del jugador
enemyFlee(enemy, player) {
    const fleeDistance = 300; // más distancia para “salir volando”
    
    // Calcular ángulo desde el jugador hacia el enemigo (huyendo)
    const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);

    // Coordenadas destino
    const targetX = enemy.x + Math.cos(angle) * fleeDistance;
    const targetY = enemy.y + Math.sin(angle) * fleeDistance;

    // Rotación hacia la dirección de huida
    const targetRotation = angle + Math.PI/2;

    // Tween para mover y rotar al enemigo
    this.tweens.add({
        targets: enemy,
        x: targetX,
        y: targetY,
        rotation: targetRotation,
        duration: 1500,
        ease: 'Power2',
        onComplete: () => {
            // Opcional: reiniciar dirección normal del enemigo o comportamiento
        }
    });
}


}
