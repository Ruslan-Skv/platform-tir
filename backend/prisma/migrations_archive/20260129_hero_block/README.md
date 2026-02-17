# Миграция Hero-блока

Применить миграцию вручную:

```bash
cd backend
npx prisma migrate deploy
```

Или для разработки:

```bash
npx prisma migrate dev --name hero_block
```

После миграции выполнить:

```bash
npx prisma generate
```
