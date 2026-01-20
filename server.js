const express = require("express");
const app = express();

app.use(express.json());

const fs = require("fs");
const path = require("path");

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'writing.html'));
});

app.get('/writing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'writing.html'));
});

const { Checkpoint, Scenario, Delta, Line } = require("/js/models");
const { QueryTypes } = require("sequelize");

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
    let maxID = 0;
    
    for (let file of files) {
        if (file.startsWith("scenario-") && file.endsWith(".json")) {
            const idMatch = file.match(/scenario-(\d+)\.json/);
            if (idMatch) {
                const fileID = parseInt(idMatch[1]);
                if (fileID > maxID) {
                    maxID = fileID;
                }
            }
        }
    }
    
    const ID = maxID + 1;

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
                text: linijaZaDodati.trim()
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

        deltas.push({
            scenarioId: parseInt(scenarioID),
            type: "line_update",
            lineId: parseInt(noveLinije[0].lineId),
            nextLineId: noveLinije[0].nextLineId !== null ? parseInt(noveLinije[0].nextLineId) : null,
            content: noveLinije[0].text.trim(),
            timestamp: timestamp
        });

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

    const scenario = JSON.parse(fs.readFileSync(filePath));
    let karakterPostoji = false;
    for (let line of scenario.content) {
        if (line.text.includes(character)) {
            karakterPostoji = true;
            break;
        }
    }
    
    if (!karakterPostoji) {
        return res.status(404).json({
            message: "Ime lika ne postoji u scenariju!"
        });
    }

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
            const key = `${scenarioID}-${line.lineId}`;
            
            if (lineLocks[key]) {
                if (lineLocks[key] !== userID) {
                    return res.status(409).json({
                        message: "Konflikt! Linija koja sadrzi ime lika je zakljucana od strane drugog korisnika!"
                    });
                }
            }
        }
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
        userId: userID,
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

    retDeltas.sort((a, b) => a.timestamp - b.timestamp);

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
}); 

// 4. spirala
// prva ruta
app.post("/api/scenarios/:scenarioId/checkpoint", async (req, res) => {
    try {
        const scenarioId = parseInt(req.params.scenarioId);

        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const timestamp = Math.floor(Date.now() / 1000);

        await Checkpoint.create({
            scenarioId: scenarioId,
            timestamp: timestamp,
            userId: req.body.userId
        });

        res.status(200).json({
            message: "Checkpoint je uspjesno kreiran!"
        });
    } catch (error) {
        console.error("Greska pri kreiranju checkpointa:", error);
        res.status(500).json({
            message: "Greska pri kreiranju checkpointa!"
        });
    }
});

// druga ruta
app.get("/api/scenarios/:scenarioId/checkpoints", async (req, res) => {
    try {
        const scenarioId = parseInt(req.params.scenarioId);

        const scenario = await Scenario.findByPk(scenarioId);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const checkpoints = await Checkpoint.findAll({
            where: { scenarioId },
            attributes: ["id", "timestamp"]
        });

        res.status(200).json(checkpoints);
    } catch (error) {
        console.error("Greska pri citanju checkpointa:", error);
        res.status(500).json({
            message: "Greska pri citanju checkpointa!"
        });
    }    
});

// treca ruta
app.get("/api/scenarios/:scenarioId/restore/:checkpointId", async (req, res) => {
    try {
        const scenarioId = parseInt(req.params.scenarioId);
        const checkpointId = parseInt(req.params.checkpointId);

        const scenario = await Scenario.findByPk(scenarioId, {
            include: [{model: Line}]
        });
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const checkpoint = await Checkpoint.findByPk(checkpointId);
        if (!checkpoint || checkpoint.scenarioId != scenarioId) {
            return res.status(404).json({
                message: "Checkpoint ne postoji!"
            });
        }

        const timestamp = checkpoint.timestamp;

        const deltas = await sequelize.query('SELECT * FROM `Delta` WHERE timestamp <= ? ORDER BY timestamp ASC', {
            replacements: [timestamp],
            type: QueryTypes.SELECT
        });

        const restoredLines = scenario.Lines.map(line => ({
            lineId: line.lineId,
            nextLineId: line.nextLineId,
            text: line.text
        }));

        for (let delta of deltas) {
            if (delta.type === "line_update") {
                const indeks = restoredLines.findIndex(l => l.lineId === delta.lineId); 
                if (indeks !== -1) {
                    restoredLines[indeks].text = delta.content;
                    restoredLines[indeks].nextLineId = delta.nextLineId;
                }
                else {
                    restoredLines.push({
                        lineId: delta.lineId,
                        nextLineId: delta.nextLineId,
                        text: delta.content
                    });
                }
            } else if (delta.type === "char_rename") {
                for (let line of restoredLines) {
                    if (line.text.includes(delta.oldName)) {
                        line.text = line.text.split(delta.oldName).join(delta.newName);
                    }
                }
            }
        }

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: restoredLines
        });
    } catch (error) {
        console.error("Greska pri citanju checkpointa:", error);
        res.status(500).json({
            message: "Greska pri citanju checkpointa!"
        });
    } 
});

module.exports = app;

const sequelize = require("./js/sequelize");
require("./js/models");

(async () => {
    try {
        await sequelize.authenticate();
        console.log("Konekcija sa bazom uspješna");

        await sequelize.sync({ force: true });
        console.log("Tabele su kreirane");

        app.listen(3000, () => {
            console.log("Server pokrenut na portu 3000");
        });
    } catch (err) {
        console.error("Greška pri pokretanju servera:", err);
    }
})();

app.listen(3000);
