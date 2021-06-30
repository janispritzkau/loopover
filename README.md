# Loopover

![Loopover Game](https://repository-images.githubusercontent.com/213859310/dfd40b00-4fd7-11ea-9161-836dba6c576b)

## Project structure

### `src/state/`

Contains most of the higher-level game logic, such as the timer, various events, and many other things.

### `src/game/`

Contains the core game code such as move mechanics, canvas rendering and the scramble algorithm.

### `src/components/`

Reuseable Vue components are placed inside here.

### `src/views/Main.vue`

The overall layout and design of the game is defined here.

## Project setup
```sh
npm install
```

### Compiles and hot-reloads for development
```sh
npm run serve
```

### Compiles and minifies for production
```sh
npm run build
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).
