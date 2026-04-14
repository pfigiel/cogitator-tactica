## Restore database from dump

```bash
pg_restore -h localhost -p 5432 -U wh_calc -d wh_calc -1 ./backups/<backup-name>.dump
```
