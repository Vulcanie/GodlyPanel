# Accounts and roles

Everyone who signs in has an account with one of three roles. The role decides what they
can see and do. The panel checks the role on its own side for every action, so hiding a
button is never the only protection.

## The three roles

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
| Change a server's settings, ports or start script | | | ✔ |
| Restore a backup, delete or clone a server | | | ✔ |
| Create servers, install mods, edit schedules | | | ✔ |
| Add or remove people, change the panel's settings | | | ✔ |
| Allow staff to sign in from outside your home | | | ✔ |

In the list of accounts they are called **Viewer**, **Moderator** and **Administrator**.
Behind the scenes a Viewer is also called a *guest*.

**Be careful with Administrator.** An administrator can make a server run any program, so
in practice they can use your PC. Give it only to people you would let sit at the keyboard.

### Limiting a moderator to some servers

When you add a moderator (or edit one), you can pick which servers they may act on. A
moderator limited to one game can't reach another by editing the address in the browser;
the panel refuses it. Leave the list empty to let them act on all of them.

## Adding people

1. Open **People**.
2. Fill in a username, a password and a role, then choose **Add**.
3. Give the person the address and their password. Ask them to change it the first time
   they sign in: the **Password** button at the top right opens a dialog that asks for the
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
- **limit a moderator to particular servers**;
- **set a new password** for someone who has forgotten theirs. It signs them out
  everywhere, so tell them the new one.

and, beside it:

- **Suspend access** (and later **Restore access**) to stop an account signing in without
  deleting it;
- the bin icon to **delete** it.

You can't change, suspend or delete your own account from this page. To change your own
password use the **Password** button at the top right.

The panel won't let you remove, disable or demote the **only active administrator**, so
you can't lock yourself out by accident.

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
