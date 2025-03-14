// Global Variables & Parameters
let cam;
let cameraShake = 0.0001;
let toggleShake = false;

let jellyfishSwarm = [];
// Scaling factor: 1 meter = 30 pixels
let scaleFactor = 30;

// Realistic Parameters
let waterDepth = 30 * scaleFactor;          // 30 meters water depth
let monopileRadius = (9 * scaleFactor) / 2; // Monopile radius (9m diameter)
let jellyfishDiameter = 0.36 * scaleFactor; // Jellyfish diameter = 0.36 m
let turbineHeight = waterDepth * 4;         // Turbine extends high above water

// World Bounds (swimming area)
let worldTop = -waterDepth / 2;   // Ocean surface (jellies can’t go higher)
let worldBottom = waterDepth / 2; // Seafloor (jellies can’t go lower)

// Jellyfish communication range
let connectionRange = 6 * scaleFactor; // 6 meters (scaled)

// Theme Settings
let oceanColor, backgroundColor, seabedColor, scourColor, turbineColor;
let jellyfishColor, connectionColor;
let oceanSurfaceThickness = 5;   // Ocean surface thickness
let seabedThickness = 100;       // Sand thickness
let jellyfishTransparency = 200; // Jellyfish transparency

// GUI Sliders (using p5.dom)
let numJellyfishSlider, connectionRangeSlider, maxSpeedSlider, maxConnectionsSlider;
let turbineAttractionSlider, spreadingForceSlider, attractionStrengthSlider, repulsionStrengthSlider;
let numJellyfish;
let maxSpeed = 1.5;
let turbineAttraction = 0.02;
let spreadingForce = 0.01;
let attractionStrength = 0.005;
let repulsionStrength = 0.02;

// Turbine position
let turbinePos;

// Simple stats HUD
let statsDiv;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  frameRate(30);
  
  // Create custom camera
  cam = createCamera();
  
  // Set up theme colors
  oceanColor = color(0, 100, 255, 100);
  backgroundColor = color(0, 14, 36);
  seabedColor = color(85, 70, 65);
  scourColor = color(100, 100, 100);
  turbineColor = color(150);
  jellyfishColor = color(255, 255, 255, jellyfishTransparency);
  connectionColor = color(0, 255, 255, 50);
  
  // Turbine position
  turbinePos = createVector(0, worldTop, 0);
  
  // 1) Add inline CSS for minimalist sliders
  const style = createElement('style', `
    /* Minimalist slider style with a filled track and a white line thumb */
    input[type=range] {
      -webkit-appearance: none;
      width: 200px;
      height: 6px;
      border-radius: 3px;
      outline: none;
      margin: 5px 0;
      /* Fallback background; overridden dynamically via inline style */
      background: #e0e0e0;
    }
    input[type=range]:focus {
      outline: none;
    }
    /* Make the track transparent so our inline linear-gradient is visible */
    input[type=range]::-webkit-slider-runnable-track {
      background: transparent !important;
      height: 6px;
      border-radius: 3px;
    }
    input[type=range]::-moz-range-track {
      background: transparent !important;
      height: 6px;
      border-radius: 3px;
    }
    input[type=range]::-moz-range-progress {
      background: transparent !important;
    }
    /* The "thumb" as a thin white line */
    input[type=range]::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 2px;
      height: 20px;
      background: #fff;
      margin-top: -7px; /* center the line on the track */
      border-radius: 0;
      border: none;
      cursor: pointer;
    }
    input[type=range]::-moz-range-thumb {
      width: 2px;
      height: 20px;
      background: #fff;
      border: none;
      border-radius: 0;
      cursor: pointer;
    }
    /* Minimal text labels */
    p {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-size: 14px;
      margin: 2px 0;
      color: #aaa;
    }
  `);
  style.parent(document.head);
  
  // Position the sliders around the middle of the screen
  let sliderStartY = height / 2 - 150; // adjust as needed
  let y = sliderStartY;
  
  // 2) Create sliders with a helper function that updates the fill & shows value
  numJellyfishSlider = createFilledSlider(10, 200, 60, 1, 20, y, "Jellyfish Count");
  connectionRangeSlider = createFilledSlider(50, 500, connectionRange, 10, 20, y += 60, "Connection Range (m)");
  maxSpeedSlider = createFilledSlider(0.01, 5, maxSpeed, 0.01, 20, y += 60, "Max Speed (m/s)");
  maxConnectionsSlider = createFilledSlider(1, 10, 4, 1, 20, y += 60, "Max Connections");
  turbineAttractionSlider = createFilledSlider(0.01, 10, 5, 0.01, 20, y += 60, "Turbine Attraction");
  spreadingForceSlider = createFilledSlider(0.01, 10, 5, 0.01, 20, y += 60, "Spreading");
  attractionStrengthSlider = createFilledSlider(0.01, 10, 5, 0.01, 20, y += 60, "Attraction Strength");
  repulsionStrengthSlider = createFilledSlider(0.01, 10, 5, 0.01, 20, y += 60, "Repulsion Strength");
  
  // Re-spawn jellyfish if user changes the count
  numJellyfishSlider.changed(setupJellyfish);
  
  // Initialize the jellyfish swarm
  setupJellyfish();
  
  // Create a simple stats HUD
  statsDiv = createDiv('');
  statsDiv.position(20, height - 50);
  statsDiv.style('color', 'white');
  statsDiv.style('font-family', '"Helvetica Neue", Helvetica, Arial, sans-serif');
}

