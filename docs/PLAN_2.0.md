# Piano 2.0

Idea: ricerca nella lezione (parola → salto al minuto), riassunti AI e, solo come piano B, trascrizione con Whisper.

## Passo 1 — Ricerca: sottotitoli e trascrizioni di Panopto ed Echo360

**Quando:** inizio dicembre 2026 (rinviata il 2026-11-19).
**Tipo:** solo analisi, nessuna modifica al codice dell'estensione.
**Output:** `docs/RESEARCH_CAPTIONS.md` + riassunto di 10 righe per Alex.

Nota: una prima bozza di `docs/RESEARCH_CAPTIONS.md` esiste già (2026-11-19, non committata, fatta su lezioni pubbliche). A dicembre va ripresa, verificata (prezzi e pagine cambiano) e completata con una lezione reale con login.

### Brief (testo di Alex, 2026-11-19)

> OBIETTIVO
> Capire se LectureSpeed può leggere i sottotitoli/trascrizioni che Panopto ed Echo360 hanno già, per una futura versione 2.0 con ricerca nella lezione (parola → salto al minuto), riassunti AI e, solo come piano B, trascrizione con Whisper.
>
> DA VERIFICARE, per Panopto (Viewer ed Embed) ed Echo360:
> 1. Dove stanno i sottotitoli: \<track\> sul \<video\>, file VTT/SRT, chiamate di rete del player (es. endpoint di Panopto/Echo360), testo nel DOM (pannello Captions/Transcript)?
> 2. Si possono leggere da un content script con la sessione dell'utente già aperta, senza permessi nuovi? Se servono permessi nuovi, quali.
> 3. Il testo ha i tempi (timestamp) per ogni frase? Serve per saltare al punto giusto.
> 4. Cosa succede se il docente non ha attivato i sottotitoli: c'è comunque una trascrizione automatica?
> 5. Termini d'uso di Panopto ed Echo360 ed eventuali limiti tecnici (CORS, token, rate limit). Solo fatti con fonte.
> 6. Piano B Whisper: come catturare l'audio della scheda in MV3 (tabCapture/offscreen), permessi necessari, impatto sulla revisione del Chrome Web Store e sulla privacy policy. Prezzo attuale dell'API di trascrizione di OpenAI (verifica sulla pagina ufficiale).
>
> COME
> - Usa la documentazione ufficiale e le pagine di supporto delle università; dove possibile ispeziona una lezione pubblica (Panopto ed Echo360 hanno video demo pubblici).
> - Se ti serve una lezione reale con login, fermati e dimmi cosa devo aprire io e cosa devo copiarti (es. dalla scheda Rete di DevTools).
> - Non inviare dati delle lezioni a servizi esterni.
>
> OUTPUT
> Un file docs/RESEARCH_CAPTIONS.md con: risposta per ogni punto, fonti, cosa è fattibile subito, rischi, e una stima di costo per lezione dei riassunti fatti sul testo dei sottotitoli (prezzo di un modello economico, verificato).
> Poi un riassunto di 10 righe per me.

## Passi successivi

Da definire dopo il passo 1.
