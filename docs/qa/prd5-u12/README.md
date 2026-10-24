# U12 – Leitstellenaufträge

Versorgungsaufträge halten einen Zielbestand, Produktionsaufträge beschaffen die
Zutaten ihrer verbleibenden ganzen Rezeptzyklen, Absatzaufträge verkaufen nur
freien Überschuss oberhalb des angegebenen Restbestands. Quellen beziehungsweise
Ziele und reguläre Schiffe werden ausdrücklich ausgewählt. Höhere Priorität wird
zuerst disponiert; für Lebenserhalt/Treibstoff empfiehlt die Oberfläche 100.
Globale Mindestreserven und bereits gebundene Bau-/Quest-/Produktionsware bleiben
geschützt. Produktionsziele stoppen alle Anlagen desselben Rezepts nach Erfüllung;
Abbrechen gibt die Rezeptbindung wieder frei.

Einkaufsbudget und ausdrücklich angegebene begrenzte Zusatzfreigabe verlassen
beim Anlegen das frei verfügbare Konto. Tatsächliche Käufe verbrauchen ausschließlich
dieses Escrow. Restgeld wird beim Abschluss/Abbruch einmalig erstattet.
Preisgrenzen gelten auch für Notkäufe. Bestehende laufende Lieferungen werden
standortübergreifend pro Quellbestand und am Ziel pro Ware berücksichtigt.
Eigene Quelllager reservieren konkrete Bestände. Verdrängte Queues und Abbrüche
geben Reservierungen frei; bereits geladene Ware bleibt physisch auf dem Schiff.
Ein begonnener Flugabschnitt oder Wurmlochtransit darf beim Abbruch sicher enden.

Transport läuft mit echten regulären Schiffen, Laderäumen, Flugzeiten, Gegenkassen
und eigener durchgängiger Abdeckung. Ein volles Ziel hält Restladung und Auftrag
in einer begründeten Pause. Absatz kann zu einem anderen ausdrücklich erlaubten,
erreichbaren zahlungsfähigen Ziel weiterfliegen. Keine wiederholten Warnmeldungen
bei derselben Störung; fehlgeschlagene Käufe werden begrenzt erneut versucht.
Eingerichtete lokale Produktion bleibt bei fehlender Fernabdeckung wirksam.

Elf neue Integrationstests prüfen Lieferung ohne Handels-XP, gemeinsame Bedarfe,
Preisgrenze, tatsächlich budgetbegrenzten Teilkauf, Freigabe von Lagerreservierungen,
Abbruch nach Kauf, Netzverlust, volles Ziel, Produktionszyklen/-stopp, Absatz und
Neustart mit bereits bezahlter Ladung. Vollständige Testsuite: 230 Tests.

Browsernachweis `delivered.png`: Mit `node sim/logistics-qa.js` neu angelegte
isolierte QA-Welt auf localhost:3011, Kapitän „U12 Leitstelle“. Die Fixture stellt
repariertes Dock, Leitstelle, Funktionsmodule, Solarfeld, Personal und Geld bereit;
sie ist ausdrücklich keine Aufbau-/Balancesimulation. Über die Oberfläche wurden
20 Eis mit 100 Cr Höchstpreis, 1.000 Cr Budget und einem zugewiesenen Spatz von
„Eis – Ezvek“ bestellt. Der Frachter kaufte und flog tatsächlich zurück. Anzeige:
20 geliefert, ca. 212 Cr verbraucht, Restbudget zurückgegeben; Heimatlager 20 Eis.
Keine neuen Browserfehler. Die Gelände-/Gebäudezeichnung bleibt U16.
