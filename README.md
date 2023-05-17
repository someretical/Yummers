# Birthday Bot

## Interactions

Each birthday, give the birthday person a special role
Send them a list of all the birthday messages

Before a birthday recipient is deleted, send each user who has sent the recipient any messages a copy of all the messages they have set. This serves as a backup feature

Before a guild is deleted, send the server owner a backup.

Alternatively, use paranoid delete and if it needs to be created again, reset the paranoid delete flag.

## Commands

### `upcomingbirthdays`

-   for each birthday display:
    -   username
    -   date
    -   time until
-   paginated menu - 10 entries at a time

### `setbirthday`

-   takes in date as single parameter
-   user can only change their own

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

### `setbirthdayrole`

### `viewbirthdayrole`

### `setbirthdaychannel`

### `viewbirthdaychannel`

## Database

Use with https://dbdiagram.io/home/

```
Table Guilds {
  id char(32) [PK]
  birthday_role_id char(32) [not null]
  birthday_channel_id char(32) [not null]
}

Table Users {
  id char(32) [PK]
  birthday date [not null]
}

Table PrivateMessages {
  _id integer [PK, increment]
  sender char(32)
  receiver char(32)
  year date [not null]
  message varchar [not null]

  indexes {
    sender [type: btree]
    receiver [type: btree]
    year [type: btree]
  }
}

Table PublicMessages {
  _id integer [PK, increment]
  sender char(32)
  receiver char(32)
  guild char(32)
  year date [not null]
  message varchar [not null]

  indexes {
    sender [type: btree]
    receiver [type: btree]
    guild [type: btree]
    year [type: btree]
  }
}


Ref: PrivateMessages.sender > Users.id [delete: cascade, update: cascade]

Ref: PrivateMessages.receiver > Users.id [delete: cascade, update: cascade]

Ref: PublicMessages.sender > Users.id [delete: cascade, update: cascade]

Ref: PublicMessages.receiver > Users.id [delete: cascade, update: cascade]

Ref: PublicMessages.guild > Guilds.id [delete: cascade, update: cascade]
```
