module.exports =
  process.env.NODE_ENV === 'development'
    ? {
        apiKey: process.env.G_API_KEY,
        authDomain: 'board-game-calendar-local.firebaseapp.com',
        databaseURL:
          'https://board-game-calendar-local-default-rtdb.firebaseio.com',
        projectId: 'board-game-calendar-local',
        storageBucket: 'board-game-calendar-local.appspot.com',
        messagingSenderId: '342985459417',
        appId: process.env.G_APP_ID,
        measurementId: 'G-NHS710XDXN',
      }
    : {
        apiKey: process.env.G_API_KEY,
        authDomain: 'board-game-calendar-315218.firebaseapp.com',
        databaseURL:
          'https://board-game-calendar-315218-default-rtdb.firebaseio.com',
        projectId: 'board-game-calendar-315218',
        storageBucket: 'board-game-calendar-315218.appspot.com',
        messagingSenderId: '330277334689',
        appId: process.env.G_APP_ID,
        measurementId: 'G-PD6PE4H25Y',
      }
