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
    let ekstraktujTekst = function(node, formatiranje) {
    //node je trenutni cvor u dom stablu, formatiranje je objekat koji prati trenutno stanje formatiranja
    //vraca niz objekata gdje je svaki objekat rijec sa informacijom o formatiranju

        let rijeci = [];

        if (node.nodeType === Node.TEXT_NODE) {
        //TEXT_NODE je cisti tekst bez tagova
            let tekst = node.textContent;  //uzima cisti tekst bez tagova
            let dijelovi = tekst.split(/[\s,.]+/);  //dijeljenje teksta: \s bilo koji whitespace , zarez . tacka + jedan ili vise takvih znakova zaredom

            for(let dio of dijelovi) {
                dio = dio.trim(); //uklanja razmake sa pocetka i kraja stringa

                if (dio && /[a-zA-Z]/.test(dio)) { //provjera je li string prazan i regex da li sadrzi barem jedno slovo, test vraca true ako se pronadje barem jedno slovo
                    rijeci.push({
                        tekst: dio,
                        bold: formatiranje.bold,
                        italic: formatiranje.italic
                    }); //kreira se objekat sa rijecju i trenutnim stanjem bold i italic
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
        //ELEMENT_NODE je html element, u ovom slucaju <b> i <i>
            let novoFormatiranje = { ...formatiranje }; //... pravi plitku kopiju

            if (node.tagName === 'B' || node.tagName === 'STRONG') { //<b> i <strong> bold tagovi
                novoFormatiranje.bold = true; //postavlja bold flag u novom formatiranju na true
            }
            if (node.tagName === 'I' || node.tagName === 'EM') { //<i> i <em> italik tagovi
                novoFormatiranje.italic = true; //postavlja italik flag u novom formatiranju na true
            }

            for (let child of node.childNodes) {
                rijeci = rijeci.concat(ekstraktujTekst(child, novoFormatiranje));
                //childNodes je kolekcija sve djece trenutnog elementa i za svako dijete se poziva ista funkcija
                //concat spaja sve nizove objekata
            }
        }

        return rijeci;
    }

    let provjeriCijeluRijec = function(node, rijec) {
        let tekst = node.textContent;
        return tekst.includes(rijec);
    };

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
        let linije = editor.innerText.split('\n');
        let uloge = new Set();

        for (let i = 0; i < linije.length - 1; i++) {
            if(/^[A-Z]+$/.test(linije[i].trim()) && linije[i+1].trim() != '') {
                uloge.add(linije[i].trim());
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
            if (s1.length !== s2.length) {
                return Infinity; 
            }
            
            let razlike = 0;
            for (let i = 0; i < s1.length; i++) {
                if (s1[i] !== s2[i]) {
                    razlike++;
                }
            }
            return razlike;
        };

        let suVrloSlicna = function(ime1, ime2) {
            if (ime1 === ime2) return false; 
            
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
                    if (linije[j].trim().charAt(0) != '(') brojLinija++;
                }
            }
        }

        return brojLinija;
    }

    let scenarijUloge =function(uloga) {

    }

    let grupisiUloge = function() {

    }

    let formatirajTekst = function(komanda) {
        document.execCommand(komanda, false, null);
        editor.focus();
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