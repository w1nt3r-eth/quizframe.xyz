# Source code for [QuizFrame](https://quizframe.xyz/)

> WARNING: Work in progress, ugly code, no warranties

## Features

1. Simulates Farcaster embed locally with a form
2. Stores app's state in a URL
3. Uses `@vercel/og` to render images with React and Satori

## Getting Started

Register a Redis database on [Upstash](https://upstash.com/).

Create `.env.local`

```
REDIS_URL="https://abc-xyz.upstash.io"
REDIS_TOKEN="aHVudGVyMg=="
```

Running locally

```
$ yarn
$ yarn dev
```

Navigate to http://localhost:3000/new and create a new Quiz, then open the Quiz at http://localhost:3000/q/example-uuid-0000

## Interesting pices of code

`src/pages/api/og/[props].tsx` - renders the frame image based on current state. The URL contains all required serialized data, so Vercel can cache the image.

`src/pages/q/[id].tsx` - the main engine, using `<form>` to simulate Farcaster embed, handles POST requests in `getServerSideProps`, handles the game state in Redux style.

`src/pages/new.tsx` - quiz editor using spreadsheet-like interface.
