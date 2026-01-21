const express = require("express");
const app = express();

app.use(express.json());

const path = require("path");

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'writing.html'));
});

app.get('/writing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'html', 'writing.html'));
});

const { Checkpoint, Scenario, Delta, Line } = require("./js/models");
const { QueryTypes } = require("sequelize");
const sequelize = require("./js/sequelize");

// ključ: "scenarioId-lineId" → vrijednost: userId
// npr linelocks["1-3"] === 5, znaci da je userId 5 zakljucao linijaId 3 u scenarioId 1
const lineLocks = {};

// ključ: userId → vrijednost: "scenarioId-lineId"
const userLocks = {};

// ključ: "characterName" → vrijednost: userId
const characterLocks = {};


// prva ruta
app.post("/api/scenarios", async (req, res) => {
    try {
        let title = req.body.title;
        if (!title || title.trim() === "") {
            title = "Neimenovani scenarij";
        }

        const scenario = await Scenario.create({ title });

        await Line.create({
            scenarioId: scenario.id,
            lineId: 1,
            text: "",
            nextLineId: null
        });

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: [{
                lineId: 1,
                text: "",
                nextLineId: null
            }]
        });
    } catch (err) {
        res.status(500).json({ message: "Greška pri kreiranju scenarija!" });
    }
});

// druga ruta
app.post("/api/scenarios/:scenarioId/lines/:lineId/lock", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);
        const lineID = parseInt(req.params.lineId);
        const userID = parseInt(req.body.userId);

        const scenario = await Scenario.findByPk(scenarioID);

        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const key = `${scenarioID}-${lineID}`;
        if (lineLocks[key]) {
            return res.status(409).json({
                message: "Linija je vec zakljucana!"
            });
        }

        const linija = await sequelize.query('SELECT * FROM `Line` WHERE lineId = ? AND scenarioId = ?', {
            replacements: [lineID, scenarioID],
            type: QueryTypes.SELECT
        });

        if (linija.length === 0) {
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
    } catch (error) {
        console.error("Greska pri zakljucavanju linije:", error);
        res.status(500).json({
            message: "Greska pri zakljucavanju linije!"
        });
    }
});

// treca ruta 
app.put("/api/scenarios/:scenarioId/lines/:lineId", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);
        const lineID = parseInt(req.params.lineId);
        const userID = parseInt(req.body.userId);
        const tekst = req.body.newText;

        if (tekst.length === 0) {
            return res.status(400).json({
                message: "Niz new_text ne smije biti prazan!"
            });
        }

        const scenario = await Scenario.findByPk(scenarioID);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const linija = await Line.findOne({
            where: { 
                scenarioId: scenarioID, 
                lineId: lineID 
            }
        });

        if (!linija) {
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

        const sljedeca = linija.nextLineId;
        
        // azuriranje podataka
        const maxResult = await Line.max("lineId", {
            where: { scenarioId: scenarioID }
        });
        let maxLineId = maxResult || 0;

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

        // upis u bazu
        await Line.update(
            {
                text: noveLinije[0].text,
                nextLineId: noveLinije[0].nextLineId
            },
            {
                where: { scenarioId: scenarioID, lineId: lineID }
            }
        );

        for (let i = 1; i < noveLinije.length; i++) {
            await Line.create({
                scenarioId: scenarioID,
                lineId: noveLinije[i].lineId,
                nextLineId: noveLinije[i].nextLineId,
                text: noveLinije[i].text
            });
        }

        // otkljucavanje linije
        delete lineLocks[key];
        delete userLocks[userID];

        // log
        const timestamp = Math.floor(Date.now() / 1000);
        await Delta.create({
            scenarioId: scenarioID,
            type: "line_update",
            lineId: noveLinije[0].lineId,
            nextLineId: noveLinije[0].nextLineId,
            content: noveLinije[0].text,
            timestamp: timestamp
        });

        res.status(200).json({
            message: "Linija je uspjesno azurirana!"
        });
    } catch (error) {
        console.error("Greska pri azuriranju linije:", error);
        res.status(500).json({
            message: "Greska pri asuriranju linije!"
        });
    }
});

