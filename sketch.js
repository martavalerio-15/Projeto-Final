
let worldMap;
let temperatureData = {}; // dados de temperatura 
let co2Data = {}; // dados de CO2
let smokeParticles = []; // partículas de CO2

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
}

// Redimensionar o Canvas em diferentes ecrãs

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}