/**
 * Helper function: creates a slider, label, and sets up the dynamic "filled track"
 * plus a small numeric value that moves with the thumb.
 */
function createFilledSlider(min, max, value, step, x, y, labelText) {
  // Create a container for the slider and the moving value
  let container = createDiv('');
  container.style('position', 'absolute');
  container.position(x, y);
  
  // Create the slider itself
  let slider = createSlider(min, max, value, step);
  slider.parent(container);
  
  // Create label (static text)
  let label = createP(labelText);
  label.position(x + 220, y - 10); // adjust to your preference
  
  // Create a span that shows the numeric value inside the slider
  let valueSpan = createSpan('');
  valueSpan.parent(container);
  valueSpan.style('position', 'absolute');
  valueSpan.style('top', '-24px');
  valueSpan.style('left', '0px');
  valueSpan.style('color', '#fff');
  valueSpan.style('font-size', '12px');
  valueSpan.style('pointer-events', 'none'); // let user click on slider under the text
  
  // Function to update the fill portion and the value label position
  function updateFill() {
    let val = slider.value();
    let pct = ((val - min) / (max - min)) * 100;
    
    // Fill from left up to 'pct', then gray for the remainder
    slider.style('background',
      `linear-gradient(to right, #3a9ffd 0%, #3a9ffd ${pct}%, #e0e0e0 ${pct}%, #e0e0e0 100%)`
    );
    
    // Move the valueSpan to match the thumb position
    let sliderWidth = 200; // slider width
    let offsetX = (pct / 100) * sliderWidth;
    // Nudging so the text is centered above the line
    valueSpan.style('left', (offsetX - 10) + 'px');
    
    // Show numeric value (with 2 decimals for floats)
    valueSpan.html(nfc(val, 2));
  }
  
  // Update fill whenever the slider changes
  slider.input(updateFill);
  // Initialize fill
  updateFill();
  
  return slider;
}

function draw() {
  // Update global parameters from sliders
  numJellyfish = numJellyfishSlider.value();
  connectionRange = connectionRangeSlider.value();
  maxSpeed = maxSpeedSlider.value();
  turbineAttraction = turbineAttractionSlider.value();
  spreadingForce = spreadingForceSlider.value();
  attractionStrength = attractionStrengthSlider.value();
  repulsionStrength = repulsionStrengthSlider.value();
  
  background(backgroundColor);
  
  // --- Camera Shake ---
  if (toggleShake) {
    cam.lookAt(0, 0, cameraShake);
  } else {
    cam.lookAt(0, 0, -cameraShake);
  }
  toggleShake = !toggleShake;
  setCamera(cam);
  
  // Enable orbit control for navigation
  orbitControl();
  
  // Draw static scene elements
  drawFloor();
  drawScourProtection();
  drawTurbine();
  
  
  // Update and display each jellyfish
  for (let jelly of jellyfishSwarm) {
    jelly.move(jellyfishSwarm);
    jelly.display();
  }
  
  // Setup improved lighting and draw ocean surface + connections
  setupLighting();
  drawOceanSurface();
  drawJellyfishConnections();
  
  // Update stats HUD
  updateStatsHUD();
}

