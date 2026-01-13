### Installation

Node 22 or greater

```
npm install
```

### Database Configuration

create `.env` file with the following values:

```shell
DATABASE_URL="file:./dev.db"
```

Generate database

```shell
npm run db:generate
```

Running migrations

```shell
npm run db:migrate
```
