```
## Setup
npm install

npx playwright install
```



```
## Running
npm run test:api    # API suite, no browser needed

npm run test:web    # web suite, headless

npm test            # both

npm run report      # open the HTML report from the last run
```

`test:web` runs headless by default; `HEADLESS=false npm run test:web` to watch it.
`test:api` points at the public demo server by default; override with `RESTFUL_BOOKER_URL=<url>`.
Same idea for the web project via `WEB_BASE_URL=<url>`.

