// Nicholas Powell
// nipowell@ucsc.edu

// Notes to grader:
// Implemented eraser button and button to toggle reference picture for awesomeness

// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_PointSize;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_PointSize;
  }`;

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`;

// Global Variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_PointSize;
let currentSegments = 36;

// Global variables for current settings
let currentColor = [1.0, 1.0, 1.0, 1.0]; // Default color: white
let currentSize = 20; // Default size
let lastRenderTime = 0; // For performance testing

// List to store all shapes
let shapesList = [];

function setupWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL with preserveDrawingBuffer enabled
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
}

function connectVariablesToGLSL() {
  // Initialize Shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_PointSize
  u_PointSize = gl.getUniformLocation(gl.program, 'u_PointSize');
  if (!u_PointSize) {
    console.log('Failed to get the storage location of u_PointSize');
    return;
  }
}

// Global variable for current draw mode
let currentMode = 'point'; // 'point' or 'triangle'

// Setup the mode selection buttons
function setupModeButtons() {
  const pointButton = document.getElementById('pointMode');
  const triangleButton = document.getElementById('triangleMode');
  const circleButton = document.getElementById('circleMode');
  const eraserButton = document.getElementById('eraserMode');  // <-- new

  pointButton.addEventListener('click', () => {
    currentMode = 'point';
  });

  triangleButton.addEventListener('click', () => {
    currentMode = 'triangle';
  });

  circleButton.addEventListener('click', () => {
    currentMode = 'circle';
  });

  // New eraser button
  eraserButton.addEventListener('click', () => {
    currentMode = 'eraser';
  });
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  // Register event handlers
  canvas.onmousedown = click;
  canvas.onmousemove = drag;
  canvas.onmouseup = stopDragging;

  // Connect sliders and buttons
  setupColorSliders();
  setupSizeSlider();
  setupSegmentSlider();
  setupClearCanvasButton();
  setupModeButtons();
  setupRecreateDrawingButton();
  setupToggleReferenceButton();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}



class Point {
  constructor(position, color, size) {
    this.position = position; // [x, y]
    this.color = color;       // [r, g, b, a]
    this.size = size;         // Size of the point

    // Create a buffer for this point
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.position), gl.STATIC_DRAW);
  }

  render() {
    // Bind this point's buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Pass the point's color and size to the shaders
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
    gl.uniform1f(u_PointSize, this.size);

    // Draw the point
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}

// Event handlers
let isDragging = false;
let tempVertices = []; // Temporary storage for triangle vertices

function click(ev) {
  const [x, y] = convertCoordinatesEventToGL(ev);

  if (currentMode === 'point') {
    isDragging = true;
    drawPoint(ev);

  } else if (currentMode === 'triangle') {
    isDragging = true;
    const size = currentSize / canvas.width;
    const newTriangle = new Triangle([x, y], size, [...currentColor]);
    shapesList.push(newTriangle);
    newTriangle.render();

  } else if (currentMode === 'circle') {
    isDragging = true;
    const radius = currentSize / canvas.width;
    const newCircle = new Circle([x, y], radius, [...currentColor], currentSegments);
    shapesList.push(newCircle);
    newCircle.render();

  } else if (currentMode === 'eraser') {
    // “Erase” by drawing a black circle
    isDragging = true;
    const radius = currentSize / canvas.width;
    const eraserCircle = new Circle(
      [x, y],
      radius,
      [0.0, 0.0, 0.0, 1.0],  // black color
      currentSegments
    );
    shapesList.push(eraserCircle);
    eraserCircle.render();
  }
}

function drag(ev) {
  if (isDragging && ev.buttons === 1) {
    const [x, y] = convertCoordinatesEventToGL(ev);

    if (currentMode === 'point') {
      drawPoint(ev);

    } else if (currentMode === 'triangle') {
      const size = currentSize / canvas.width;
      const newTriangle = new Triangle([x, y], size, [...currentColor]);
      shapesList.push(newTriangle);
      newTriangle.render();

    } else if (currentMode === 'circle') {
      const radius = currentSize / canvas.width;
      const newCircle = new Circle([x, y], radius, [...currentColor], currentSegments);
      shapesList.push(newCircle);
      newCircle.render();

    } else if (currentMode === 'eraser') {
      const radius = currentSize / canvas.width;
      const eraserCircle = new Circle(
        [x, y],
        radius,
        [0.0, 0.0, 0.0, 1.0],  // black color
        currentSegments
      );
      shapesList.push(eraserCircle);
      eraserCircle.render();
    }
  }
}



function stopDragging() {
  isDragging = false;
}

