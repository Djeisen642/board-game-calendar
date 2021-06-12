module.exports = process.env.NODE_ENV === 'development'
  ? {
      apiKey: 'AIzaSyB7YMCuegHZ9U4wxAbUQIQnu-qQ8redrZk',
      authDomain: 'board-game-calendar-local.firebaseapp.com',
      databaseURL: 'https://board-game-calendar-local-default-rtdb.firebaseio.com',
      projectId: 'board-game-calendar-local',
      storageBucket: 'board-game-calendar-local.appspot.com',
      messagingSenderId: '342985459417',
      appId: '1:342985459417:web:bac2854c7d338b430de0c8',
      measurementId: 'G-BWNCEJVFBH'
    }
  : {
      apiKey: 'AIzaSyDybqGTKLaLM4kzX6jkma68EjapWItEgYI',
      authDomain: 'board-game-calendar-315218.firebaseapp.com',
      databaseURL: 'https://board-game-calendar-315218-default-rtdb.firebaseio.com',
      projectId: 'board-game-calendar-315218',
      storageBucket: 'board-game-calendar-315218.appspot.com',
      messagingSenderId: '330277334689',
      appId: '1:330277334689:web:a2e7bc335e3c36239f4ae0',
      measurementId: 'G-PD6PE4H25Y'
    }
