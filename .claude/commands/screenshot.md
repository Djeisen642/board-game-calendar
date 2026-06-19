Take a screenshot of a page in the app.

Usage: /screenshot <route> [--mobile] [--desktop] [--full-page] [--fixture <path>]

Examples:
  /screenshot /calendar
  /screenshot /gamecollection --mobile
  /screenshot /calendar --desktop --full-page
  /screenshot /gatherings/new --fixture scripts/fixtures/custom.json

Arguments passed after /screenshot are forwarded directly to `yarn screenshot`.
The dev server starts automatically in screenshot mode (Firebase fully mocked).
Screenshots are saved to `screenshots/<route>-<viewport>.png`.

Run: yarn screenshot $ARGUMENTS
