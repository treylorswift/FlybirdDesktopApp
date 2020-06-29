# Flybird Desktop App

Flybird Desktop App automates sending of direct messages to your Twitter followers, with a focus on soliciting mailing list / newsletter signups. Send up to 1000 messages per day.

### Features

- Cross platform application built using Electron & Node.js

- Downloads your complete follower list from Twitter at roughly 300k followers per hour. Download is resumable if interrupted. Followers can be updated/re-downloaded again later.

- Integrates with the Flybird web app for managing subscriptions at https://flybirdy.herokuapp.com. Quickly create a newsletter sign up page, then send the link to your followers with the Flybird Desktop App. You'll be notified by email when people sign up.

- Followers are displayed in a table. Sort by "Most Followers" (your most influential followers) or "Most Recently Followed" (the people who followed you most recently). Filter results by entering tags which will be matched against each user's Twitter bio.

- Message sending history is tracked to ensure each follower is contacted only once. Message sends are scheduled to avoid hitting Twitter API rate limit errors.
 
- A separate "Sandbox" message history allows you to simulate sending of messages to see how the program operates without actually sending real messages.

### 

### Installation and Setup

1. Download and install a pre-built binary or install via git (instructions below)
2. Go to <https://developer.twitter.com/apps> and create a Twitter app for testing. Generate API keys with read, write, and Direct Message permissions.
3. Run the Flybird App, enter the API keys from step 2 and login with your Twitter account.
4. Click to download your followers.
5. While followers are downloading, visit https://flybird.herokuapp.com and create a newsletter sign up page.
6. When the follower download completes, you can view, sort, filter, and contact your followers.

### Pre-Built Binaries
- Grab one from the [Releases](https://github.com/treylorswift/FlybirdDesktopApp/releases) page

### Developer Install
1. Make sure you have Node.js (at least version 9) and git installed 
2. `git clone https://github.com/treylorswift/FlybirdDesktopApp.git`
3. `cd FlybirdDesktopApp`
3. `npm install`
4. `./node_modules/.bin/electron-rebuild` (Mac/Linux) or `node_modules\.bin\electron-rebuild` (Windows) - Native modules may need to be rebuilt for electron depending on your installed Node.JS version.
5. Go to <https://developer.twitter.com/apps> and create a Twitter app for testing. Generate API keys with read, write, and Direct Message permissions.
6. `npm start` to launch the app
7. To package your own Electron app installer, use `npm run dist`

### Flybird Web App
The Flybird web app helps manage newsletter subscriptions and is also on github at https://github.com/treylorswift/Flybird.

### Credits

- Written by [@treylorswift](https://twitter.com/treylorswift)

### Packages Used
- [twitter-lite](https://github.com/draftbit/twitter-lite) for Twitter API access
- [better-sqlite3](https://github.com/JoshuaWise/better-sqlite3) for local SQLite database
- [oauth-electron-twitter](https://github.com/kanekotic/oauth-electron-twitter) for Twitter OAUTH in Electron
