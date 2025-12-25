let div = document.getElementById("divEditor");
let editor = EditorTeksta(div);
let output = document.getElementById("output");

function dajBrojRijeci() {
    let rezultat = editor.dajBrojRijeci();
    output.value = `Ukupno riječi: ${rezultat.ukupno}\nBold riječi: ${rezultat.boldiranih}\nItalic riječi: ${rezultat.italic}`;
}

function dajUloge() {
    let uloge = editor.dajUloge();
    output.value = `Uloge u scenariju:\n${uloge.join('\n')}`;
}

function pogresnaUloga() {
    let pogresne = editor.pogresnaUloga();
    if (pogresne.length === 0) {
        output.value = "Nema pogrešnih uloga.";
    } else {
        output.value = `Pogrešne uloge:\n${pogresne.join('\n')}`;
    }
}

function dajSelektovaniTekst() {
    let selection = window.getSelection();
    if (selection.rangeCount > 0) {
        return selection.toString().trim();
    }
    return "";
}

function prikaziBrojLinija() {
    let selektovaniTekst = dajSelektovaniTekst();
    
    if (!selektovaniTekst) {
        output.value = "Molimo prvo selektujte (označite) ime uloge u editoru.";
        return;
    }
    
    let uloga = selektovaniTekst;
    let brojLinija = editor.brojLinijaTeksta(uloga);
    
    if (brojLinija === 0) {
        output.value = `Uloga "${uloga}" nije pronađena ili nema linija govora.`;
    } else {
        output.value = `Uloga: ${uloga}\nBroj linija govora: ${brojLinija}`;
    }
}

function prikaziScenarijUloge() {
    let selektovaniTekst = dajSelektovaniTekst();
    
    if (!selektovaniTekst) {
        output.value = "Molimo prvo selektujte (označite) ime uloge u editoru.";
        return;
    }
    
    let uloga = selektovaniTekst.toUpperCase();
    let scenarij = editor.scenarijUloge(uloga);
    
    if (scenarij.length === 0) {
        output.value = `Uloga "${uloga}" nije pronađena.`;
        return;
    }
    
    let ispis = `Scenarij uloge ${uloga}:\n\n`;
    
    for (let i = 0; i < scenarij.length; i++) {
        let stavka = scenarij[i];
        ispis += `--- Replika ${i + 1} ---\n`;
        ispis += `Scena: ${stavka.scena || '(nema naslova)'}\n`;
        ispis += `Pozicija: ${stavka.pozicijaUTekstu}\n`;
        
        if (stavka.prethodnaReplika) {
            ispis += `Prethodni: Uloga: ${stavka.prethodnaReplika.uloga}\n
                                Linije: ${stavka.prethodnaReplika.linije.join(' ')}\n`;
        } else {
            ispis += `Prethodni: (nema)\n`;
        }
        
        ispis += `Trenutni govor: ${stavka.trenutnaReplika.linije.join(' ')}\n`;
        
        if (stavka.sljedecaReplika) {
            ispis += `Sljedeći: Uloga: ${stavka.sljedecaReplika.uloga}\n
                                Linije: ${stavka.sljedecaReplika.linije.join(' ')}\n`;
        } else {
            ispis += `Sljedeći: (nema)\n`;
        }
        
        ispis += '\n';
    }
    
    output.value = ispis;
}

function prikaziGrupisaneUloge() {
    let grupiranje = editor.grupisiUloge();
    
    if (grupiranje.length === 0) {
        output.value = "Nema pronađenih dijalog-segmenata.";
        return;
    }
    
    let ispis = `Pronađeno ${grupiranje.length} dijalog-segment(a):\n\n`;
    
    for (let grupa of grupiranje) {
        ispis += `Scena: ${grupa.scena || '(bez naslova)'}\n`;
        ispis += `Segment: ${grupa.segment}\n`;
        ispis += `Uloge: ${grupa.uloge.join(', ')}\n\n`;
    }
    
    output.value = ispis;
}

function formatiraj(komanda) {
    editor.formatirajTekst(komanda);
}

// POVEZIVANJE SA BACKEND-OM 

