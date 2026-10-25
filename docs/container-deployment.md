# Container mit GitHub Actions und GHCR

Die Pipeline `.github/workflows/container.yml` testet das Projekt und baut das vorhandene
Dockerfile für `linux/amd64` und `linux/arm64`. Nach erfolgreichen Tests veröffentlicht
sie beide Plattformen als gemeinsames Image:

- `ghcr.io/jefe8080/spacetrader:latest`
- `ghcr.io/jefe8080/spacetrader:sha-<vollständige Commit-ID>`

Sie startet bei jedem Push auf `master` oder über **Actions → Publish container → Run workflow**
mit Branch `master`. Manuelle Starts auf anderen Branches werden übersprungen, damit
sie `latest` nicht überschreiben. Ein fehlgeschlagener Test verhindert die Veröffentlichung.
Die Pipeline aktualisiert keine laufenden Container auf deinem Server.

## Einmalig in GitHub einstellen

1. Im Repository unter **Settings → Actions → General → Actions permissions** GitHub Actions
   erlauben. Falls du nur ausgewählte Actions erlaubst, müssen `actions/checkout`,
   `actions/setup-node` sowie `docker/setup-qemu-action`, `docker/setup-buildx-action`,
   `docker/login-action` und `docker/build-push-action` zugelassen sein.
2. Die Workflow-Datei nach `master` pushen. Unter **Actions → Publish container** den ersten
   Lauf prüfen. Die Pipeline fordert selbst `contents: read` und `packages: write` an;
   eine pauschale Freigabe aller Schreibrechte unter „Workflow permissions“ ist nicht nötig.
   Es werden keine eigenen Secrets, kein PAT und kein weiterer Account benötigt.
3. Nach der ersten erfolgreichen Veröffentlichung auf deinem GitHub-Profil unter
   **Packages → spacetrader → Package settings → Danger Zone → Change visibility**
   die Sichtbarkeit **Public** auswählen und bestätigen. Das öffentliche Repository
   macht das Image nicht automatisch öffentlich. GitHub erlaubt anschließend keinen
   Wechsel dieses öffentlichen Pakets zurück auf privat.
4. Falls ein bereits vorhandenes Paket einen Berechtigungsfehler verursacht, in dessen
   **Package settings → Manage Actions access** das Repository `jefe8080/SpaceTrader`
   mit Schreibzugriff hinzufügen. Bei einem neu durch diesen Workflow angelegten Paket
   wird die Repository-Verknüpfung automatisch hergestellt.

Offizielle Anleitungen: [Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
und [Package-Sichtbarkeit](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

## Auf dem Server umstellen

In deiner vorhandenen Compose-, Portainer- oder Container-Konfiguration nur die
Image-Referenz auf `ghcr.io/jefe8080/spacetrader:latest` umstellen. Vorhandene Ports,
Umgebungsvariablen, Neustartregeln und insbesondere das Daten-Volume unter `/app/data`
beibehalten. Das Dockerfile verwendet `DB_FILE=/app/data/world-v5/spacetrader.db`.
Falls deine Container-Konfiguration noch `DB_FILE=/app/data/spacetrader.db` setzt,
entferne diese Überschreibung oder ändere sie auf `/app/data/world-v5/spacetrader.db`.
Der alte Pfad wird vom aktuellen Weltprofil ausdrücklich abgewiesen. Alte Spielstände
werden nicht automatisch übernommen; die bisherige Datenbank bleibt im Volume erhalten.
Wenn du bereits einen gültigen PRD-5-Spielstand unter einem anderen eigenen Pfad nutzt,
behalte diesen Pfad bei.

Nach der Umstellung bei Docker Compose im Verzeichnis deiner Compose-Datei:

```bash
docker compose pull
docker compose up -d
```

Ohne Compose kannst du das Image zunächst herunterladen und den bestehenden Container
anschließend mit derselben Laufzeitkonfiguration und dem neuen Image neu erstellen:

```bash
docker pull ghcr.io/jefe8080/spacetrader:latest
```

Ein `docker pull` allein aktualisiert keinen laufenden Container. Bei einem öffentlichen
Paket ist kein `docker login` erforderlich. Für einen festen Versionsstand oder Rollback
kannst du statt `latest` den Tag `sha-<vollständige Commit-ID>` verwenden.

Das bisherige `docker-build.ps1` bleibt als manueller Build-Weg zur eigenen Registry
erhalten; für den GHCR-Ablauf wird es nicht mehr benötigt.
