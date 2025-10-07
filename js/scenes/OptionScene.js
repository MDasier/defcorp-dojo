export default class OptionsScene extends Phaser.Scene {
	constructor() {
	  super("OptionsScene");
	}
	preload() {
		this.load.image("LIGHT", "assets/ship.webp");
		this.load.image("MEDIUM", "assets/enemy.webp");
		this.load.image("DEFAULT", "assets/enemy_1.webp");
	}
	create(data) {
	  this.cameras.main.setBackgroundColor(0x1a1a1a); // color gris oscuro
	  const { width, height } = this.scale;

	  // 🔹 Cargar configuración guardada desde sessionStorage
	  const saved = sessionStorage.getItem("settings");
	  const savedSettings = saved ? JSON.parse(saved) : {};

	  this.settings = {
		volume: data?.volume ?? savedSettings.volume ?? 0.5,
		difficulty: data?.difficulty ?? savedSettings.difficulty ?? "ERODD",
		ship: data?.ship ?? savedSettings.ship ?? "DEFAULT",
		ability: data?.ability ?? savedSettings.ability ?? "QUANTUM-JUMP",
		shipColor: savedSettings.shipColor ?? 0xffffff,
		shotColor: savedSettings.shotColor ?? 0xffffff
	  };

	  this.add.text(width / 2, 80, "⚙️ OPCIONES DE JUEGO", {
		fontSize: "32px",
		color: "#00ccff",
		fontStyle: "bold",
	  }).setOrigin(0.5);

	  // ---- VOLUMEN ----
	  this.add.text(width / 2 - 150, 150, "Volumen:", { fontSize: "20px", color: "#fff" });
	  this.volumeText = this.add.text(width / 2 + 85, 145, `${Math.round(this.settings.volume * 100)}%`, { fontSize: "20px", color: "#fff" });
	  this.createArrowButtons(width / 2 + 50, 150, () => this.adjustVolume(-0.1), () => this.adjustVolume(0.1));

	  // ---- DIFICULTAD ----
	  this.add.text(width / 2 - 150, 210, "Dificultad:", { fontSize: "20px", color: "#fff" });
	  this.difficulties = ["ERODD"];
	  this.difficultyIndex = this.difficulties.indexOf(this.settings.difficulty);
	  this.difficultyButton = this.createButton(width / 2 + 100, 210, 150, 40, this.settings.difficulty, () => this.nextDifficulty());

	  // ---- NAVE ----
	  this.add.text(width / 2 - 150, 270, "Nave:", { fontSize: "20px", color: "#fff" });
	  this.ships = ["LIGHT", "MEDIUM", "DEFAULT"];
	  this.shipIndex = this.ships.indexOf(this.settings.ship);
	  this.shipButton = this.createButton(width / 2 + 100, 270, 150, 40, this.settings.ship, () => this.nextShip());

	  // ---- Previsualización de la nave ----
		this.shipPreview = this.add.sprite(
			width / 2 + 100, 440,
			this.getShipSprite(this.ships[this.shipIndex])
		).setScale(this.getShipScale(this.ships[this.shipIndex]))
		.setTint(this.settings.shipColor);

	  // ---- HABILIDAD ----
	  this.add.text(width / 2 - 150, 330, "Habilidad:", { fontSize: "20px", color: "#fff" });
	  this.abilities = ["SHIELD", "QUANTUM-JUMP", "EMP"];
	  this.abilityIndex = this.abilities.indexOf(this.settings.ability);
	  this.abilityButton = this.createButton(width / 2 + 100, 330, 150, 40, this.settings.ability, () => this.nextAbility());

	  // ---- COLOR DE DISPARO ----
	  this.add.text(width / 2 - 150, 390, "Color Disparo:", { fontSize: "20px", color: "#fff" });
	  this.shotColors = [0xffffff, 0x00ffff, 0xff00ff, 0xff0000]; // blanco, cyan, morado eléctrico, rojo láser
	  this.shotColorIndex = this.shotColors.indexOf(this.settings.shotColor);

	  this.shotColorPreview = this.add.rectangle(width / 2 + 100, 390, 50, 30, this.shotColors[this.shotColorIndex])
		.setOrigin(0.5)
		.setStrokeStyle(2, 0xffffff);

	  this.createArrowButtons(width / 2 + 50, 390, () => this.prevShotColor(), () => this.nextShotColor());

	  // ---- COLOR DE LA NAVE ----
	  this.add.text(width / 2 - 150, 430, "Color Nave:", { fontSize: "20px", color: "#fff" });
	  this.shipColors = [
		0xffffff, // blanco
		0x000000, // negro
		0xe00000, // rojo
		0x0000ff, // azul
		0xffff00, // amarillo
		0x556b2f  // verde militar (dark olive green)
	  ];
	  this.shipColorIndex = this.shipColors.indexOf(this.settings.shipColor);

	  this.createArrowButtons(width / 2 + 50, 430, () => this.prevShipColor(), () => this.nextShipColor());

	  // ---- VOLVER ----
	  this.createButton(width / 2, 510, 200, 50, "VOLVER", () => {
		this.saveSettings();
		const returnScene = this.scene.settings.returnScene || "MenuScene";
		this.scene.start(returnScene, this.settings);
	  });
	}

	// --- Funciones de previsualización ---
	getPreviewSquareColor(shipColor) {
		if (shipColor === 0xffffff) return 0x000000; // blanco → cuadrado negro
		if (shipColor === 0x000000) return 0xffffff; // negro → cuadrado blanco
		if ([0xe00000, 0x0000ff, 0xffff00, 0x556b2f].includes(shipColor)) return 0x00000000; // transparente
		return 0xffffff;
	}

	getPreviewTint(color) {
		if (color === 0x000000) return 0xffffff;
		if (color === 0xffffff) return 0x000000;
		return color;
	}
	
	getShipSprite(shipKey) {
	  switch(shipKey) {
		case 'LIGHT': return 'LIGHT';
		case 'MEDIUM': return 'MEDIUM';
		default: return 'DEFAULT';
	  }
	}

	getShipScale(shipKey) {
	  switch(shipKey) {
		case 'LIGHT': return 0.10;
		case 'MEDIUM': return 0.15;
		default: return 0.15;
	  }
	}	
	// ---- Flechas de navegación ----
	createArrowButtons(x, y, leftCallback, rightCallback) {
	  this.createButton(x, y, 30, 30, "<", leftCallback);
	  this.createButton(x + 100, y, 30, 30, ">", rightCallback);
	}

	prevShotColor() {
	  this.shotColorIndex = (this.shotColorIndex - 1 + this.shotColors.length) % this.shotColors.length;
	  this.settings.shotColor = this.shotColors[this.shotColorIndex];
	  this.shotColorPreview.setFillStyle(this.settings.shotColor);
	  this.saveSettings();
	}

	nextShotColor() {
	  this.shotColorIndex = (this.shotColorIndex + 1) % this.shotColors.length;
	  this.settings.shotColor = this.shotColors[this.shotColorIndex];
	  this.shotColorPreview.setFillStyle(this.settings.shotColor);
	  this.saveSettings();
	}

	prevShipColor() {
		this.shipColorIndex = (this.shipColorIndex - 1 + this.shipColors.length) % this.shipColors.length;
		this.settings.shipColor = this.shipColors[this.shipColorIndex];
	
		// Actualizar solo el tint de la nave
		this.shipPreview.setTint(this.settings.shipColor);
	
		this.saveSettings();
	}
	
	nextShipColor() {
		this.shipColorIndex = (this.shipColorIndex + 1) % this.shipColors.length;
		this.settings.shipColor = this.shipColors[this.shipColorIndex];
	
		// Actualizar solo el tint de la nave
		this.shipPreview.setTint(this.settings.shipColor);
	
		this.saveSettings();
	}
	
	

	nextShip() {
	  this.shipIndex = (this.shipIndex + 1) % this.ships.length;
	  this.shipButton.setText(this.ships[this.shipIndex]);
	  // Actualizar sprite de previsualización
	  this.shipPreview.setTexture(this.getShipSprite(this.ships[this.shipIndex]));
	  this.shipPreview.setScale(this.getShipScale(this.ships[this.shipIndex]));
	  this.shipPreview.setTint(this.getPreviewTint(this.settings.shipColor));
	  this.settings.ship = this.ships[this.shipIndex];
	  this.saveSettings();
	}

	createButton(x, y, w, h, label, callback) {
	  const rect = this.add.rectangle(x, y, w, h, 0x007bff)
		.setInteractive({ useHandCursor: true })
		.on("pointerdown", callback)
		.on("pointerover", () => rect.setFillStyle(0x3399ff))
		.on("pointerout", () => rect.setFillStyle(0x007bff));

	  const text = this.add.text(x, y, label, { fontSize: "18px", color: "#fff" }).setOrigin(0.5);
	  return { rect, text, setText: (newLabel) => text.setText(newLabel) };
	}

	adjustVolume(delta) {
	  this.settings.volume = Phaser.Math.Clamp(this.settings.volume + delta, 0, 1);
	  this.volumeText.setText(`${Math.round(this.settings.volume * 100)}%`);
	  const musicScene = this.scene.get("MusicScene");
	  if (musicScene) musicScene.setVolume(this.settings.volume);
	  this.saveSettings();
	}

	nextDifficulty() {
	  this.difficultyIndex = (this.difficultyIndex + 1) % this.difficulties.length;
	  this.settings.difficulty = this.difficulties[this.difficultyIndex];
	  this.difficultyButton.setText(this.settings.difficulty);
	  this.saveSettings();
	}

	nextAbility() {
	  this.abilityIndex = (this.abilityIndex + 1) % this.abilities.length;
	  this.settings.ability = this.abilities[this.abilityIndex];
	  this.abilityButton.setText(this.settings.ability);
	  this.saveSettings();
	}

	saveSettings() {
	  sessionStorage.setItem("settings", JSON.stringify(this.settings));
	}
}
