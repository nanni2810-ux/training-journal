# Training Journal v0.1.2 — PWA iPad/iPhone

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