let trenutniScenarioId = null;
let trenutniUserId = Math.floor(Math.random() * 10000); // Simulirani user ID
let posljednjiTimestamp = 0;
let trenutnoZakljucanaLinija = null;

// kreiranje novog scenarija
function initScenario() {
    const naslov = document.querySelector('.naslov').textContent;
    
    PoziviAjax.postScenario(naslov, (status, data) => {
        if (status === 200) {
            trenutniScenarioId = data.id;
            output.value = `Scenarij kreiran! ID: ${data.id}\nPočetna linija ID: 1`;
            document.getElementById('scenarioInfo').textContent = `Trenutno aktivan scenarij: Scenarij ID: ${data.id}`;
            
            setInterval(pollDeltas, 3000);
        } else {
            output.value = `Greška pri kreiranju scenarija: ${data.message || data.error}`;
        }
    });
}

// ucitavanje postojeceg scenarija
function ucitajScenario() {
    const scenarioId = document.getElementById('scenarioIdInput').value.trim();
    
    if (!scenarioId) {
        output.value = "Molimo unesite ID scenarija!";
        return;
    }
    
    PoziviAjax.getScenario(scenarioId, (status, data) => {
        if (status === 200) {
            trenutniScenarioId = data.id;
            document.querySelector('.naslov').textContent = data.title;
            document.getElementById('scenarioInfo').textContent = `Trenutno aktivan scenarij: Scenarij ID: ${data.id}`;
            
            // rekonstruisanje teksta
            let tekst = "";
            let prvaLinija = data.content.find(l => l.lineId === 1);
            let trenutna = prvaLinija;
            let linijeInfo = [];
            
            while (trenutna) {
                tekst += trenutna.text + "\n";
                linijeInfo.push(`Line ${trenutna.lineId}: ${trenutna.text.substring(0, 30)}...`);
                if (trenutna.nextLineId === null) break;
                trenutna = data.content.find(l => l.lineId === trenutna.nextLineId);
            }
            
            div.innerHTML = tekst.trim().replace(/\n/g, '<br>');
            output.value = `Scenarij učitan! ID: ${data.id}\n\nDostupne linije:\n${linijeInfo.join('\n')}`;
            
            posljednjiTimestamp = Math.floor(Date.now() / 1000);
        } else {
            output.value = `Greška: ${data.message || data.error}`;
        }
    });
}

// zakljucavanje linije
function zakljucajLiniju() {
    if (!trenutniScenarioId) {
        output.value = "Nema aktivnog scenarija. Prvo kreirajte ili učitajte scenarij.";
        return;
    }
    
    const lineId = document.getElementById('lineIdInput').value.trim();
    
    if (!lineId) {
        output.value = "Molimo unesite ID linije koju želite zaključati!";
        return;
    }
    
    PoziviAjax.lockLine(trenutniScenarioId, lineId, trenutniUserId, (status, data) => {
        if (status === 200) {
            trenutnoZakljucanaLinija = lineId;
            output.value = `Linija ${lineId} je uspješno zaključana!\nSada možete upisati novi tekst i kliknuti "Ažuriraj liniju".`;
            document.getElementById('lineIdInput').disabled = true;
            document.getElementById('zakljucajBtn').disabled = true;
            document.getElementById('azurirajBtn').disabled = false;
        } else if (status === 409) {
            output.value = `Linija ${lineId} je već zaključana od strane drugog korisnika!`;
        } else if (status === 404) {
            output.value = `Linija ${lineId} ne postoji u scenariju!`;
        } else {
            output.value = `Greška: ${data.message || data.error}`;
        }
    });
}

