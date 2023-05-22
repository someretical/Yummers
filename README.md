# Birthday Bot

## Interactions

Each birthday, give the birthday person a special role.

Send them a list of all the birthday messages other users have sent. Messages are anonymous by default.

### Dev considerations

Before a birthday recipient is deleted, send each user who has sent the recipient any messages a copy of all the messages they have set. This serves as a backup feature

Before a guild is deleted, send the server owner a backup.

Alternatively, use paranoid delete and if it needs to be created again, reset the paranoid delete flag.

## Commands to implement:

### `addbirthdaymessage`

-   sender info is not given to the receiver unless they specify it
-   can specify year of the birthday message

### `viewbirthdaymessages`

-   gets a list of birthday messages that a particular user has set
-   receiver cannot use this to see what messages other people have set
-   can specify year and is also paginated
-   if no year just paginate everything
-   can use the old option to see past birthday messages that were set

### `deletebirthdaymessages`

-   need to work out a way to figure out which one to delete

### .env file

```ini
TOKEN="BOT_TOKEN"

DATABASE_URL="DB_URL"

EMBED_COLOUR="Purple"

OWNER_ID="OWNER_ID"

# Required for deploying commands
CLIENT_ID="id"
DEV_GUILD_ID="id"
```
