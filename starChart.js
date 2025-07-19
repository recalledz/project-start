// starChart.js
/* global PIXI */

let initialized = false;
let app = null;

export function initStarChart(containerId = "star-chart-container") {
  if (initialized) return;
  initialized = true;

  // 1) Find the container
  const container =
    typeof containerId === "string"
      ? document.getElementById(containerId)
      : containerId;
  if (!container) {
    console.error("Star chart container not found:", containerId);
    return;
  }

  // 2) Create the PIXI Application
  app = new PIXI.Application({
    width:  container.clientWidth  || window.innerWidth,
    height: container.clientHeight || window.innerHeight,
    backgroundColor: 0x000000,
    antialias: true
  });
  container.appendChild(app.view);
  

   
  // 3) Helper to create & cache a glowing-star texture
  function makeStarTexture() {
    const g = new PIXI.Graphics();
    const spikes      = 5;
    const outerRadius = 12;
    const innerRadius = 6;
    let rot = Math.PI / 2 * 3;
    const step = Math.PI / spikes;

    g.beginFill(0xffffff);
    g.moveTo(0, -outerRadius);
    for (let i = 0; i < spikes; i++) {
      g.lineTo(
        Math.cos(rot) * outerRadius,
        Math.sin(rot) * outerRadius
      );
      rot += step;
      g.lineTo(
        Math.cos(rot) * innerRadius,
        Math.sin(rot) * innerRadius
      );
      rot += step;
    }
    g.closePath();
    g.endFill();

    // glow filter
    g.filters = [
      new PIXI.filters.GlowFilter({
        distance:      10,
        outerStrength: 4,
        color:         0xffffff
      })
    ];

    const tex = app.renderer.generateTexture(g);
    g.destroy();
    return tex;
  }
  const starTexture = makeStarTexture();

  // 4) Background
  const bg = PIXI.Sprite.from("img/space-bg.png");
  bg.width  = app.screen.width;
  bg.height = app.screen.height;
  app.stage.addChild(bg);
  const linesContainer = new PIXI.Container();
  app.stage.addChild(linesContainer);

  // 5) Nodes & Edges
  const labelColors = {
  str: 0xff5555,
  dex: 0x55ff55,
  int: 0x5599ff,
  core: 0xffff55,
  default: 0xffffff
};
const nodes = [
  { id: "root",               x: 0.7422685476758676, y: 0.8782565051086226, label: "Unlock Prestige Loadouts", type: "core" },

  // strength tree
  { id: "str_base_hp",        x: 0.883406113537118,  y: 0.8283479187799804, label: "+5 B HP", type: "str" },
  {id: 'str_challenges', x: 0.9270742358078603, y: 0.6368859928133005, label: 'Unlock Challenges', type: 'str'},
  {id: 'str_misc', x: 0.9259825327510917, y: 0.5103450647318742, label: 'Strength Upgrade', type: 'str'},
  {id: 'str_unlock_class', x: 0.8151746724890829, y: 0.3111806743548304, label: 'Unlock Class', type: 'str'},

  // dex tree
  { id: "dex_attack_speed",   x: 0.6241266375545852, y: 0.8756632223234702, label: "Unlock Attack Speed", type: "dex" },
  { id: "dex_misc",           x: 0.4025109170305677, y: 0.6742980932895483, label: "DEX Upgrade", type: "dex" }
];

const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));


 const edges = [
  // strength tree
  ["root", "str_base_hp"], 
  ["str_challenges", "str_misc"],
  ["str_challenges", "str_misc"],
  
  // dex tree
  ["root", "dex_attack_speed"], 
  ["dex_attack_speed", "dex_misc"]
];

 function drawConnections() {
  linesContainer.removeChildren(); // clear old lines
  edges.forEach(([a, b]) => {
    const n1 = nodeMap[a], n2 = nodeMap[b];
    if (!n1 || !n2) return; // just in case
    const g = new PIXI.Graphics()
      .lineStyle(2, 0x448aff, 0.4)
      .moveTo(n1.x * app.screen.width, n1.y * app.screen.height)
      .lineTo(n2.x * app.screen.width, n2.y * app.screen.height);
    linesContainer.addChild(g);
  });
}


  drawConnections();

  // 6) Drag‐and‐drop handlers

  function onDragStart(event) {
    this.data = event.data;
    this.dragging = true;
  }

  function onDragMove() {
    if (!this.dragging) return;
    const newPos = this.data.getLocalPosition(this.parent);
    this.position.set(newPos.x, newPos.y);

    // update normalized coords immediately
    const node = nodeMap[this.nodeId];
    node.x = this.x / app.screen.width;
    node.y = this.y / app.screen.height;

    drawConnections();            // redraw lines in real time
    console.log(`Node ${node.id} at`, node);
  }
  function onDragEnd() {
    if (!this.dragging) return;
    this.dragging = false;
    this.data = null;

    const node = nodeMap[this.nodeId];
    node.x = this.x / app.screen.width;
    node.y = this.y / app.screen.height;

    drawConnections();            // ensure final lines
    console.log(`Node ${node.id} moved to`, node);
  }

  const nodesLayer = new PIXI.Container();
  app.stage.addChild(nodesLayer);
  let labelsVisible = true;
  const labelSprites = []; // Store label references

  // 8) Draw stars & labels
   nodes.forEach(n => {
  const sprite = new PIXI.Sprite(starTexture);
  sprite.anchor.set(0.5);
  sprite.position.set(n.x * app.screen.width, n.y * app.screen.height);
  sprite.nodeId      = n.id;
  sprite.interactive = true;
  sprite.buttonMode  = true;
  sprite
    .on("pointerdown",      onDragStart)
    .on("pointermove",      onDragMove)
    .on("pointerup",        onDragEnd)
    .on("pointerupoutside", onDragEnd);
  nodesLayer.addChild(sprite);

  const color = labelColors[n.type] || labelColors.default;

const label = new PIXI.Text(n.label || n.id.toString(), {
  fontFamily: "Arial",
  fontSize: 12,
  fill: color,
  wordWrap: true,
  wordWrapWidth: 100,
  align: "center",
  dropShadow: true,
  dropShadowColor: "#000000",
  dropShadowDistance: 2,
  dropShadowAlpha: 0.5
});
label.anchor.set(0.5, 0);
label.position.set(n.x * app.screen.width, n.y * app.screen.height + 20);
label.visible = labelsVisible;
nodesLayer.addChild(label);
labelSprites.push(label);


  label.anchor.set(0.5);
  label.position.set(
    n.x * app.screen.width,
    n.y * app.screen.height - 25
  );
  nodesLayer.addChild(label);
  });

  window.addEventListener("keydown", (e) => {
  if (e.key === "l") { // press L to toggle
    labelsVisible = !labelsVisible;
    labelSprites.forEach(lbl => lbl.visible = labelsVisible);
    console.log(`Labels ${labelsVisible ? "shown" : "hidden"}`);
  }
});

}
