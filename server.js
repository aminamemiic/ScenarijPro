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

// treca ruta 
app.put("/api/scenarios/:scenarioId/lines/:lineId", (req, res) => {
    const scenarioID = req.params.scenarioId;
    const lineID = req.params.lineId;
    const userID = req.body.userId;
    const tekst = req.body.newText;

    if (tekst.length === 0) {
        return res.status(400).json({
            message: "Niz new_text ne smije biti prazan!"
        });
    }

    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioID}.json`);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    const scenarij = JSON.parse(fs.readFileSync(filePath));
    let indeks = -1;
    let sljedeca = -1;
    for (let i = 0; i < scenarij.content.length; i++) {
        if (scenarij.content[i].lineId == lineID) {
            indeks = i;
            sljedeca = scenarij.content[i].nextLineId;
        }
    }

    if (indeks === -1) {
        return res.status(404).json({
            message: "Linija ne postoji!"
        });
    }

    const key = `${scenarioID}-${lineID}`;

    if(!lineLocks[key]) {
        return res.status(409).json({
            message: "Linija nije zakljucana!" 
        });
    }

    if(lineLocks[key] != userID) {
        return res.status(409).json({
            message: "Linija je vec zakljucana!"
        });
    }
    
    // azuriranje podataka
    let maxLineId = 0;
    for (let line of scenarij.content) {
        if (parseInt(line.lineId) > maxLineId) {
            maxLineId = parseInt(line.lineId);
        }
    }
    let noveLinije = [];
    for (let lines of tekst) {
        lines = lines.split(/\s+/);
        for (let i = 0; i < lines.length; i++) {
            let linijaZaDodati = "";
            let j = 0
            while (j < 20 && i < lines.length) {
                linijaZaDodati += (lines[i]+" ");
                if (/[a-zA-Z]/.test(lines[i])) j++;
                i++;
            }
            noveLinije.push({
                lineId: (noveLinije.length == 0) ? parseInt(lineID) : ++maxLineId,
                nextLineId: null,
                text: linijaZaDodati
            });
        }
    }

    noveLinije[noveLinije.length-1].nextLineId = sljedeca;
    for (let i = 0; i < noveLinije.length-1; i++) {
        noveLinije[i].nextLineId = noveLinije[i+1].lineId;
    }

    scenarij.content[indeks] = noveLinije[0];

    for (let i = 1; i < noveLinije.length; i++) {
        scenarij.content.push({
            lineId: noveLinije[i].lineId,
            nextLineId: noveLinije[i].nextLineId,
            text: noveLinije[i].text.trim()
        });
    }

    const noviScenarij = {
        id: scenarij.id,
        title: scenarij.title,
        content: scenarij.content
    }
    fs.writeFileSync(filePath, JSON.stringify(noviScenarij, null, 2));

    // otkljucavanje linije
    delete lineLocks[key];
    delete userLocks[userID];

    // log
    const deltasPath = path.join(__dirname, "data", "deltas.json");
    let deltas = [];
    if (fs.existsSync(deltasPath)) {
        deltas = JSON.parse(fs.readFileSync(deltasPath));
    }

    const timestamp = Math.floor(Date.now() / 1000);

    for (let linija of noveLinije) {
        deltas.push({
            scenarioId: parseInt(scenarioID),
            type: "line_update",
            lineId: parseInt(linija.lineId),
            nextLineId: linija.nextLineId !== null ? parseInt(linija.nextLineId) : null,
            content: linija.text.trim(),
            timestamp: timestamp
        });
    }

    fs.writeFileSync(deltasPath, JSON.stringify(deltas, null, 2));

    res.status(200).json({
        message: "Linija je uspjesno azurirana!"
    });
});

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

// peta ruta 
app.post("/api/scenarios/:scenarioId/characters/update", (req, res) => {
    const scenarioID = req.params.scenarioId;
    const userID = req.body.userId;
    const staro = req.body.oldName;
    const novo = req.body.newName;

    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioID}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    const scenario = JSON.parse(fs.readFileSync(filePath));

    if (!characterLocks[staro]) {
        return res.status(409).json({
            message: "Ime lika nije zakljucano!"
        });
    }

    if (characterLocks[staro] !== userID) {
        return res.status(409).json({
            message: "Konflikt! Ime lika je vec zakljucano!"
        });
    }

    for (let line of scenario.content) {
        if (line.text.includes(staro)) {
            line.text = line.text.split(staro).join(novo);
        }
    }

    delete characterLocks[staro];

    const deltasPath = path.join(__dirname, "data", "deltas.json");
    let deltas = [];

    if (fs.existsSync(deltasPath)) {
        const raw = fs.readFileSync(deltasPath, "utf-8");
        deltas = raw.trim() ? JSON.parse(raw) : [];
    }

    deltas.push({
        scenarioId: parseInt(scenarioID),
        type: "char_rename",
        oldName: staro,
        newName: novo,
        timestamp: Math.floor(Date.now() / 1000)
    });

    fs.writeFileSync(deltasPath, JSON.stringify(deltas, null, 2));

    fs.writeFileSync(filePath, JSON.stringify(scenario, null, 2));

    res.status(200).json({
        message: "Ime lika je uspjesno promijenjeno!"
    });
});

// sesta ruta 
app.get("/api/scenarios/:scenarioId/deltas", (req, res) => {
    const scenarioID = req.params.scenarioId;
    const since = parseInt(req.query.since);
    
    const filePath = path.join(__dirname, "data", "scenarios", `scenario-${scenarioID}.json`);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    const deltasPath = path.join(__dirname, "data", "deltas.json");
    let deltas = [];
    if (fs.existsSync(deltasPath)) {
        deltas = JSON.parse(fs.readFileSync(deltasPath));
    }

    let retDeltas = [];
    let found = false;
    for (let delta of deltas) {
        if (delta.scenarioId == scenarioID && delta.timestamp > since) {
            found = true;
            if (delta.type == "line_update") {
                retDeltas.push({
                    type: "line_update",
                    lineId: delta.id,
                    nextLineId: delta.nextLineId,
                    content: delta.content,
                    timestamp: delta.timestamp
                });
            }
            else {
                retDeltas.push({
                    type: "char_rename",
                    oldName: delta.oldName,
                    newName: delta.newName,
                    timestamp: delta.timestamp
                });
            }
        }
    }

    if (!found) {
        return res.status(404).json({
            message: "Scenario ne postoji!"
        });
    }

    res.status(200).json({
        deltas: retDeltas
    });
});

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
