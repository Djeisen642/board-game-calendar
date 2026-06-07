export default process.env.NODE_ENV === 'development'
  ? {
      apiKey: process.env.G_API_KEY ?? '',
      authDomain: 'board-game-calendar-3ae94.firebaseapp.com',
      projectId: 'board-game-calendar-3ae94',
      databaseUrl:
        'https://board-game-calendar-3ae94-default-rtdb.firebaseio.com/',
      storageBucket: 'board-game-calendar-3ae94.firebasestorage.app',
      messagingSenderId: '800434247259',
      appId: process.env.G_APP_ID ?? '',
      measurementId: 'G-TY8WVD70Z1',
    }
  : {
      apiKey: process.env.G_API_KEY ?? '',
      authDomain: 'board-game-calendar-315218.firebaseapp.com',
      databaseURL:
        'https://board-game-calendar-315218-default-rtdb.firebaseio.com',
      projectId: 'board-game-calendar-315218',
      storageBucket: 'board-game-calendar-315218.appspot.com',
      messagingSenderId: '330277334689',
      appId: process.env.G_APP_ID ?? '',
      measurementId: 'G-PD6PE4H25Y',
    }