// cetvrta ruta 
app.post("/api/scenarios/:scenarioId/characters/lock", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);
        const userID = parseInt(req.body.userId);
        const character = req.body.characterName;

        if (characterLocks[character]) {
            return res.status(409).json({
                message: "Konflikt! Ime lika je vec zakljucano!"
            });
        }

        const scenario = await Scenario.findByPk(scenarioID);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const linije = await Line.findAll({
            where: {
                scenarioId: scenarioID
            }
        });

        let karakterPostoji = false;
        for (let line of linije) {
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

        characterLocks[character] = userID;
        res.status(200).json({
            message: "Ime lika je uspjesno zakljucano!"
        });
    } catch (error) {
        console.error("Greska pri zakljucavanju imena lika:", error);
        res.status(500).json({
            message: "Greska pri zakljucavanju imena lika!"
        });
    }
});

// peta ruta 
app.post("/api/scenarios/:scenarioId/characters/update", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);
        const userID = parseInt(req.body.userId);
        const staro = req.body.oldName;
        const novo = req.body.newName;

        const scenario = await Scenario.findByPk(scenarioID);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

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

        const linije = await Line.findAll({
            where: {
                scenarioId: scenarioID
            }
        });

        for (let line of linije) {
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

        for (let line of linije) {
            if (line.text.includes(staro)) {
                line.text = line.text.split(staro).join(novo);
                await line.save();
            }
        }

        delete characterLocks[staro];

        // log 
        const timestamp = Math.floor(Date.now() / 1000);
        await Delta.create({
            scenarioId: parseInt(scenarioID),
            type: "char_rename",
            userId: userID,
            oldName: staro,
            newName: novo,
            timestamp: timestamp
        });

        res.status(200).json({
            message: "Ime lika je uspjesno promijenjeno!"
        });
    } catch (error) {
        console.error("Greska pri azuriranju imena lika:", error);
        res.status(500).json({
            message: "Greska pri azuriranju imena lika!"
        });
    }
});

// sesta ruta 
app.get("/api/scenarios/:scenarioId/deltas", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);
        const since = parseInt(req.query.since);
        
        const scenario = await Scenario.findByPk(scenarioID);
        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const deltas = await Delta.findAll({
            where: {
                scenarioId: scenarioID
            }
        });

        let retDeltas = [];
        for (let delta of deltas) {
            if (delta.scenarioId == scenarioID && delta.timestamp > since) {
                if (delta.type == "line_update") {
                    retDeltas.push({
                        type: "line_update",
                        lineId: delta.lineId,
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

        retDeltas.sort((a, b) => a.timestamp - b.timestamp);

        res.status(200).json({
            deltas: retDeltas
        });
    } catch (error) {
        console.error("Greska pri dohvacanju delti:", error);
        res.status(500).json({
            message: "Greska pri dohvacanju delti!"
        });
    }
});

// sedma ruta
app.get("/api/scenarios/:scenarioId", async (req, res) => {
    try {
        const scenarioID = parseInt(req.params.scenarioId);

        const scenario = await Scenario.findByPk(scenarioID, {
            include: [{ model: Line }]
        });

        if (!scenario) {
            return res.status(404).json({
                message: "Scenario ne postoji!"
            });
        }

        const content = scenario.Lines.map(line => ({
            lineId: line.lineId,
            nextLineId: line.nextLineId,
            text: line.text
        }));

        res.status(200).json({
            id: scenario.id,
            title: scenario.title,
            content: content
        });
    } catch (error) {
        console.error("Greska pri dohvacanju scenarija:", error);
        res.status(500).json({
            message: "Greska pri dohvacanju scenarija!"
        });
    }
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
