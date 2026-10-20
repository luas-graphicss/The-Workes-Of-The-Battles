# The Battles of the Iron Work

[Leia em português](README.pt-BR.md)

A pixel art adventure that runs in the browser. A meteor falls on the forest of Bosque Alto and visitors that are not from this world come out of it. With your robot you explore the city, talk to the people who live there, take on missions and fight robots and aliens in the rings of the Robot League and during escapes from the factories, using the battle tablet. The credits you win are spent on parts at the Crystal Workshop to upgrade the robot.

Battles are played with cards. Each robot has a class, elements and gadgets, you build a deck, play cards from your hand and manage the fury meter and status effects, with bosses that have their own rules and a crowd reacting around the ring. Outside the fights there is a garage to assemble the robot, a shop, a house, a companion, cutscenes, a story that leads to a finale and a few secrets hidden around the map.

The game runs on its own small engine written in TypeScript inside Next.js, with sprites, camera, effects, audio and keyboard or touch controls with a virtual joystick. The map and the robot parts are prepared by scripts in the scripts folder.

## How to use

You need Node.js and pnpm. Clone the repository, run pnpm install and then pnpm dev and open localhost on port 3000. pnpm test:world checks the world data. pnpm export:game builds a standalone version of the game that works offline and saves it in the dist folder, inside bosque-alto. To save it somewhere else, set the EXPORT_DIR environment variable.

## Development time

The game took two weeks to make and it is finished.
