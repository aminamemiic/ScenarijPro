let EditorTeksta = function(divRef) {
    //validacija
    if (!divRef || divRef.tagName !== "DIV") {
        throw new Error("Pogresan tip elementa!");
    }

    if (!divRef.hasAttribute("contenteditable") || divRef.getAttribute("contenteditable") !== 'true') {
        throw new Error("Neispravan DIV, ne posjeduje contenteditable atribut!");
    }

    //privatni atributi
    let editor = divRef;

    //pomocne metode
    let ekstraktujTekst = function(node, formatiranje, state) {
        if (!state) {
            state = {
                cur: "",
                curBold: true,   
                curItalic: true, 
                words: []
            };
        }

        if (node.nodeType === Node.TEXT_NODE) {
            const tekst = node.textContent;
            for (let ch of tekst) {

                if (/\s|[.,]/.test(ch)) {
                    if (state.cur.length > 0 && /[A-Za-z]/.test(state.cur)) {
                        state.words.push({
                            tekst: state.cur,
                            bold: state.curBold,
                            italic: state.curItalic
                        });
                    }
                    state.cur = "";
                    state.curBold = true;
                    state.curItalic = true;
                    continue;
                }

                state.cur += ch;

                // karakter pripada boldu samo ako čitav token ima bold
                if (!formatiranje.bold) state.curBold = false;
                if (!formatiranje.italic) state.curItalic = false;
            }

        } else if (node.nodeType === Node.ELEMENT_NODE) {
            let novo = { ...formatiranje };

            const tag = node.tagName.toUpperCase();
            if (tag === "B" || tag === "STRONG") novo.bold = true;
            if (tag === "I" || tag === "EM") novo.italic = true;

            for (let child of node.childNodes) {
                ekstraktujTekst(child, novo, state);
            }
        }

        if (!arguments[2]) {
            if (state.cur.length > 0 && /[A-Za-z]/.test(state.cur)) {
                state.words.push({
                    tekst: state.cur,
                    bold: state.curBold,
                    italic: state.curItalic
                });
            }
            return state.words;
        }

        return state;
    };


    let jeLiNaslov = function(naslov) {
        let linija = naslov.trim();
        
        // da li je prazna linija
        if (linija.length === 0) {
            return false;
        }
        
        // da li je napisano velikim slovima
        if (linija !== linija.toUpperCase()) {
            return false;
        }
        
        // da li počinje sa INT. ili EXT.
        if (!linija.startsWith("INT.") && !linija.startsWith("EXT.")) {
            return false;
        }
        
        // da li sadrži " - "
        if (!linija.includes(" - ")) {
            return false;
        }
        
        // da li završava sa jednim od vremena
        if (linija.endsWith(" DAY") || linija.endsWith(" NIGHT") || 
            linija.endsWith(" AFTERNOON") || linija.endsWith(" MORNING") || 
            linija.endsWith(" EVENING")) {
            return true;
        }
        
        return false;
    }

    let jeLiAkcijskiSegment = function(linija) {
        // da li je prazna linija
        if (linija === "") {
            return false;
        }

        // da li je napisana velikim slovima 
        if (linija === linija.toUpperCase()) {
            return false;
        }

        // da li je naslov scene
        if (jeLiNaslov(linija)) {
            return false;
        }

        if (/[a-z]/.test(linija)) {
            return false;
        }

        // da li je linija u zagradama 
        if (linija.startsWith("(") && linija.endsWith(")")) {
            return false;
        }

        return true;
    }

    //implementacija metoda
    let dajBrojRijeci = function() {
        let rijeci = ekstraktujTekst(editor, { bold: false, italic: false });
        
        let ukupno = rijeci.length;
        let boldiranih = 0;
        let italic = 0;
        
        for (let rijec of rijeci) {
            if (rijec.bold) {
                boldiranih++;
            }
            if (rijec.italic) {
                italic++;
            }
        }
        
        return {
            ukupno: ukupno,
            boldiranih: boldiranih,
            italic: italic
        };
    };

    let dajUloge = function() {
        const _tekstEditor = divRef.innerText || divRef.textContent;
        const redovi = _tekstEditor.trim().split('\n');
        let uloge = new Set();

        for (let i = 0; i < redovi.length - 1; i++) {
            if(/^[A-Z\s]+$/.test(redovi[i].trim()) && redovi[i+1].trim() != '') {
                if (redovi[i+1].trim().startsWith('(') && i + 2 < redovi.length && redovi[i+2].trim() == '') {
                    continue;
                }
                uloge.add(redovi[i].trim());
            }
        }

        return Array.from(uloge);
    }

    let pogresnaUloga = function() {
        let linije = editor.innerText.split('\n');
        let sveUloge = [];

        for (let i = 0; i < linije.length; i++) {
            if(/^[A-Z]+$/.test(linije[i].trim()) && linije[i].length > 0 && /[A-Z]/.test(linije[i].trim())) {
                if (i + 1 < linije.length) {
                    let sljedecaLinija = linije[i + 1].trim();
                    if (sljedecaLinija != '' || !sljedecaLinija.startsWith('(')) {
                        sveUloge.push(linije[i].trim());
                    }
                }
            }
        }

        let brojacUloga = {};
        for (let uloga of sveUloge) {
            if (brojacUloga[uloga]) {
                brojacUloga[uloga]++;
            } else {
                brojacUloga[uloga] = 1;
            }
        }

        let brojRazlika = function(s1, s2) {
            let razlike = 0;
            for (let i = 0; i < s1.length; i++) {
                if (s1[i] !== s2[i]) {
                    razlike++;
                }
            }
            return razlike;
        };

        let suVrloSlicna = function(ime1, ime2) {
            let razlika = brojRazlika(ime1, ime2);
            
            if (ime1.length > 5 && ime2.length > 5) {
                return razlika <= 2;
            }
            
            return razlika <= 1;
        };

        let pogresneUloge = new Set();

        for (let imeA in brojacUloga) {
            let brojanjeA = brojacUloga[imeA];
            
            for (let imeB in brojacUloga) {
                if (imeA === imeB) continue;
                
                let brojanjeB = brojacUloga[imeB];
                
                if (suVrloSlicna(imeA, imeB)) {
                    if (brojanjeB >= 4 && (brojanjeB - brojanjeA) >= 3) {
                        pogresneUloge.add(imeA);
                    }
                }
            }
        }

        return Array.from(pogresneUloge);
    }

    let brojLinijaTeksta = function(uloga) {
        let linije = editor.innerText.split('\n');
        let brojLinija = 0;

        for (let i = 0; i < linije.length - 1; i++) {
            if (linije[i].trim() === uloga && linije[i + 1].trim() !== '') {
                for (let j = i + 1; j < linije.length; j++) {
                    if (linije[j].trim() === '') break;
                    if (linije[j].trim().charAt(0) == '(' && linije[j].endsWith(')')) continue;
                    brojLinija++;
                }
            }
        }

        return brojLinija;
    }

    let scenarijUloge =function(uloga) {
        uloga = uloga.toUpperCase();
        let rezultat = [];
        let linije = editor.innerText.split('\n');

        let trenutnaScena = "";
        let pozicijaUReplici = 0;

        let replike = [];

        let i = 0;
        while (i < linije.length) {
            let linija = linije[i].trim();

            if (jeLiNaslov(linija)) {
                trenutnaScena = linija;
                pozicijaUReplici = 0;
                i++;
                continue;
            }

            if (/^[A-Z\s]+$/.test(linija) && linija.length > 0 && /[A-Z]/.test(linija)) {
                let imeUloge = linija;
                let linijeGovora = [];
                let j = i + 1;

                while (j < linije.length) {
                    let govornaLinija = linije[j].trim();

                    //prazna linija
                    if (govornaLinija === "") {
                        break;
                    }

                    //nova uloga
                    if (/^[A-Z\s]+$/.test(govornaLinija) && govornaLinija.length > 0 && /[A-Z]/.test(govornaLinija)) {
                        break;
                    }

                    //naslov scene 
                    if (jeLiNaslov(govornaLinija)) {
                        break;
                    }

                    //liinije u zagradama preskacemo
                    if (govornaLinija.startsWith("(") && govornaLinija.endsWith(")")) {
                        j++;
                        continue;
                    }

                    linijeGovora.push(govornaLinija);
                    j++;
                }

                //ako ima linija govora onda je validna replika
                if (linijeGovora.length > 0) {
                    pozicijaUReplici++;
                    
                    replike.push({
                        uloga: imeUloge,
                        linije: linijeGovora,
                        scena: trenutnaScena,
                        pozicija: pozicijaUReplici
                    });
                }

                i = j;
                continue;
            }

            i++;
        }

        //prolazimo kroz replike i trazimo one koje odgovaraju zadatoj ulozi
        for (let i = 0; i < replike.length; i++) {
            let trenutnaReplika = replike[i];

            if (trenutnaReplika.uloga === uloga) {
                let prethodnaReplika = null;
                let sljedecaReplika = null;

                //trazimo prethodnu repliku
                if (i > 0) {
                    let kandidat = replike[i - 1];

                    if (kandidat.scena === trenutnaReplika.scena) {
                        if (kandidat.pozicija === trenutnaReplika.pozicija - 1) {
                            prethodnaReplika = {
                                uloga: kandidat.uloga,
                                linije: kandidat.linije
                            };
                        }
                    }
                }

                //trazimo sljedecu repliku
                if (i < replike.length - 1) {
                    let kandidat = replike[i + 1];

                    if (kandidat.scena === trenutnaReplika.scena) {
                        if (kandidat.pozicija === trenutnaReplika.pozicija + 1) {
                            sljedecaReplika = {
                                uloga: kandidat.uloga,
                                linije: kandidat.linije
                            };
                        }
                    }
                }

                rezultat.push({
                    scena: trenutnaReplika.scena,
                    pozicijaUTekstu: trenutnaReplika.pozicija,
                    prethodni: prethodnaReplika,
                    trenutni: {
                        uloga: trenutnaReplika.uloga,
                        linije: trenutnaReplika.linije
                    },
                    sljedeci: sljedecaReplika
                });
            }
        }
        return rezultat;
    }

    let grupisiUloge = function() {
        let linije = editor.innerText.split('\n');
        let rezultat = [];

        let trenutnaScena = "";
        let segmentUSceni = 0;
        let uloge = new Set();
        let uDijalogu = false;

        let sacuvajSegment = function() {
            if (trenutnaScena !== "" && uloge.size > 0) {
                rezultat.push({
                    scena: trenutnaScena,
                    segment: segmentUSceni,
                    uloge: Array.from(uloge)
                });
            }
            uloge.clear();
        }

        let i = 0;
        while (i < linije.length) {
            let linija = linije[i].trim();

            if (jeLiNaslov(linija)) {
                sacuvajSegment();

                trenutnaScena = linija;
                segmentUSceni = 0;
                uDijalogu = false;
                i++;
                continue;
            }

            // Provjeri je li akcijski segment
            if (linija !== "" && !jeLiNaslov(linija) && !linija.startsWith("(")  && /^[A-Za-z\s]+$/.test(linija) && i < linije.length && linije[i+1] === "") { 
                if (uDijalogu) {
                    sacuvajSegment();
                    uDijalogu = false;
                }

                i++;
                continue;
            }

            if (/^[A-Z\s]+$/.test(linija) && linija.length > 0 && /[A-Z]/.test(linija)) {
                let imeUloge = linija;

                let validanGovor = false;
                let j = i + 1;
                while (j < linije.length) {
                    let govornaLinija = linije[j].trim();

                    //prazna linija
                    if (govornaLinija === "") {
                        break;
                    }

                    // nova uloga
                    if (/^[A-Z\s]+$/.test(govornaLinija) && govornaLinija.length > 0 && /[A-Z]/.test(govornaLinija)) {  
                        break;
                    }

                    // naslov scene 
                    if (jeLiNaslov(govornaLinija)) {
                        break;
                    }

                    // akcijski segment
                    if (jeLiAkcijskiSegment(govornaLinija)) {
                        break;
                    }

                    // linija u zagradama 
                    if (govornaLinija.startsWith("(") && govornaLinija.endsWith(")")) {
                        j++;
                        continue;
                    }

                    validanGovor = true;
                    j++;
                }

                //dodajemo ulogu ako ima validnu repliku
                if (validanGovor) {
                    if (!uDijalogu) {
                        segmentUSceni++;
                        uDijalogu = true;
                    }
                    uloge.add(imeUloge);
                }

                i = j;
                continue; 
            }

            if (linija === "") {
                i++;
                continue;
            }

            i++;
        }
        sacuvajSegment();

        return rezultat;
    }

    let formatirajTekst = function(komanda) {
        const validneKomande = ['bold', 'italic', 'underline'];
    
        // Provjeri da li je komanda validna
        if (!validneKomande.includes(komanda)) {
            return false;
        }
        
        // Provjeri da li postoji selekcija
        let selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return false;
        }
        
        try {
            let success = document.execCommand(komanda, false, null);
            if (success) {
                editor.focus();
            }
            return success;
        } catch (error) {
            return false;
        }
    }

    //povratne vrijednosti
    return {
        dajBrojRijeci: dajBrojRijeci,
        dajUloge: dajUloge,
        pogresnaUloga: pogresnaUloga,
        brojLinijaTeksta: brojLinijaTeksta,
        scenarijUloge: scenarijUloge,
        grupisiUloge: grupisiUloge,
        formatirajTekst: formatirajTekst
    }
};