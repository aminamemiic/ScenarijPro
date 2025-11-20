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

function grupisiUloge() {
    let grupiranje = editor.grupisiUloge();
    let ispis = [];
    
    for (let uloga in grupiranje) {
        ispis.push(`${uloga}: ${grupiranje[uloga].brojLinija} linija`);
    }
    
    output.value = ispis.join('\n');
}

function formatiraj(komanda) {
    editor.formatirajTekst(komanda);
}