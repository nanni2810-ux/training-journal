# Training Journal v0.1.7 — PWA iPad/iPhone

Prima versione del diario personale per un singolo atleta **Pesistica + CrossFit**.

## Funzioni presenti

- profilo personale con nome, data di nascita e sesso
- calendario mensile
- allenamenti programmati e lavoro svolto separati
- sezioni attivabili: Warm-up, Tabata, Skill, Forza, Pesistica, Metcon, WOD, Core/Accessory, Cooldown, Personalizzata
- modelli rapidi Hybrid / CrossFit, HYROX, Weightlifting e Metabolic / Running
- importazione di un allenamento completo da messaggio/testo con riconoscimento automatico di data, titolo e sezioni
- ricerca libera dei movimenti con sinonimi (Snatch=Strappo, Deadlift=Stacco, Clean=Girata, Clean & Jerk=Slancio)
- libreria WOD incorporata (1.010 WOD) proveniente da Weightlifting Coach / Hybrid-Hyrox
- riconoscimento automatico dei WOD importati rispetto alla libreria, con classificazione Open, Hero, Girl/Benchmark quando disponibile
- importazione di un WOD nella seduta e modifica libera della copia
- libreria personale dei WOD creati dall'atleta
- registrazione svolto: carichi, serie, ripetizioni, tentativi, score WOD, Rx/Scaled, note
- proposta automatica di nuovo PR da un lavoro di forza/pesistica
- massimali liberi 1RM, 2RM, 3RM, ecc.
- peso corporeo con grafico
- gare di pesistica semplici
- gare CrossFit con più eventi, score e piazzamenti
- countdown prossima gara in Home
- condivisione del programmato o dello svolto tramite Share Sheet / WhatsApp
- backup e ripristino JSON
- dati in IndexedDB
- service worker e funzionamento offline
- struttura dati già predisposta per futura sincronizzazione con Weightlifting Coach via Firebase
- modulo **Extra adattivo** con priorità, focus, versione principale/ridotta, regole di Skip, scelta atleta e analisi automatica della classe
- importazione di pacchetti settimanali di Extra adattivi da file JSON
- registrazione di campi test specifici per ogni Extra importato

## Installazione su iPad

Una PWA deve essere pubblicata su un indirizzo **HTTPS**. Dopo la pubblicazione:

1. apri l'indirizzo con Safari su iPad;
2. tocca Condividi;
3. scegli **Aggiungi alla schermata Home**;
4. attiva/apri come app web se iPadOS lo propone;
5. avvia **Training Journal** dall'icona nella Home.

Dopo il primo caricamento la PWA memorizza gli asset necessari per l'uso offline.

## Test locale su PC

Dalla cartella del progetto:

```bash
python -m http.server 8080
```

Poi apri `http://localhost:8080`.

> Il test locale è utile per verificare la UI, ma per installarla su iPad serve la pubblicazione HTTPS.

## Novità v0.1.1

- calendario giornaliero con riepilogo dei risultati dello specifico allenamento (carichi, score WOD, durata e RPE)
- dettaglio allenamento completato con sezione Risultati separata dal Programmato
- Progressi esplorabili: storico peso, dettaglio singola pesata, storico per esercizio/RM, storico WOD per livello e sedute degli ultimi 30 giorni
- collegamento dal progresso all’allenamento di origine quando disponibile
- UI rifinita in stile sportivo elegante, ottimizzata soprattutto per iPad
- aggiornamento PWA più affidabile con cache v0.1.1 e refresh automatico quando cambia il Service Worker

## Novità v0.1.2

- pulsante **Importa messaggio** nel costruttore dell'allenamento
- riconoscimento automatico di intestazione/data e delle sezioni Riscaldamento, Tabata, Skill, Forza/Pesistica, Metcon, WOD, Core e Cooldown
- il Riscaldamento viene trasformato in righe strutturate quando riconosce round, reps o tempi
- Tabata usa i campi predefiniti modificabili 20" / 10" / 8 round quando il messaggio non specifica altro
- Skill resta testo libero
- WOD riconosce formati come For Time, AMRAP, EMOM, E2MOM e mantiene Time Cap e movimenti nel testo
- modelli aggiornati: **Hybrid / CrossFit** (un unico modello), **HYROX**, **Weightlifting**, **Metabolic / Running**
- tutti i dati importati restano modificabili prima del salvataggio