class Triangle {
  constructor(center, size, color) {
    this.center = center;   // [x, y]
    this.size = size;       // Size of the triangle
    this.color = color;     // [r, g, b, a]
    this.vertices = this.computeVertices();

    // Create a buffer for this triangle
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
  }

  computeVertices() {
    const vertices = [];
    const angleStep = (2 * Math.PI) / 3;

    for (let i = 0; i < 3; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top (-90 degrees)
      const x = this.center[0] + this.size * Math.cos(angle);
      const y = this.center[1] + this.size * Math.sin(angle);
      vertices.push(x, y);
    }
    return vertices;
  }

  render() {
    // Bind this triangle's buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Pass the triangle's color to the shaders
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    // Draw the triangle
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}


function drawTriangle(vertices) {
  // Flatten the vertices array into a Float32Array
  const vertexData = new Float32Array(vertices);

  // Create a buffer object
  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.log('Failed to create the buffer object');
    return;
  }

  // Bind the buffer object to target
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  // Write data into the buffer object
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  // Get the storage location of a_Position
  const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Assign the buffer object to a_Position variable
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  // Enable the assignment to a_Position variable
  gl.enableVertexAttribArray(a_Position);

  // Draw the triangle
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

class Circle {
  constructor(center, radius, color, segments = currentSegments) {
    this.center = center;   // [x, y]
    this.radius = radius;   // Radius of the circle
    this.color = color;     // [r, g, b, a]
    this.segments = segments; // Number of segments to approximate the circle
    this.vertices = this.computeVertices();

    // Create a buffer for this circle
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);
  }

  computeVertices() {
    const vertices = [this.center[0], this.center[1]]; // Start with the center point
    const angleStep = (2 * Math.PI) / this.segments;

    for (let i = 0; i <= this.segments; i++) {
      const angle = i * angleStep;
      const x = this.center[0] + this.radius * Math.cos(angle);
      const y = this.center[1] + this.radius * Math.sin(angle);
      vertices.push(x, y);
    }
    return vertices;
  }

  render() {
    // Bind this circle's buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Pass the circle's color to the shaders
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);

    // Draw the circle as a TRIANGLE_FAN
    gl.drawArrays(gl.TRIANGLE_FAN, 0, this.vertices.length / 2);
  }
}

function setupSegmentSlider() {
  const segmentSlider = document.getElementById("segmentSlider");
  const segmentValue = document.getElementById("segmentValue");

  function updateSegments() {
    currentSegments = parseInt(segmentSlider.value);
    segmentValue.textContent = segmentSlider.value;
  }

  // Add an event listener to update the current number of segments
  segmentSlider.addEventListener("input", updateSegments);
}


function drawPoint(ev) {
  let [x, y] = convertCoordinatesEventToGL(ev);

  // Create a new Point object with the current settings
  let newPoint = new Point([x, y], [...currentColor], currentSize);

  // Add the new point to the shapes list
  shapesList.push(newPoint);

  // Render the newly added point
  newPoint.render();

  const now = performance.now();
  if (now - lastRenderTime > 500) { // Log every 500ms
    console.log(`Shapes: ${shapesList.length}`);
    lastRenderTime = now;
  }
}

function renderAllShapes() {
  // Clear the canvas
  gl.clear(gl.COLOR_BUFFER_BIT);

  // Render each shape in the shapes list
  for (const shape of shapesList) {
    shape.render();
  }
}


function setupRecreateDrawingButton() {
  const recreateButton = document.getElementById("recreateDrawing");
  if (!recreateButton) {
    console.error("Recreate Drawing button not found!");
    return;
  }

  recreateButton.addEventListener("click", () => {
    console.log("Recreate Drawing button clicked!");
    drawReferenceDrawing();
  });
}

