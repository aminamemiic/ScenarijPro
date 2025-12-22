const express = require("express");
const app = express();

app.use(express.json());

const fs = require("fs");
const path = require("path");

// ključ: "scenarioId-lineId" → vrijednost: userId
// npr linelocks["1-3"] === 5, znaci da je userId 5 zakljucao linijaId 3 u scenarioId 1
const lineLocks = {};

// ključ: userId → vrijednost: "scenarioId-lineId"
const userLocks = {};

// ključ: "characterName" → vrijednost: userId
const characterLocks = {};


// prva ruta
app.post("/api/scenarios", (req, res) => {
    let title = req.body.title;
    if (!title || title.trim() === "") {
        title = "Neimenovani scenarij";
    }

    const scenariosDir = path.join(__dirname, "data", "scenarios");

    const files = fs.readdirSync(scenariosDir);
    const ID = files.length + 1;

    const scenarij = {
        id: ID,
        title: title,
        content: [
            {
                lineId: 1,
                nextLineId: null,
                text: ""
            }
        ]
    }

    const filePath = path.join(scenariosDir, `scenario-${ID}.json`);
    fs.writeFileSync(filePath, JSON.stringify(scenarij, null, 2));

    res.status(200).json(scenarij);
});

// druga ruta
app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", (req, res) => {
    const scenarioID = req.params.scenarioId;
    const lineID = req.params.lineId;
    const userID = req.body.userId;

    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioID}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    const scenarij = JSON.parse(fs.readFileSync(filePath));
    let foundLine = false;
    const key = `${scenarioID}-${lineID}`;

    if (lineLocks[key]) {
        return res.status(409).json({
            message: "Linija je vec zakljucana!"
        });
    }

    for (let lines of scenarij.content) {
        if (lines.lineId == lineID) {
            foundLine = true;
        }
    }

    if (!foundLine) {
        return res.status(404).json({
            message: "Linija ne postoji!"
        });
    }

    if (userLocks[userID]) {
        delete lineLocks[userLocks[userID]];
        delete userLocks[userID];
    }

    userLocks[userID] = `${scenarioID}-${lineID}`;
    lineLocks[`${scenarioID}-${lineID}`] = userID;

    res.status(200).json({
        message: "Linija je uspjesno zakljucana!"
    });
});

// treca ruta 1

// cetvrta ruta 
app.post("/api/scenarios/:scenarioId/characters/lock", (req, res) => {
    const scenarioID = req.params.scenarioId;
    const userID = req.body.userId;
    const character = req.body.characterName;

    if (characterLocks[character]) {
        return res.status(409).json({
            message: "Konflikt! Ime lika je vec zakljucano!"
        });
    }

    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioID}.json`);

    if(!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    characterLocks[character] = userID;
    res.status(200).json({
        message: "Ime lika je uspjesno zakljucano!"
    });
});

// peta ruta 2
app.post("/api/scenarios/:scenarioId/characters/update", (req, res) => {

});

// sesta ruta 3

// sedma ruta
app.get("/api/scenarios/:scenarioId", (req, res) => {
    const scenarioId = req.params.scenarioId;

    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioId}.json`);
    if(!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    const trazeniScenarij = JSON.parse(fs.readFileSync(filePath));
    res.status(200).json(trazeniScenarij);
}) 

app.listen(3000);