## Novità v0.1.3

- confronto automatico del WOD importato con i 1.010 WOD della libreria locale
- riconoscimento per nome quando il nome è presente e confronto strutturale quando il messaggio contiene soltanto il workout
- confronto tollerante ai carichi: valori Rx/Scaled in kg/lb, parentesi e annotazioni di peso non impediscono il riconoscimento dello stesso WOD
- normalizzazione dei movimenti più comuni e delle varianti/plurali (es. Dumbbell Snatches, Burpees, Box Jump Overs)
- badge **Open**, **Hero**, **Girl** o **Benchmark** quando il WOD viene riconosciuto
- collegamento al `libraryId` originale senza sostituire il testo importato: i carichi più completi presenti nel messaggio vengono mantenuti
- se due WOD risultano troppo simili, l'app mostra una possibile corrispondenza ma evita il collegamento automatico

## Novità v0.1.4

- dalle **possibili corrispondenze** puoi ora aprire direttamente il WOD candidato della libreria e confermare il collegamento senza eseguire una nuova ricerca
- due opzioni di conferma: collegare il WOD mantenendo il testo importato oppure sostituirlo con la versione della libreria
- quando una corrispondenza viene confermata, i risultati già registrati per quella sezione vengono collegati allo stesso `libraryId`
- correzione dei Progressi: i WOD generici chiamati semplicemente “WOD” non vengono più raggruppati tra loro come se fossero lo stesso workout
- lo storico usa **risultati registrati** invece di “tentativi”
- riepilogo WOD più utile: data, categoria/nome, parte del workout e score sono visibili direttamente nei Progressi
- il dettaglio mostra descrizione del WOD, risultato migliore solo quando esistono più risultati realmente riferiti allo stesso WOD e collegamento all'allenamento di origine

## Novità v0.1.6

- nuovo modulo **Extra adattivo** disponibile dalla Home e dal giorno di calendario
- ogni Extra ha priorità Alta / Media / Bassa, timing Prima / Dopo / Indifferente, durata e focus multipli
- focus disponibili per ginnastica, pesistica e condizionamento: Pull Strength, Bar Gymnastics, Muscle-Up, Grip, HSPU, Handstand, Snatch, Clean & Jerk, Squat, Running, Erg e altri
- ogni Extra contiene una **Versione principale** e una **Versione ridotta** realmente programmate
- analisi automatica della classe del giorno con riconoscimento dei movimenti e stima della sovrapposizione sui focus
- suggerimento automatico **Principale / Ridotto / Skip consigliato** modulato anche dalla priorità dell'Extra
- pulsante **Perché?** con motivazione, classe analizzata e livello di sovrapposizione per ciascun focus
- l'atleta può scegliere Principale, Ridotto o Skip anche in override rispetto al suggerimento
- lo Skip programmato viene distinto da un allenamento non eseguito
- gli Extra completati e ridotti vengono riepilogati nei Progressi delle ultime 4 settimane
- indicatore degli Extra presenti anche nelle giornate del calendario
- i dati `adaptiveExtras` sono inclusi nello stato locale/backup e sono predisposti per futura sincronizzazione Coach → Athlete

## Novità v0.1.7

- nuovo comando **Importa programma** nella Home
- importazione da file JSON di una settimana completa di Extra adattivi senza cancellare allenamenti o dati esistenti
- anteprima del pacchetto prima dell'importazione con date, titoli e priorità
- reimportazione sicura: gli Extra con lo stesso ID vengono aggiornati preservando scelta atleta, completamento e risultati test già registrati
- ogni Extra può includere campi test specifici definiti nel pacchetto del coach
- pulsante **Registra test** direttamente sulla card dell'Extra per salvare carichi, reps, RPE, secondi e note utili alla programmazione successiva
- cache offline aggiornata a v0.1.7
