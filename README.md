```
## Setup
npm install

npx playwright install
```



```
## Running
npm run test:api    # API suite, no browser needed

npm run test:web    # web suite, headless

npm run test:web-headed    # web suite, headed to watch it

npm test            # both

npm run report      # open the HTML report from the last run
```

`test:web` runs headless by default; `HEADLESS=false npm run test:web` to watch it.
`test:api` points at the public demo server by default;