// azuriranje zakljucane linije
function azurirajLiniju() {
    if (!trenutniScenarioId || !trenutnoZakljucanaLinija) {
        output.value = "Prvo morate zaključati liniju!";
        return;
    }
    
    const noviTekst = document.getElementById('noviTekstInput').value.trim();
    
    if (!noviTekst) {
        output.value = "Molimo unesite novi tekst!";
        return;
    }
    
    // podijeli tekst na linije
    const linije = noviTekst.split('\n').filter(l => l.trim() !== '');
    
    PoziviAjax.updateLine(trenutniScenarioId, trenutnoZakljucanaLinija, trenutniUserId, linije, (status, data) => {
        if (status === 200) {
            output.value = `Linija ${trenutnoZakljucanaLinija} uspješno ažurirana!\nLinija je automatski otključana.`;
            
            document.getElementById('lineIdInput').value = '';
            document.getElementById('lineIdInput').disabled = false;
            document.getElementById('noviTekstInput').value = '';
            document.getElementById('zakljucajBtn').disabled = false;
            document.getElementById('azurirajBtn').disabled = true;
            trenutnoZakljucanaLinija = null;
            
            posljednjiTimestamp = Math.floor(Date.now() / 1000);
            
            ucitajScenario();
        } else if (status === 409) {
            output.value = `Greška: ${data.message}`;
        } else if (status === 400) {
            output.value = "Novi tekst ne smije biti prazan!";
        } else {
            output.value = `Greška: ${data.message || data.error}`;
        }
    });
}

// zakljucavanje karaktera
function zakljucajKarakter() {
    if (!trenutniScenarioId) {
        output.value = "Nema aktivnog scenarija.";
        return;
    }
    
    const staroIme = document.getElementById('staroImeInput').value.trim();
    
    if (!staroIme) {
        output.value = "Molimo unesite ime karaktera!";
        return;
    }
    
    PoziviAjax.lockCharacter(trenutniScenarioId, staroIme, trenutniUserId, (status, data) => {
        if (status === 200) {
            output.value = `Karakter "${staroIme}" je uspješno zaključan!\nSada unesite novo ime i kliknite "Preimenuj".`;
            document.getElementById('staroImeInput').disabled = true;
            document.getElementById('zakljucajKarakterBtn').disabled = true;
            document.getElementById('preimenujBtn').disabled = false;
        } else if (status === 409) {
            output.value = `Karakter "${staroIme}" je već zaključan!`;
        } else if (status === 404) {
            output.value = "Scenarij ne postoji!";
        } else {
            output.value = `Greška: ${data.message || data.error}`;
        }
    });
}

// preimenovanje karaktera
function preimenujKarakter() {
    if (!trenutniScenarioId) {
        output.value = "Nema aktivnog scenarija.";
        return;
    }
    
    const staroIme = document.getElementById('staroImeInput').value.trim();
    const novoIme = document.getElementById('novoImeInput').value.trim();
    
    if (!staroIme || !novoIme) {
        output.value = "Molimo unesite oba imena!";
        return;
    }
    
    PoziviAjax.updateCharacter(trenutniScenarioId, trenutniUserId, staroIme, novoIme, (status, data) => {
        if (status === 200) {
            output.value = `Karakter "${staroIme}" uspješno preimenovan u "${novoIme}"!`;
            
            document.getElementById('staroImeInput').value = '';
            document.getElementById('staroImeInput').disabled = false;
            document.getElementById('novoImeInput').value = '';
            document.getElementById('zakljucajKarakterBtn').disabled = false;
            document.getElementById('preimenujBtn').disabled = true;
            
            posljednjiTimestamp = Math.floor(Date.now() / 1000);
            
            ucitajScenario();
        } else if (status === 409) {
            output.value = `Greška: ${data.message}`;
        } else {
            output.value = `Greška: ${data.message || data.error}`;
        }
    });
}

// deltas logovi
function pollDeltas() {
    if (!trenutniScenarioId) return;
    
    PoziviAjax.getDeltas(trenutniScenarioId, posljednjiTimestamp, (status, data) => {
        if (status === 200 && data.deltas && data.deltas.length > 0) {
            console.log("Primljene nove izmjene:", data.deltas);
            
            let poruka = "NOVE IZMJENE:\n";
            data.deltas.forEach(delta => {
                if (delta.type === "char_rename") {
                    poruka += `- Karakter preimenovan: ${delta.oldName} → ${delta.newName}\n`;
                } else if (delta.type === "line_update") {
                    poruka += `- Linija ${delta.lineId} ažurirana\n`;
                }
                
                posljednjiTimestamp = Math.max(posljednjiTimestamp, delta.timestamp);
            });
            
            output.value = poruka + "\nOsvježite scenarij da vidite izmjene.";
        }
    });
}