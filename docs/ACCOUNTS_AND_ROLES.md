# Accounts and roles

Everyone who signs in has an account with a role. Three roles are built in, and an administrator can
make more (see [Custom roles](#custom-roles)). The role decides what a person can see and do. The panel
checks the role on its own side for every action, so hiding a button is never the only protection.

## The three built-in roles

| | **Viewer** | **Moderator** | **Administrator** |
|---|---|---|---|
| See which servers are up, who is on, how to join | ✔ | ✔ | ✔ |
| See join passwords, RCON passwords, config files | | | ✔ |
| Start, stop and restart servers | | ✔ | ✔ |
| Run a game update | | ✔ | ✔ |
| Take backups, read logs | | ✔ | ✔ |
| Use the game console (RCON) | | ✔ | ✔ |
| Kick, ban, whitelist | | ✔ | ✔ |
| See the activity log, schedules and charts | | ✔ | ✔ |
| Browse, edit and delete files in a server's folder (the **Files** tab) | | | ✔ |
| Change a server's settings, ports or start script | | | ✔ |
| Restore a backup, delete or clone a server | | | ✔ |
| Create servers, install mods, edit schedules | | | ✔ |
| Move a server to another PC (export and import) | | | ✔ |
| Add or remove people, make roles, change the panel's settings | | | ✔ |
| Allow staff to sign in from outside your home | | | ✔ |

In the list of accounts they are called **Viewer**, **Moderator** and **Administrator**.
Behind the scenes a Viewer is also called a *guest*. The built-in roles are fixed and can't be edited or deleted.

**Be careful with Administrator.** An administrator can make a server run any program, so
in practice they can use your PC. Give it only to people you would let sit at the keyboard.

### Limiting a moderator to some servers

When you add a moderator (or edit one), you can pick which servers they may act on. A
moderator limited to one game can't reach another by editing the address in the browser;
the panel refuses it. Leave the list empty to let them act on all of them.

## Custom roles

The built-in roles are a good start, but you may want a role that is in between: a helper who can
restart servers and read files but not take backups, say, or a moderator who may use the console but
only for a few commands. An administrator makes these on the **Roles** page (in the left-hand menu).

1. Open **Roles** and choose **New role**.
2. Give it a name, then tick what it may do. The permissions are grouped:

   | Group | Permissions |
   |---|---|
   | Running servers | Start, stop and restart · Use the console · Update the game |
   | Backups | Back up servers |
   | Watching | Read logs · See who is online · See the activity feed · See schedules · See charts and stats |
   | Players | Kick players · Ban players |
   | Files | Browse files · Edit files · Delete files |
   | Administration | Create and edit roles · (also listed: Manage mods and Move servers, which the panel does not yet check on their own: managing mods and moving servers are for administrators only) |

3. Save it. Then give it to a person on the **People** page, in the same place you choose Viewer or
   Moderator.

Good to know:

- **Passwords, settings and deleting stay with administrators.** No custom role can read join or RCON
  passwords, change a server's settings or start script, restore a backup, delete or clone a server,
  install mods, or manage people. Those are administrator actions whatever a role says.
- **A role can't hand out more than its maker holds.** A person with the **Create and edit roles**
  permission can edit roles, but only up to what they have themselves, and only an administrator can
  change a role's console command limits. Only an administrator can give a role to a person.
- **A role in use can't be deleted.** Move the people who hold it to another role first. The page shows how
  many people hold each role.
- Changes to a role's permissions apply on the person's next action. Giving someone a *different* role signs them out so their next sign-in has it.

### Limiting the console commands

A role that may **use the console** can be limited to certain commands. Under **Console commands** a role is one of:

- **Anything** (the default): every command the game accepts.
- **Only these:** an allow-list. The role may send a command only if it appears in the list.
- **Anything except these:** a deny-list.

Type one command per line. Only the **first word** of what the person types is checked, upper or lower case, and `*` means
"any ending": `kick*` matches `kick` and `kickplayer`. A leading `/` is ignored. Presets give you a start:

| Preset | What it does |
|---|---|
| Read only | `list`, `status`, `help`, `players`, `info`, `listplayers`, `say` |
| Moderation | The read-only commands plus `kick*`, `ban*`, `unban*`, `mute*`, `broadcast`, `tell`, `whisper` |
| No destructive commands | Everything except `stop`, `shutdown`, `quit`, `exit`, `saveandexit`, `op`, `deop`, `whitelist`, `wipe*` and `destroy*` |

When a role has a limit, a command with a second command riding along on it (a line break, `;`, `|` or `&&`) is refused
outright, so `list; stop` can't get past an allow-list. The person is told "Your role isn't allowed to run that command."
or "one command at a time, no chaining". Treat a deny-list as a convenience, not a lock: an allow-list is the safer
choice, because a deny-list cannot know every command a game has.

### Different access on some servers

On the **People** page, the pencil (**Change access**) also lets you give someone a **different role on particular
servers**: a Viewer overall who is a Moderator on the one server they help run, for instance. A server left at
"Same as their access" uses the person's main role. The role *Administrator* can't be given for a single server.

## Adding people

1. Open **People**.
2. Fill in a username, a password and a role, then choose **Add**.
3. Give the person the address and their password. Ask them to change it the first time
   they sign in: **Change password** in your menu (click your name at the bottom of the left-hand menu) opens a dialog that asks for the
   current password, then the new one twice.

Usernames are 3 to 32 characters: letters, numbers, dots, dashes and underscores, no
spaces.

### Passwords

A password has to be:

- at least **8** characters, and at most **72** bytes (about 72 letters, fewer if it has
  accented or other special characters). The limit is there because anything longer would
  be silently ignored by the way passwords are stored;
- not one of the most common passwords (`password123`, `12345678`, `qwertyuiop`…);
- not the same as the username.

A few unrelated words (`river-lantern-quiet-moss`) are easy to remember and hard to guess.

## Changing things about an account

From the **People** page an administrator can use the pencil (**Change access**) to:

- **change the role.** The person is signed out straight away and their next sign-in has
  the new role. Their open live view is closed too;
- **limit a moderator to particular servers**, or give them a different role on some servers;
- **set a new password** for someone who has forgotten theirs. It signs them out
  everywhere, so tell them the new one.

and, beside it:

- **Sign out everywhere** to end every sign-in an account has, without changing anything else;
- **Suspend access** (and later **Restore access**) to stop an account signing in without
  deleting it;
- the bin icon to **delete** it.

You can't change, suspend or delete your own account from this page. To change your own
password use **Change password** in your menu (your name at the bottom of the left-hand menu).

The panel won't let you remove, disable or demote the **only active administrator**, so
you can't lock yourself out by accident.

### Seeing where you're signed in

Open your menu (your name at the bottom of the left-hand menu) and choose **Where I'm signed in**. Every sign-in to your
account is listed with its address, when it started and when it was last used. **End** any you don't recognise (then change
your password), or **Sign out everywhere else**. An administrator can end anyone's sign-ins from the **People** page.

## Signing in, and when it says no

You sign in with a username and password. A sign-in lasts 7 days, or until you sign out, or
until your password or role is changed.

If someone gets the password wrong repeatedly, the panel slows them down: after 8 wrong
tries for the same account, or 30 from the same address, within 10 minutes, it refuses
further tries for a while and says how long to wait. That protects against guessing. It
resets by itself.

Sign-in always gives the same answer for a wrong password and for a name that doesn't exist
(*Incorrect username or password*), so nobody can use the page to find out which names
exist.

### Where each kind of account can sign in

There are two places to sign in:

- **Your own network**, at the panel's address (`http://<this PC's address>:8765`). All
  three roles can sign in here.
- **The community address**, the small public page from [Remote access](REMOTE_ACCESS.md).
  Viewers can sign in here. Administrators and moderators **cannot**, unless the owner
  switches on **Let administrators and moderators sign in here too** under
  `Settings → Community view`. That switch is off until an administrator turns it on, and
  turning it on is a real decision: see the [security checklist](SECURITY_GUIDE.md#staff-sign-in-from-outside).

If an administrator or moderator uses the correct password on the community address while
that switch is off, the page says so plainly: *"Your password is right, but admin accounts
can't sign in on this public address…"*. Nothing is wrong with the account. Use the panel
on your own network or through your VPN, or ask the owner to allow staff sign-in there.

## The community code

The **community code** (`People → Community access`) lets friends make their own Viewer
account at the community address without you creating it. The code only ever makes
Viewers, and you can:

- switch it off at any time;
- replace it with a new one (the old one stops working);
- make it expire after some days;
- cap how many people can join with it.

Wrong guesses at the code are slowed down for everyone. If a friend sees *That code isn't
right*, ask them to check for typos; a code looks like `ABCD-EFGH`.
