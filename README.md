<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/boreashe/ahlcg-deckcode">
    <img src="assets/icon-colored-512.png" alt="Logo" width="100" height="100">
  </a>

  <h3 align="center">AHLCG-DeckCode</h3>

  <p align="center">
    An experimental universal deck code framework for Arkham Horror: The Card Game
    <br />
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
    </li>
    <li>
      <a href="#development">Development</a>
    </li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About The Project

`ahlcg-deckcode` is an experimental encoding framework designed to generate a universal deck code for Arkham Horror: The Card Game. This project aims to streamline deck sharing by providing a platform-agnostic solution, making it easier for players to share, import, and utilize deck configurations across various tools and applications. Inspired by [Riot Games' deck code system](https://github.com/RiotGames/LoRDeckCodes) and [its TypeScript implementation](https://github.com/jcuker/lor-deckcode-ts/), `ahlcg-deckcode` aims to leverages similar principles to ensure compact, efficient, and reliable encoding. The repository also includes a TypeScript implementation of the framework, offering developers an accessible way to integrate this functionality into their own Node.js projects.

### Features

- Suggests an encoding framework for cross-platform usage
- A verbose and non-optimized codebase
- Encodes a card-quantity map object into a base32 deck code (e.g. `{{"01001": 1}}`)
- Decodes a deck code into card-quantity map object
- Some basic tests

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Mythodology

The detailed explanation for the basic concept of this encoding system can be found in the [Riot Games' repo](https://github.com/RiotGames/LoRDeckCodes). Here I hope to simply illustrate the structure of the data. It may seem unintuitive at first.

A valid input should look like this:

- The left hand side represents the card ID
- The right hand side represents how many copies of this card that the user included in the deck.

```json
// Roland's starter deck
{
  "01001": 1, // Roland Banks
  "01006": 1, // Roland's .38 Special
  "01007": 1, // Cover Up
  "01016": 1, // .45 Automatic
  "01017": 1, // Physical Training
  "01018": 1, // Beat Cop
  "01019": 1, // First Aid
  "01020": 1, // Machete
  "01021": 1, // Guard Dog
  "01022": 1, // Evidence!
  "01023": 1, // Dodge
  "01024": 1, // Dynamite Blast
  "01025": 1, // Vicious Blow
  "01030": 1, // Magnifying Glass
  "01031": 1, // Old Book of Lore
  "01032": 1, // Research Librarian
  "01033": 1, // Dr. Milan Christopher
  "01034": 1, // Hyperawareness
  "01035": 1, // Medical Texts
  "01036": 1, // Mind over Matter
  "01037": 1, // Working a Hunch
  "01038": 1, // Barricade
  "01039": 1, // Deduction
  "01086": 2, // Knife
  "01087": 2, // Flashlight
  "01088": 2, // Emergency Cache
  "01089": 2, // Guts
  "01092": 2, // Manual Dexterity
  "01000": 1 // Random Basic Weakness
}
```

### Card ID

The basic unit - card ID, is composed of:

- A 2-digit set ID, representing the cycle
- A 3-digit card ID, representing the card number in that set.

For example for card id "01001":

```
Set ID (of Core Set) --> 01 001 <-- Card ID (Roland Banks)
```

### First Level

The top-level building blocks of the encoded deck code has the following order, that groups the cards into the following categories:

- [Cards that the user put 1 copy in the deck]
- [Cards that the user put 2 copies in the deck]
- [Cards that the user put 3 copies in the deck]
- [Cards that the user put 4 or more copies in the deck]

### Second Level

Inside each group for 1, 2 and 3 copies, it follows this second-level order:

- How many sets is included
- [Set groups]

### Third Level

Inside each set group, it follows this third-level order:

- How many cards is in this set
- Set ID of this set
- Card ID
- Card ID
- Card ID
- ...and the remaining card IDs

### Concept Demonstration

Let's see how the following 11-card example "deck" works under this grouping system:

```json
{
  "03003": 1, // Sefina Rousseau
  "03012": 3, // The Painted World
  "03013": 1, // Stars of Hyades
  "05320": 1, // Double, Double (4)
  "10101": 2, // Read the Signs (2)
  "02229": 2, // Quick Thinking
  "01000": 1 // Random Basic Weakness
}
```

First, the system will sort the input so that the same deck will always return the same result. Then, it will divide the cards into four categories by how many copies of each card is included:

```json
{
  // 1 copies
  "1": [
    "01000", // Random Basic Weakness
    "03003", // Sefina Rousseau
    "03013", // Stars of Hyades
    "05320" // Double, Double (4)
  ],

  // 2 copies
  "2": [
    "02229", // Quick Thinking
    "10101" // Read the Signs (2)
  ],

  // 3 copies
  "3": [
    "03012" // The Painted World
  ]

  // >3 copies: nothing
}
```

Then, in each group, further group the cards by set ID.

```json
{
  // 1 copies
  "1": {
    "01": [
      "000" // Random Basic Weakness
    ],
    "03": [
      "003", // Sefina Rousseau
      "013" // Stars of Hyades
    ],
    "05": [
      "320" // Double, Double (4)
    ]
  },

  // 2 copies
  "2": {
    "02": [
      "229" // Quick Thinking
    ],
    "10": [
      "101" // Read the Signs (2)
    ]
  },

  // 3 copies
  "3": {
    "03": [
      "012" // The Painted World
    ]
  }

  // >3 copies: nothing
}
```

Finally, add size metadata to it.

```json
  // 1 copies
  "1": {
    "size": 3, // 3 sets inside this group
    "sets": [
      {
        "size": 1,
        "setId": "01",
        "cards": [
          "000" // Random Basic Weakness
        ]
      },
      {
        "size": 2,
        "setId": "03",
        "cards": [
          "003", // Sefina Rousseau
          "013" // Stars of Hyades
        ]
      },
      {
        "size": 1,
        "setId": "05",
        "cards": [
          "320" // Double, Double (4)
        ]
      },
    ]
  },

  // 2 copies
  "2": {
    "size": 2,
    "sets": [
      {
        "size": 1,
        "setId": "02",
        "cards": [
          "229" // Quick Thinking
        ]
      },
      {
        "size": 1,
        "setId": "10",
        "cards": [
          "101" // Read the Signs (2)
        ]
      },
    ]
  },

  // 3 copies
  "3": {
    "size": 1,
    "sets": [
      {
        "size": 1,
        "setId": "03",
        "cards": [
          "012" // The Painted World
        ]
      }
    ],
  }

  // >3 copies: nothing
```

### VarInt and concatenation

Why would we need metadata(i.e. size) for each of the groups? Because the system will then:

1. Convert all numbers in this data into `VarInt`s (you can think of it is a data structure that store a number with varying size of storage space, I won't explain what is it here to reduce complexity)
2. Flatten the whole thing and concatenate all the `VarInt`s into a long, long number array
3. Encode it to become a base32 string, which is the end product, the deck code

A illustration of the number array(before converting them to `VarInt`) would look like this:

```json
[
  // Group of 1 copy begins here
  3, // How many sets in the group of 1 copy

  1, // How many cards in the 1st set
  1, // Set ID of this set
  0, // Random Basic Weakness

  2, // How many cards in the 2nd set
  3, // Set ID of this set
  3, // Sefina Rousseau
  13, // Stars of Hyades

  1, // How many cards in the 3rd set
  5, // Set ID of this set
  320, // Double, Double (4)

  // Group of 2 copies begins here
  2, // How many sets in the group of 2 copies

  1, // How many cards in the 1st set
  2, // Set ID of this set
  229, // Quick Thinking

  1, // How many cards in the 2nd set
  10, // Set ID of this set
  101, // Read the Signs (2)

  // Group of 3 copies begins here
  1, // How many sets in the group of 3 copies

  1, // How many cards in the 1st set
  3, // Set ID of this set
  12, // The Painted World

  // >3 copies: nothing
```

Consider we need to decode the deck code later to get back the original deck, the system will need to reverse the whole process.

1. Decode the base32 string into a long number array
2. Now we need to scan through the array, number by number, to recover the data

Let's say the system scanning cursor entered the group for 1 copy. Without the knowing the size, it is impossible to know when to stop scanning for the group of 1 copy because each group can have different number of sets. It's the same for cards under a set.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Development

This project is not yet available on NPM since it is still WIP.

### Steps

1. Clone the repo
   ```sh
   git clone https://github.com/boreashe/ahlcg-deckcode.git
   ```
2. Install NPM packages
   ```sh
   npm i
   ```
3. Run Tests
   ```sh
   npm run test
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->

## Roadmap

- Customizable cards
- Side deck
- Identify the investigator

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feature: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Top contributors:

<a href="https://github.com/boreashe/ahlcg-deckcode/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=boreashe/ahlcg-deckcode" alt="contrib.rocks image" />
</a>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Discord: boreashe

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [othneildrew/Best-README-Template](https://github.com/othneildrew/Best-README-Template)
- [RiotGames/LoRDeckCodes](https://github.com/RiotGames/LoRDeckCodes)
- [jcuker/lor-deckcode-ts](https://github.com/jcuker/lor-deckcode-ts)
- [Game-icons.net](https://game-icons.net/): Repo icon

<p align="right">(<a href="#readme-top">back to top</a>)</p>
