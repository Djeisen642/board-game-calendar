export default {
  BoardGameGeekBaseUrl:
    process.env.BGG_PROXY_URL ??
    'https://us-central1-board-game-calendar-3ae94.cloudfunctions.net/bggProxy/',
  BggBoardGameType: 'boardgame',
  DebounceThrottleInMs: 500,
  NumberToShow: 10,
  PrimaryNameType: 'primary',
  LoadingTimeoutInMs: 2000,
}
