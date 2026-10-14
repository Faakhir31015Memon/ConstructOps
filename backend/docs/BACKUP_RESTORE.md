# Backup & Restore — ConstructOps

Two things hold customer data: the **MongoDB database** (projects, labour, expenses,
reports, users) and the **`backend/uploads/` folder** (site photos referenced by daily
reports). A backup that covers only one of them is not a backup.

## 1. Commands

```bash
cd backend
npm run backup                     # writes backend/backups/<timestamp>/
BACKUP_UPLOADS=1 npm run backup    # also copies the site-photo folder
npm run backup -- /mnt/s3/backups  # custom destination
```

Each backup folder contains:

| File | Contents |
| --- | --- |
| `<collection>.jsonl` | one JSON document per line, per collection |
| `manifest.json` | document counts, byte sizes, database name, timestamp |
| `uploads/` | site photos (only when `BACKUP_UPLOADS=1`) |

Restore:

```bash
npm run restore -- backups/2026-10-14_15-06-07 --yes
```

The restore refuses to run without `--yes`, and refuses in production without
`FORCE_RESTORE=1`. It replaces every collection listed in the manifest, re-syncs
indexes from the current schemas, and restores `uploads/` when the backup carries it.

Retention: the newest `BACKUP_KEEP` folders (default 14) are kept, older ones are pruned.

## 2. Why JSONL and not `mongodump`

`mongodump` needs the MongoDB Database Tools installed on the server, which is not
guaranteed on PaaS hosts (Render, Railway, Fly). The script only needs the `mongodb`
driver that is already a dependency, works against Atlas, and produces a diff-able,
grep-able text dump you can inspect or import anywhere.

## 3. Schedule it

Windows (task scheduler, daily 02:00):

```
schtasks /Create /SC DAILY /ST 02:00 /TN "constructops-backup" ^
  /TR "cmd /c cd /d C:\Users\USER\Desktop\ConstructOps\backend && npm run backup"
```

Linux cron:

```cron
0 2 * * * cd /srv/constructops/backend && BACKUP_UPLOADS=1 npm run backup >> /var/log/constructops-backup.log 2>&1
```

Atlas users can additionally enable the built-in continuous snapshots
(Cloud → Backups) — that is the point-in-time layer; these dumps are the portable,
restore-it-yourself layer.

## 4. Off-site copy

A backup on the same disk as the database protects against nothing. Ship the folder:

```bash
aws s3 sync backend/backups s3://constructops-backups/ --exclude "*" --include "2*/*"
# or
rclone copy backend/backups remote:constructops-backups
```

Keep at least one copy that the deploying server cannot write to, and encrypt it —
these files contain names, phone numbers and financial records of real companies.

## 5. Restore drill (do this before you need it)

1. `npm run backup`
2. Restore onto a **second** database: point `DB_URI` at `constructops_restore_test`
   and run the restore command.
3. Boot the API against that database and sign in. Check: project list opens, expenses
   ledger shows rows, payroll tab totals match, a receipt PDF downloads, site photos load.
4. Drop the test database.

Run this quarterly. An untested backup is a rumour.

## 6. What is deliberately not backed up

- `node_modules`, build output (`frontend/dist`) — reproducible from the lockfile.
- `refresh tokens` — they are in the dump, but a restore simply logs everyone out
  when the tokens stop matching; sessions are cheap to re-issue.
- `.env` — keep secrets in a password manager, never in the backup folder.
