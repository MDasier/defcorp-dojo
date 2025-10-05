export default class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y, type = 1) {
        const textures = type === 1 ? ['enemy1', 'enemy2'] : ['enemy1'];
        const texture = Phaser.Utils.Array.GetRandom(textures);
        super(scene, x, y, texture);

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.scene = scene;
        this.type = type;

        // Configuración según tipo
        switch (type) {
            case 1: this.hp = 1; this.speed = 100; this.setScale(0.1); break;
            case 2: this.hp = 3; this.speed = 80; this.setScale(0.1); break;
            case 3: this.hp = 5; this.speed = 60; this.setScale(0.2); break;
        }

        this.lastShot = 0;
        this.fireRate = 1000; // ms entre disparos
    }

    update(player, time, enemiesGroup) {
        if (!this.active || !player.active) return;
    
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy) || 1;
    
        // --- Parámetros ajustables ---
        const minDist = 120;        // Si está más cerca, se aleja
        const desiredDist = 250;    // Distancia ideal para orbitar/disparar
        const maxDist = 600;        // Si está muy lejos, se acerca
        const orbitFactor = 0.5;    // Cuánto orbita alrededor del jugador
        const avoidRadius = 100;    // Evitar colisiones entre enemigos
        const smoothFactor = 0.1;   // Suavizado del cambio de dirección
    
        // --- Vectores base ---
        let steerX = 0, steerY = 0;
    
        // --- 1️⃣ SEEK o FLEE ---
        if (dist > desiredDist + 50) {
            // demasiado lejos → acercarse
            steerX += dx / dist;
            steerY += dy / dist;
        } else if (dist < desiredDist - 50) {
            // demasiado cerca → alejarse
            steerX -= dx / dist;
            steerY -= dy / dist;
        } else {
            // rango ideal → orbitar suavemente
            steerX += (-dy / dist) * orbitFactor;
            steerY += (dx / dist) * orbitFactor;
        }
    
        // --- 2️⃣ AVOID otros enemigos ---
        enemiesGroup.children.each(e => {
            if (e === this || !e.active) return;
            const ex = this.x - e.x;
            const ey = this.y - e.y;
            const d = Math.hypot(ex, ey);
            if (d < avoidRadius && d > 0) {
                steerX += ex / d * (1 - d / avoidRadius); // más fuerza cuanto más cerca
                steerY += ey / d * (1 - d / avoidRadius);
            }
        });
    
        // --- 3️⃣ PEQUEÑO RUIDO ORGÁNICO ---
        if (!this.nextJitterTime || time > this.nextJitterTime) {
            this.jitterX = Phaser.Math.FloatBetween(-0.2, 0.2);
            this.jitterY = Phaser.Math.FloatBetween(-0.2, 0.2);
            this.nextJitterTime = time + Phaser.Math.Between(500, 1000);
        }
        steerX += this.jitterX;
        steerY += this.jitterY;
    
        // --- Normalizar vector final ---
        const steerLen = Math.hypot(steerX, steerY);
        if (steerLen > 0) {
            steerX /= steerLen;
            steerY /= steerLen;
        }
    
        // --- Aplicar velocidad con suavizado ---
        const targetVx = steerX * this.speed;
        const targetVy = steerY * this.speed;
    
        const vx = Phaser.Math.Linear(this.body.velocity.x, targetVx, smoothFactor);
        const vy = Phaser.Math.Linear(this.body.velocity.y, targetVy, smoothFactor);
    
        this.setVelocity(vx, vy);
    
        // --- Rotar hacia dirección de movimiento ---
        const angle = Math.atan2(vy, vx);
        this.setRotation(angle);
    
        // --- 4️⃣ Disparo ---
        if (dist < 500 && time > this.lastShot) {
            const angleToPlayer = Phaser.Math.RadToDeg(Math.atan2(dy, dx));
            const enemyRotationDeg = Phaser.Math.RadToDeg(this.rotation);
            if (Math.abs(Phaser.Math.Angle.WrapDegrees(angleToPlayer - enemyRotationDeg)) < 20) {
                this.shoot();
                this.lastShot = time + this.fireRate;
            }
        }
    }
    

    shoot() {
        const bullet = this.scene.enemyBullets.get();
        if (!bullet) return;
        bullet.shooter = this;
        bullet.fire(this.x, this.y, this.rotation, this);
    }
    

    hit(damage = 1) {
        this.hp -= damage;
        this.setTint(0xff0000);
        setTimeout(() => this.clearTint(), 100);
    
        if (this.hp <= 0) {
            if (this.isSpecial) {
                this.dropHealthItem();
            }
            this.destroy();
        }
    }
    

    dropHealthItem() {
        const item = this.scene.healthItems.create(this.x, this.y, 'shield');
        item.setScale(0.1);
        item.setTint(0x00ff00); // verde = salud
        item.setData('type', 'health');
        item.body.setAllowGravity(false);
    
        // Añadimos una pequeña animación de aparición
        this.scene.tweens.add({
            targets: item,
            scale: { from: 0.1, to: 0.15 },
            duration: 300,
            yoyo: true
        });
    }
    
}