function drawReferenceDrawing() {
  console.log("Executing drawReferenceDrawing()...");

  const vertices = [
    -0.875,  0.0,     0.0,   0.75,   0.0,   0.0,
     0.875,  0.0,     0.0,   0.75,   0.0,   0.0,

    -0.625,   0.0,   -0.375,   0.0,   -0.625,  -0.25,
    -0.375,   0.0,   -0.375,  -0.25,  -0.625,  -0.25,

    -0.375,   0.0,   -0.125,   0.0,   -0.375,  -0.25,
    -0.125,   0.0,   -0.125,  -0.25,  -0.375,  -0.25,

    -0.125,   0.0,    0.125,   0.0,   -0.125,  -0.25,
     0.125,   0.0,    0.125,  -0.25,  -0.125,  -0.25,

     0.125,   0.0,    0.375,   0.0,    0.125,  -0.25,
     0.375,   0.0,    0.375,  -0.25,   0.125,  -0.25,

     0.375,   0.0,    0.625,   0.0,    0.375,  -0.25,
     0.625,   0.0,    0.625,  -0.25,   0.375,  -0.25,

    -0.625,  -0.25,  -0.375,  -0.25,  -0.625,  -0.5,
    -0.375,  -0.25,  -0.375,  -0.5,   -0.625,  -0.5,

    -0.125,  -0.25,   0.125,  -0.25,  -0.125,  -0.5,
     0.125,  -0.25,   0.125,  -0.5,   -0.125,  -0.5,

     0.375,  -0.25,   0.625,  -0.25,   0.375,  -0.5,
     0.625,  -0.25,   0.625,  -0.5,    0.375,  -0.5,

    -0.625,  -0.5,   -0.375,  -0.5,   -0.625,  -0.75,
    -0.375,  -0.5,   -0.375,  -0.75,  -0.625,  -0.75,

    -0.375,  -0.5,   -0.125,  -0.5,   -0.375,  -0.75,
    -0.125,  -0.5,   -0.125,  -0.75,  -0.375,  -0.75,

     0.125,  -0.5,    0.375,  -0.5,    0.125,  -0.75,
     0.375,  -0.5,    0.375,  -0.75,   0.125,  -0.75,

     0.375,  -0.5,    0.625,  -0.5,    0.375,  -0.75,
     0.625,  -0.5,    0.625,  -0.75,   0.375,  -0.75,

    -0.625,  -0.75,  -0.375,  -0.75,  -0.625,  -1.0,
    -0.375,  -0.75,  -0.375,  -1.0,   -0.625,  -1.0,

    -0.375,  -0.75,  -0.125,  -0.75,  -0.375,  -1.0,
    -0.125,  -0.75,  -0.125,  -1.0,   -0.375,  -1.0,

     0.125,  -0.75,   0.375,  -0.75,   0.125,  -1.0,
     0.375,  -0.75,   0.375,  -1.0,    0.125,  -1.0,

     0.375,  -0.75,   0.625,  -0.75,   0.375,  -1.0,
     0.625,  -0.75,   0.625,  -1.0,    0.375,  -1.0,
  ];

  const vertexBuffer = gl.createBuffer();
  if (!vertexBuffer) {
    console.error("Failed to create vertex buffer");
    return;
  }

  // Bind the vertex buffer
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  // Upload vertex data
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  // Set up vertex attribute pointers
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // Set color for reference shapes (white)
  gl.uniform4f(u_FragColor, 1.0, 1.0, 1.0, 1.0);

  // Draw the triangles
  gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2);
}




function setupToggleReferenceButton() {
  const toggleButton = document.getElementById("toggleReferenceImage");
  const referenceImage = document.getElementById("referenceImage");

  // Initialize the display property explicitly based on the current CSS
  referenceImage.style.display = referenceImage.style.display || "none";

  toggleButton.addEventListener("click", () => {
    // Toggle between "block" and "none"
    if (referenceImage.style.display === "none") {
      referenceImage.style.display = "block";
      toggleButton.textContent = "Hide Reference";
    } else {
      referenceImage.style.display = "none";
      toggleButton.textContent = "Show Reference";
    }
  });
}


function convertCoordinatesEventToGL(ev) {
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

  return [x, y];
}

function setupColorSliders() {
  const redSlider = document.getElementById("redSlider");
  const greenSlider = document.getElementById("greenSlider");
  const blueSlider = document.getElementById("blueSlider");

  const redValue = document.getElementById("redValue");
  const greenValue = document.getElementById("greenValue");
  const blueValue = document.getElementById("blueValue");

  function updateColor() {
    currentColor[0] = parseFloat(redSlider.value);
    currentColor[1] = parseFloat(greenSlider.value);
    currentColor[2] = parseFloat(blueSlider.value);

    redValue.textContent = redSlider.value;
    greenValue.textContent = greenSlider.value;
    blueValue.textContent = blueSlider.value;
  }

  // Add event listeners
  redSlider.addEventListener("input", updateColor);
  greenSlider.addEventListener("input", updateColor);
  blueSlider.addEventListener("input", updateColor);
}

function setupSizeSlider() {
  const sizeSlider = document.getElementById("sizeSlider");
  const sizeValue = document.getElementById("sizeValue");

  function updateSize() {
    currentSize = parseFloat(sizeSlider.value);
    sizeValue.textContent = sizeSlider.value;
  }

  // Add event listener
  sizeSlider.addEventListener("input", updateSize);
}

function setupClearCanvasButton() {
  const clearButton = document.getElementById("clearCanvas");
  clearButton.addEventListener("click", () => {
    shapesList = [];
    renderAllShapes();
  });
}

