# Vspo Stream Schedule

## Development / Local Run

### Requirements
* Node.js (CI uses Node 22)

### Setup
```sh
npm install
```

### Local preview with mock data
You can preview the frontend without any platform API keys by generating mock data first.

```sh
npm run gen:mock   # writes public/data/streams.json and public/data/streamers.json
npm run dev        # starts the dev server at http://localhost:5173/vspo-stream-schedule/
```

### Generating real data (batch script)
This script fetches stream/streamer info from each platform and writes
`data/streams.json` / `data/streamers.json`. It runs periodically via GitHub Actions
(`.github/workflows/refresh.yml` / `deploy.yml`), but can also be run locally.

Requirements to run it:
* The following API credentials set as environment variables:
  * `YOUTUBE_API_KEY`
  * `TWITCH_CLIENT_ID`
  * `TWITCH_CLIENT_SECRET`
  * `TWITCASTING_ACCESS_TOKEN`
* `functions/src/streamerMaster.json` (a mapping of streamers to their channel IDs on each
  platform; see `streamerMaster.format.json` for the expected shape)

```sh
npm run generate
```

### Build
```sh
npm run build
```
