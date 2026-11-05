
let worldMap;
let temperatureData = {}; // dados de temperatura 
let co2Data = {}; // dados de CO2
let smokeParticles = []; // partículas de CO2
let showCO2 = true; // mostrar partículas de CO2

let selectedYear = 2020;
let minYear = 1940;
let maxYear = 2025;

let mapLoaded = false;
let dataLoaded = false;
let dataError = false;

// URL's para sites com dados do mapa, temperatura e CO2
const MAP_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson";

const TEMP_URL = "https://ourworldindata.org/grapher/annual-temperature-anomalies.csv";

const CO2_URL = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv";

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
  // Dados de CO2
loadStrings(
  CO2_URL,
  function(lines) {
    console.log("Ficheiro de CO2 recebido!");
    console.log("Primeira linha CO2:", lines[0]);

    let headers = parseCSVLine(lines[0]);

    let codeIndex = headers.findIndex(h =>
      h.trim().toLowerCase() === "code"
    );

    let yearIndex = headers.findIndex(h =>
      h.trim().toLowerCase() === "year"
    );

    let valueIndex = 3;

    if (codeIndex === -1 || yearIndex === -1) {
      console.log("Colunas de CO2 não encontradas:", headers);
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
          co2Data[code.trim() + "_" + year.trim()] = value;
        }
      }
    }

    console.log(
      "Total de registos CO2:",
      Object.keys(co2Data).length
    );

    console.log(
      "Portugal CO2 2020:",
      co2Data["PRT_2020"]
    );
  },
  function(error) {
    console.log("Erro ao carregar CO2:", error);
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
     if (showCO2) {
    drawSmoke();
  }
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

// Mapa mundo 

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

//  Países 

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

// Cores com base na temperatura

function getCountryColor(value) {
  if (value === undefined || value === null) {
    return color(55, 65, 75);
  }

  let amount = map(value, -0.5, 3, 0, 1);
  amount = constrain(amount, 0, 1);

  return lerpColor(
    color(102, 255, 204),
    color(242, 8, 25),
    amount
  );
}

function drawSmoke() {
  if (Object.keys(co2Data).length === 0) return;

  let mapWidth = width - 60;
  let mapHeight = height - 190;

  let scaleMap = min(mapWidth / 360, mapHeight / 170);
  let offsetX = (width - 360 * scaleMap) / 2;
  let offsetY = 125 + (mapHeight - 170 * scaleMap) / 2;

  // Encontrar as emissões máximas do ano
  let maxEmission = 0;

  for (let country of worldMap.features) {
    let code = country.properties.ISO_A3_EH;

    if (!code || code === "-99") {
      code = country.properties.ISO_A3;
    }

    if (!code || code === "-99") {
      code = country.properties.ADM0_A3;
    }

    let value = co2Data[code + "_" + selectedYear];

    if (value > maxEmission) {
      maxEmission = value;
    }
  }

  if (maxEmission === 0) return;

  // Criar fumo a partir dos países
  for (let country of worldMap.features) {
    let code = country.properties.ISO_A3_EH;

    if (!code || code === "-99") {
      code = country.properties.ISO_A3;
    }

    if (!code || code === "-99") {
      code = country.properties.ADM0_A3;
    }

    let value = co2Data[code + "_" + selectedYear];

    if (!value || value <= 0) continue;

    let intensity = Math.log(value + 1) / Math.log(maxEmission + 1);

    let bounds = {
      minLon: 180,
      maxLon: -180,
      minLat: 90,
      maxLat: -90
    };

    collectSmokeCoordinates(country.geometry.coordinates, bounds);

    let lon = (bounds.minLon + bounds.maxLon) / 2;
    let lat = (bounds.minLat + bounds.maxLat) / 2;

    let x = offsetX + (lon + 180) * scaleMap;
    let y = offsetY + (85 - lat) * scaleMap;

    if (random() < intensity * 0.15) {
      smokeParticles.push({
        x: x + random(-1, 1),
        y: y,
        vx: random(-0.5, 0.5),
        vy: random(-1.0, -0.5),
        life: 120,
        size: random(3, 6)
      });
    }
  }

  // Desenhar as partículas
  noStroke();

  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    let p = smokeParticles[i];

    p.x += p.vx + sin(frameCount * 0.04) * 0.3;
    p.y += p.vy;
    p.life--;
    p.size += 0.06;

    let alpha = map(p.life, 0, 120, 0, 65);

    fill(233, 160, 68, alpha);
    ellipse(p.x, p.y, p.size * 1.5, p.size * 1);

    fill(255, 150, 70, alpha * 0.5);
    ellipse(p.x + 3, p.y - 3, p.size, p.size * 1);

    if (p.life <= 0) {
      smokeParticles.splice(i, 1);
    }
  }

  // Limitar o número de partículas
  if (smokeParticles.length > 1000) {
    smokeParticles.splice(0, smokeParticles.length - 1000);
  }
}

// Encontrar a posição dos países
function collectSmokeCoordinates(coords, bounds) {
  if (typeof coords[0] === "number") {
    let lon = coords[0];
    let lat = coords[1];

    bounds.minLon = Math.min(bounds.minLon, lon);
    bounds.maxLon = Math.max(bounds.maxLon, lon);
    bounds.minLat = Math.min(bounds.minLat, lat);
    bounds.maxLat = Math.max(bounds.maxLat, lat);
  } else {
    for (let item of coords) {
      collectSmokeCoordinates(item, bounds);
    }
  }
}


// Informaçoes do painel e botões que mudam o ano

function drawInformation() {
  let panelY = height - 75;

  fill(255);
  noStroke();
  textSize(18);

  text("ANO: " + selectedYear, 35, panelY);

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

  // BOTÃO CO2

fill(48, 63, 78);
noStroke();
rect(width - 145, panelY - 22, 110, 32, 4);

fill(255);
textSize(12);

if (showCO2) {
  text("CO2: LIGADO", width - 135, panelY - 3);
} else {
  text("CO2: DESLIGADO", width - 135, panelY - 3);
}

  // ESTADO DOS DADOS
  textSize(12);

  if (dataLoaded) {
    fill(150, 210, 170);
    text("Dados da Temperatura Carregados", 270, panelY - 3);
  } else if (dataError) {
    fill(255, 100, 90);
    text("NÃO FOI POSSÍVEL CARREGAR OS DADOS", 270, panelY - 3);
  } else {
    fill(180);
    text("A carregar os dados...", 270, panelY - 3);
  }

  // LEGENDA
  fill(102, 255, 204);
  rect(width - 230, panelY - 20, 25, 12);

  fill(180);
  text("Divergência Baixa", width - 195, panelY - 10);

  fill(242, 8, 25);
  rect(width - 230, panelY + 3, 25, 12);

  fill(180);
  text("Divergência Alta", width - 195, panelY + 13);
}


// Mudar de Ano- botões a funcionar com o rato

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

  // BOTÃO CO2

 // LIGAR / DESLIGAR CO2

  if (
  mouseX > 35 &&
  mouseX < 160 &&
  mouseY > 115 &&
  mouseY < 145
  ) {
  showCO2 = !showCO2;

  if (!showCO2) {
    smokeParticles = [];
  }
 }
}

// Redimensionar o Canvas em diferentes ecrãs

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


