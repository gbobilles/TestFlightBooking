# Playwright web automation for cheapflights.com.au and API automation for restful-booker

## Setup
Install [Node](https://nodejs.org/) project dependencies:
```sh
npm install
npx playwright install
```

## Running
```sh
npm run test:api    # API suite, no browser needed
npm run test:web    # web suite, headless
npm run test:web-headed    # web suite, headed to watch it
npm test            # both
npm run report      # open the HTML report from the last run
```

`test:web` runs headless by default; 
`test:api` points at the public demo server by default;

