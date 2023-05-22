# Yummers 😋 (a birthday bot )

## Interactions

When a user has their birthday, give them a special role and make an announcement. User's can set which servers they want this announvement/role on.

Users also receive a list of birthday messages other users have sent. Messages are anonymoous by default and are only delivered on the birthday. Users can disable these messages.

## Developer considerations

Before a birthday recipient is deleted, send each user who has sent the recipient any messages a copy of all the messages they have set. This serves as a backup feature

Before a guild is deleted, send the server owner a backup.

Alternatively, use paranoid delete and if it needs to be created again, reset the paranoid delete flag.

### Commands to implement:

#### `addbirthdaymessage`

-   sender info is not given to the receiver unless they specify it
-   can specify year of the birthday message

#### `viewbirthdaymessages`

-   gets a list of birthday messages that a particular user has set
-   receiver cannot use this to see what messages other people have set
-   can specify year and is also paginated
-   if no year just paginate everything
-   can use the old option to see past birthday messages that were set

#### `deletebirthdaymessages`

-   need to work out a way to figure out which one to delete

## Database setup

### Arch

#### PostgreSQL

```bash
$ yay -S postgresql
$ sudo -iu postgres
[postgres]$ initdb -D /var/lib/postgres/data
[postgres]$ createuser --interactive

# Set username to the same one as the current user
# Make it a superuser as well

[postgres]$ exit
$ createdb yummers

```

Example database URL: `postgresql://someretical@localhost/yummers`

### Debian (including Raspberry Pi)

#### PostgreSQL

```bash
$ sudo apt-get --purge remove postgresql
$ sudo apt-get purge postgresql*
$ sudo apt-get --purge remove postgresql postgresql-doc postgresql-common

$ sudo rm -rf /var/lib/postgresql/
$ sudo rm -rf /var/log/postgresql/
$ sudo rm -rf /etc/postgresql/

$ sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
$ wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
$ sudo apt-get update
$ sudo apt-get -y install postgresql

$ sudo -iu postgres
[postgres]$ createuser --interactive

# Set username to the same one as the current user
# Make it a superuser as well

[postgres]$ exit

$ sudo -u postgres psql postgres

# For some reason postgres chokes if you don't set a password. This doesn't happen on arch...
postgres=# ALTER USER blueberry PASSWORD blueberry;
postgres=# exit

$ createdb yummers
```

Example database URL: `postgresql://blueberry:blueberry@localhost/yummers`

## Bot setup

**Requires a working node installation >=18.x.x**

Clone the repository and `cd` into it.

Create and edit the `.env` file in the root folder

```ini
TOKEN="BOT_TOKEN"

DATABASE_URL="DB_URL"

EMBED_COLOUR="Purple"

OWNER_ID="OWNER_ID"

# Required for deploying commands
CLIENT_ID="id"
DEV_GUILD_ID="id"
```

Run the following commands:

```bash
$ npm i
$ npm run prisma-init

```

### Deploying

```bash
$ npm i -g pm2
$ npm run deploy

# Tell PM2 to start on boot
$ pm2 startup
# Run the command that it tells you to
$ pm2 save

```

### Developing

```bash
$ npm i -g nodemon
$ npm run dev
```
