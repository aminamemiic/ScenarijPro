# ScenarijPro

Web aplikacija za **kolaborativno uređivanje scenarija**, razvijena kao projekat za predmet Web Tehnologije. Više korisnika može istovremeno čitati i uređivati scenarij, uz lock sistem koji sprječava konflikt izmjena.

---

## Funkcionalnosti

- **Čitanje scenarija** — pregled sadržaja scenarija po linijama
- **Uređivanje scenarija** — izmjena linija scenarija u realnom vremenu
- **Lock sistem** — zaključavanje linija i imena likova tokom uređivanja kako drugi korisnici ne bi mogli istovremeno mijenjati isti element
- **Kolaborativni rad** — više korisnika može raditi na scenariju u isto vrijeme

---

## Tehnologije

### Frontend
- **HTML5** — struktura stranica
- **CSS3** — stilizacija i dizajn
- **JavaScript** — komunikacija s API-jem i upravljanje UI-jem

### Backend
- **Node.js** — server i REST API
- **npm** — upravljanje paketima

---

## Pokretanje projekta

### Preduvjeti

- Node.js
- npm

### Instalacija i pokretanje

1. Kloniraj repozitorij:
   ```bash
   git clone https://github.com/aminamemiic/ScenarijPro.git
   cd ScenarijPro
   ```

2. Instaliraj zavisnosti:
   ```bash
   npm install
   ```

3. Pokreni server:
   ```bash
   node server.js
   ```

4. Otvori aplikaciju u browseru:
   ```
   http://localhost:3000
   ```

---
