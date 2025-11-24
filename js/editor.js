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