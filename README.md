# board-game-calendar

A calendar to suggest board game nights and board games

###Types?

GatheringState
- pending
- confirmed
- canceled

Game
- id:number
- rating:number
- privateNote:string
- publicNote:string

Contact
- id:uuid
- privateNote

Guest
- confirmed:boolean
- id:uuidj

###Tables

user
- id:uuid
- name:string
- email:string
- collection:Game[]
- contact:Contact[]
- sharesWith:uuid[]

gathering
- state:GatheringState
- datetime:DateTime
- initiator:uuid
- host:uuid
- open:boolean
- maxGuests:number
- guests:Guest[]
- games:id

## Build Setup

```bash
# install dependencies
$ yarn install

# serve with hot reload at localhost:3000
$ yarn dev

# build for production and launch server
$ yarn build
$ yarn start

# generate static project
$ yarn generate
```

For detailed explanation on how things work, check out [Nuxt.js docs](https://nuxtjs.org).
