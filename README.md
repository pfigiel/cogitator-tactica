## Restore database from dump

```bash
pg_restore -h localhost -p 5432 -U cogitator_tactica -d cogitator_tactica -1 ./backups/<backup-name>.dump
```