// Reinitialize swarm when 'R' is pressed
function keyPressed() {
  if (key === 'r' || key === 'R') {
    setupJellyfish();
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// --- Scene Drawing Functions ---

function setupLighting() {
  ambientLight(100, 100, 100);
}

function drawFloor() {
  push();
  translate(0, worldBottom, 0);
  fill(seabedColor);
  noStroke();
  cylinder(width / 1.5, seabedThickness);
  pop();
}

function drawOceanSurface() {
  push();
  translate(0, worldTop, 0);
  fill(oceanColor);
  noStroke();
  cylinder(width / 1.5, oceanSurfaceThickness);
  pop();
}

function drawTurbine() {
  push();
  translate(turbinePos.x, turbinePos.y, turbinePos.z);
  fill(turbineColor);
  noStroke();
  cylinder(monopileRadius, turbineHeight);
  pop();
}

function drawScourProtection() {
  push();
  translate(turbinePos.x, worldBottom, turbinePos.z);
  fill(scourColor);
  noStroke();
  cylinder(300, 130);
  pop();
}

function drawJellyfishConnections() {
  stroke(connectionColor);
  strokeWeight(2);
  for (let i = 0; i < jellyfishSwarm.length; i++) {
    for (let j = i + 1; j < jellyfishSwarm.length; j++) {
      let j1 = jellyfishSwarm[i];
      let j2 = jellyfishSwarm[j];
      let d = p5.Vector.dist(j1.pos, j2.pos);
      if (d < connectionRange && !doesLineIntersectTurbine(j1.pos, j2.pos)) {
        line(j1.pos.x, j1.pos.y, j1.pos.z, j2.pos.x, j2.pos.y, j2.pos.z);
      }
    }
  }
  noStroke();
}

function doesLineIntersectTurbine(p1, p2) {
  let turbineBase = createVector(0, worldBottom, 0);
  return (p5.Vector.dist(p1, turbineBase) < monopileRadius ||
          p5.Vector.dist(p2, turbineBase) < monopileRadius);
}

// --- Stats HUD ---
function updateStatsHUD() {
  statsDiv.html(
    `${nf(frameRate(), 2, 2)} FPS<br>Jellyfish: ${jellyfishSwarm.length}`
  );
}

// --- Jellyfish Swarm Setup ---
function setupJellyfish() {
  jellyfishSwarm = [];
  let count = numJellyfishSlider.value();
  for (let i = 0; i < count; i++) {
    let startX, startZ;
    do {
      startX = random(-width / 4, width / 4);
      startZ = random(-width / 4, width / 4);
    } while (dist(startX, startZ, 0, 0) < monopileRadius * 1.5);
    let startY = random(worldTop + jellyfishDiameter, worldBottom - 100);
    jellyfishSwarm.push(new Jellyfish3D(startX, startY, startZ));
  }
}

// --- Jellyfish3D Class ---
class Jellyfish3D {
  constructor(x, y, z) {
    this.pos = createVector(x, y, z);
    this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5), random(-0.5, 0.5));
    this.size = jellyfishDiameter * 1.5;
    this.maxSpeed = 0.05 * scaleFactor;
    this.activeConnections = 0;
    this.pulsationPhase = random(TWO_PI);
    this.pulsationFrequency = random(0.01, 0.03);
    this.pulsationAmplitude = random(1, 1.5);
  }
  
  interactWithTurbine() {
    this.repelFromMonopile();
    this.attractToTurbine();
  }
  
  interactWithJellies(swarm) {
    this.countConnections(swarm);
    this.repelFromOthers(swarm);
    this.attractToOthers(swarm);
    this.spreadOutIfOverConnected(swarm);
  }
  
  countConnections(swarm) {
    this.activeConnections = 0;
    for (let other of swarm) {
      if (other !== this) {
        let d = p5.Vector.dist(this.pos, other.pos);
        if (d < connectionRange) {
          this.activeConnections++;
        }
      }
    }
  }
  
  spreadOutIfOverConnected(swarm) {
    let maxCon = maxConnectionsSlider.value();
    if (this.activeConnections > maxCon) {
      for (let other of swarm) {
        if (other !== this) {
          let d = p5.Vector.dist(this.pos, other.pos);
          if (d < connectionRange) {
            let dx = this.pos.x - other.pos.x;
            let dy = this.pos.y - other.pos.y;
            let dz = this.pos.z - other.pos.z;
            let force = spreadingForce * map(this.activeConnections, maxCon, maxCon + 3, 0.01/5, 0.05/5);
            this.vel.x += force * (dx / d) * 0.2;
            this.vel.y += force * (dy / d);
            this.vel.z += force * (dz / d) * 0.2;
          }
        }
      }
    }
  }
  
  repelFromMonopile() {
    let d = dist(this.pos.x, this.pos.z, turbinePos.x, turbinePos.z);
    let minRepulsionDistance = monopileRadius + this.size * 3;
    if (d < minRepulsionDistance) {
      let dx = this.pos.x - turbinePos.x;
      let dz = this.pos.z - turbinePos.z;
      let force = map(d, 0, minRepulsionDistance, 0.1, 0.005);
      this.vel.x += force * (dx / d);
      this.vel.z += force * (dz / d);
      let overlap = minRepulsionDistance - d;
      this.pos.x += (dx / d) * overlap;
      this.pos.z += (dz / d) * overlap;
    }
  }
  
  attractToTurbine() {
    let d = dist(this.pos.x, this.pos.z, turbinePos.x, turbinePos.z);
    let minAttractionDistance = monopileRadius + this.size + 10;
    let maxAttractionDistance = monopileRadius * 6;
    if (d > minAttractionDistance) {
      let dx = turbinePos.x - this.pos.x;
      let dz = turbinePos.z - this.pos.z;
      let forceStrength = turbineAttraction * map(d, minAttractionDistance, maxAttractionDistance, 0.02/5, 0.05/5);
      this.vel.x += forceStrength * (dx / d);
      this.vel.z += forceStrength * (dz / d);
    }
  }
  
  repelFromOthers(swarm) {
    for (let other of swarm) {
      if (other !== this) {
        let d = p5.Vector.dist(this.pos, other.pos);
        let repulsionRange = this.size * 3;
        if (d < repulsionRange) {
          let dx = this.pos.x - other.pos.x;
          let dy = this.pos.y - other.pos.y;
          let dz = this.pos.z - other.pos.z;
          let force = repulsionStrength * map(d, 0, repulsionRange, 0.02/5, 0);
          this.vel.x += force * (dx / d) * 12;
          this.vel.y += force * (dy / d) * 30;
          this.vel.z += force * (dz / d) * 12;
        }
      }
    }
  }
  
  attractToOthers(swarm) {
    let neighborsInRange = 0;
    for (let other of swarm) {
      if (other !== this) {
        let d = p5.Vector.dist(this.pos, other.pos);
        let attractionRange = connectionRange * 0.8;
        if (d < attractionRange) {
          neighborsInRange++;
        }
        if (neighborsInRange < 1 && d >= this.size * 3) {
          let dx = other.pos.x - this.pos.x;
          let dy = other.pos.y - this.pos.y;
          let dz = other.pos.z - this.pos.z;
          this.vel.x += (attractionStrength / 5000) * (dx / d);
          this.vel.y += (attractionStrength / 5000) * (dy / d);
          this.vel.z += (attractionStrength / 5000) * (dz / d);
        }
      }
    }
  }
  
  limitSpeed() {
    if (this.vel.mag() > maxSpeed) {
      this.vel.normalize();
      this.vel.mult(maxSpeed);
    }
  }
  
  keepInsideWaterVolume() {
    let halfBoxSize = width;
    if (this.pos.x < -halfBoxSize || this.pos.x > halfBoxSize) this.vel.x *= -1;
    if (this.pos.z < -halfBoxSize || this.pos.z > halfBoxSize) this.vel.z *= -1;
    
    let minSwimHeight = worldBottom - 100;
    if (this.pos.y < worldTop) {
      this.pos.y = worldTop;
      this.vel.y *= -1;
    }
    if (this.pos.y > minSwimHeight) {
      this.pos.y = minSwimHeight;
      this.vel.y *= -1;
    }
  }
  
  updatePulsation() {
    let speed = this.vel.mag();
    this.pulsationAmplitude = map(speed, 0, this.maxSpeed, 1, 3);
    this.pulsationFrequency = map(speed, 0, this.maxSpeed, 0.1, 0.15);
    this.pulsationPhase += this.pulsationFrequency;
  }
  
  move(swarm) {
    this.keepInsideWaterVolume();
    this.interactWithTurbine();
    this.interactWithJellies(swarm);
    this.updatePulsation();
    this.limitSpeed();
    this.pos.add(this.vel);
  }
  
  display() {
    push();
    translate(this.pos.x, this.pos.y, this.pos.z);
    // Use emissiveMaterial for a glowing white effect
    emissiveMaterial(jellyfishColor);
    this.drawHemisphericalJellyfish();
    pop();
  }
  
  drawHemisphericalJellyfish() {
    let latSteps = 10;
    let lonSteps = 20;
    let pulsationEffect = this.pulsationAmplitude * sin(this.pulsationPhase);
    let baseRadius = this.size;
    let radiusX = baseRadius + pulsationEffect;
    let radiusZ = baseRadius + pulsationEffect;
    let radiusY = baseRadius;
    
    for (let i = 0; i < latSteps; i++) {
      let theta1 = map(i, 0, latSteps, HALF_PI, 0);
      let theta2 = map(i + 1, 0, latSteps, HALF_PI, 0);
      
      beginShape(TRIANGLE_STRIP);
      for (let j = 0; j <= lonSteps; j++) {
        let phi = map(j, 0, lonSteps, 0, TWO_PI);
        let x1 = radiusX * cos(phi) * sin(theta1);
        let y1 = -radiusY * cos(theta1);
        let z1 = radiusZ * sin(phi) * sin(theta1);
        vertex(x1, y1, z1);
        
        let x2 = radiusX * cos(phi) * sin(theta2);
        let y2 = -radiusY * cos(theta2);
        let z2 = radiusZ * sin(phi) * sin(theta2);
        vertex(x2, y2, z2);
      }
      endShape();
    }
  }
}
