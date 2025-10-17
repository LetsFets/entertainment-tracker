# Component library

This folder contains all kinds of UI components that you can re-use in your project.

For this project, we use [shadcn/ui](https://ui.shadcn.com/) as a base.
Some forms/screens are also "Blocks" (reusable pre-arranged component collections offered by shadnc/ui) and you can get more from [this page](https://ui.shadcn.com/blocks).

## Structure

- `./`: Contains so-called blocks.
    - *FYI: You should not build your whole UI in here unless you have certain UI arrangements of your app that you want to re-use repeatedly in different parts of the app.*
- `./ui/`: Contains basic UI components from the shadcn lib.
    - Docs (i.e. use-cases and anatomy in use) for the individual components can be [found here](https://ui.shadcn.com/docs/components).
    - These components are to be used similar to HTML primitives, as in: They're highly configurable and fairly "atomic".
    - Feel free to also add your own reusable components in here (or components from other collections).


## How to add more components

This boilerplate already contains quite a few basic components, but should you need more, follow the "Installation" guides in the docs for the individual components. This project already contains a `components.json`, which is the config file for the shadcn/ui cli, so feel free to just use that.

When loading blocks, you will see that they're pretty simple components without any data loading logic, so you'll need to build these things yourself (obviously).