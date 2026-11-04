
let worldMap;
let temperatureData = {};

let selectedYear = 2020;
let minYear = 1940;
let maxYear = 2025;

let mapLoaded = false;
let dataLoaded = false;
let dataError = false;

const MAP_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const TEMP_URL = "https://ourworldindata.org/grapher/annual-temperature-anomalies.csv";

// Setup inicial

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont("Arial");

  // Load do mapa mundo
  loadJSON(
    MAP_URL,
    function(data) {
      worldMap = data;
      mapLoaded = true;
      console.log("Mapa carregado!");
    },
    function(error) {
      console.log("Erro ao carregar mapa:", error);
    }
  );

  // Temperaturas 
  loadStrings(
    TEMP_URL,
    function(lines) {
      console.log("Ficheiro recebido!");
      console.log("Primeira linha:", lines[0]);

      let headers = parseCSVLine(lines[0]);

      let codeIndex = headers.findIndex(h =>
        h.trim().toLowerCase() === "code"
      );

      let yearIndex = headers.findIndex(h =>
        h.trim().toLowerCase() === "year"
      );

      let valueIndex = 3;

      if (codeIndex === -1 || yearIndex === -1) {
        console.log("Colunas não encontradas:", headers);
        dataError = true;
        return;
      }

      for (let i = 1; i < lines.length; i++) {
        let row = parseCSVLine(lines[i]);

        let code = row[codeIndex];
        let year = row[yearIndex];
        let rawValue = row[valueIndex];

        if (
          code &&
          code.trim() !== "" &&
          year &&
          rawValue !== undefined &&
          rawValue.trim() !== ""
        ) {
          let value = Number(rawValue);

          if (Number.isFinite(value)) {
            temperatureData[code.trim() + "_" + year.trim()] = value;
          }
        }
      }

      dataLoaded = true;

      console.log(
        "Total de registos:",
        Object.keys(temperatureData).length
      );

      console.log(
        "Portugal 2020:",
        temperatureData["PRT_2020"]
      );
    },
    function(error) {
      dataError = true;
      console.log("Erro ao carregar temperaturas:", error);
    }
  );
}

// ler CSV em cada linha

function parseCSVLine(line) {
  let result = [];
  let value = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    let character = line[i];

    if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (character === "," && !insideQuotes) {
      result.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  result.push(value);

  return result;
}

// draw do fundo e mapa

function draw() {
  background(17, 27, 39);

  drawTitle();

  if (mapLoaded) {
    drawWorldMap();
  } else {
    fill(255);
    textSize(16);
    text("LOADING MAP...", 35, 160);
  }

  drawInformation();
}

// Titulo (texto)

function drawTitle() {
  noStroke();

  fill(255);
  textSize(24);
  text("Mapa das Alterações Climáticas", 35, 45);

  fill(160);
  textSize(12);
  text("Divergências de Temperatura ao Longo dos Anos", 35, 70);
}

// --------------------------------------------------
// MAPA
// --------------------------------------------------

function drawWorldMap() {
  let mapWidth = width - 60;
  let mapHeight = height - 190;

  let scaleMap = min(
    mapWidth / 360,
    mapHeight / 170
  );

  let offsetX = (width - 360 * scaleMap) / 2;
  let offsetY = 125 + (mapHeight - 170 * scaleMap) / 2;

  for (let country of worldMap.features) {
    let properties = country.properties;

    let code = properties.ISO_A3_EH;

    if (!code || code === "-99") {
      code = properties.ISO_A3;
    }

    if (!code || code === "-99") {
      code = properties.ADM0_A3;
    }

    let value = temperatureData[code + "_" + selectedYear];

    fill(getCountryColor(value));

    stroke(17, 27, 39);
    strokeWeight(0.5);

    let geometry = country.geometry;

    if (geometry.type === "Polygon") {
      drawCountry(
        geometry.coordinates,
        scaleMap,
        offsetX,
        offsetY
      );
    }

    if (geometry.type === "MultiPolygon") {
      for (let polygon of geometry.coordinates) {
        drawCountry(
          polygon,
          scaleMap,
          offsetX,
          offsetY
        );
      }
    }
  }
}

// --------------------------------------------------
// DESENHAR PAÍSES
// --------------------------------------------------

function drawCountry(polygons, scaleMap, offsetX, offsetY) {
  for (let ring of polygons) {
    beginShape();

    for (let point of ring) {
      let longitude = point[0];
      let latitude = point[1];

      let x = offsetX + (longitude + 180) * scaleMap;
      let y = offsetY + (85 - latitude) * scaleMap;

      vertex(x, y);
    }

    endShape(CLOSE);
  }
}

// --------------------------------------------------
// CORES
// --------------------------------------------------

function getCountryColor(value) {
  if (value === undefined || value === null) {
    return color(55, 65, 75);
  }

  let amount = map(value, -0.5, 3, 0, 1);
  amount = constrain(amount, 0, 1);

  return lerpColor(
    color(45, 120, 145),
    color(240, 95, 55),
    amount
  );
}

// --------------------------------------------------
// INFORMAÇÃO E BOTÕES
// --------------------------------------------------

function drawInformation() {
  let panelY = height - 75;

  fill(255);
  noStroke();
  textSize(18);

  text("YEAR: " + selectedYear, 35, panelY);

  // ANO ANTERIOR
  fill(48, 63, 78);
  rect(160, panelY - 22, 35, 32, 4);

  fill(255);
  textSize(20);
  text("<", 171, panelY + 1);

  // ANO SEGUINTE
  fill(48, 63, 78);
  rect(205, panelY - 22, 35, 32, 4);

  fill(255);
  text(">", 216, panelY + 1);

  // ESTADO DOS DADOS
  textSize(12);

  if (dataLoaded) {
    fill(150, 210, 170);
    text("TEMPERATURE DATA LOADED", 270, panelY - 3);
  } else if (dataError) {
    fill(255, 100, 90);
    text("COULD NOT LOAD DATA", 270, panelY - 3);
  } else {
    fill(180);
    text("LOADING DATA...", 270, panelY - 3);
  }

  // LEGENDA
  fill(45, 120, 145);
  rect(width - 230, panelY - 20, 25, 12);

  fill(180);
  text("Lower anomaly", width - 195, panelY - 10);

  fill(240, 95, 55);
  rect(width - 230, panelY + 3, 25, 12);

  fill(180);
  text("Higher anomaly", width - 195, panelY + 13);
}

// --------------------------------------------------
// MUDAR ANO
// --------------------------------------------------

function mousePressed() {
  let panelY = height - 75;

  if (
    mouseX > 160 &&
    mouseX < 195 &&
    mouseY > panelY - 22 &&
    mouseY < panelY + 10
  ) {
    selectedYear = max(minYear, selectedYear - 1);
  }

  if (
    mouseX > 205 &&
    mouseX < 240 &&
    mouseY > panelY - 22 &&
    mouseY < panelY + 10
  ) {
    selectedYear = min(maxYear, selectedYear + 1);
  }
}

// --------------------------------------------------
// REDIMENSIONAR
// --------------------------------------------------

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


