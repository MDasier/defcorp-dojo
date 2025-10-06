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
            
            let currentSpeed = this.speed;
            if (!this.active || !player.active) return;
        
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.hypot(dx, dy) || 1;
        
            // --- Parámetros ajustables ---
            const desiredDist = 250;
            const margin = 50;
            const orbitFactor = Phaser.Math.FloatBetween(0.3, 0.6);  // cada enemigo puede variar su órbita
            const avoidRadius = 100;
            const smoothFactor = 0.08;  // suavizado de movimiento
            const jitterStrength = 0.2;  
        
            // --- Decide sentido de órbita (1 = CW, -1 = CCW) ---
            if (!this.orbitDirection) this.orbitDirection = Phaser.Math.RND.pick([1, -1]);
        
            // --- Vector de movimiento base ---
            let steerX = 0, steerY = 0;
        
            // --- SEEK / FLEE ---
            if (dist > desiredDist + margin) {
                currentSpeed *= 1.6;
                steerX += dx / dist;  // acercarse
                steerY += dy / dist;
            } else if (dist < desiredDist - margin) {
                currentSpeed *= 1.3;
                steerX -= dx / dist;  // alejarse
                steerY -= dy / dist;
            } else {
                // distancia ideal → orbitar
                currentSpeed *= 1.1;
                steerX += (-dy / dist) * orbitFactor * this.orbitDirection;
                steerY += (dx / dist) * orbitFactor * this.orbitDirection;
            }
        
            // --- Evitar otros enemigos ---
            enemiesGroup.children.each(e => {
                if (e === this || !e.active) return;
                const ex = this.x - e.x;
                const ey = this.y - e.y;
                const d = Math.hypot(ex, ey);
                if (d < avoidRadius && d > 0) {
                    steerX += ex / d * (1 - d / avoidRadius);
                    steerY += ey / d * (1 - d / avoidRadius);
                }
            });
        
            // --- Jitter aleatorio para romper patrones ---
            if (!this.nextJitterTime || time > this.nextJitterTime) {
                this.jitterX = Phaser.Math.FloatBetween(-jitterStrength, jitterStrength);
                this.jitterY = Phaser.Math.FloatBetween(-jitterStrength, jitterStrength);
                this.nextJitterTime = time + Phaser.Math.Between(400, 900);
            }
            steerX += this.jitterX;
            steerY += this.jitterY;
        
            // --- Normalizar vector ---
            const steerLen = Math.hypot(steerX, steerY);
            if (steerLen > 0) {
                steerX /= steerLen;
                steerY /= steerLen;
            }
        
            // --- Aplicar velocidad suavizada ---
            const targetVx = steerX * currentSpeed;
            const targetVy = steerY * currentSpeed;
            this.setVelocity(
                Phaser.Math.Linear(this.body.velocity.x, targetVx, smoothFactor),
                Phaser.Math.Linear(this.body.velocity.y, targetVy, smoothFactor)
            );
        
            // --- Rotar hacia dirección de movimiento ---
            this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
        
            // --- Disparo siempre activo si jugador en rango ---
            if (dist < 500 && time > this.lastShot) {
                this.shoot();
                this.lastShot = time + this.fireRate;
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
            // Decidir aleatoriamente qué soltar
            if (this.isSpecial) {
                const rand = Phaser.Math.Between(0, 1); // 0 = HP, 1 = Fuel
                if (rand === 0) {
                    this.dropHealthItem();
                } else {
                    this.dropFuelItem();
                }
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

    dropFuelItem() {
        const item = this.scene.fuelItems.create(this.x, this.y, 'shield');
        item.setScale(0.1);
        item.setTint(0xffa500); // naranja = fuel
        item.setData('type', 'fuel');
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
