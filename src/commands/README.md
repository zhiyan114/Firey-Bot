# Commands Documentation
All files here are modular thus should have a default export value.

## Return Value
Refer to `src/interface.ts -> ICommand` for the proper types
```ts
export default {
    command,
    permissions,
    function,
    disabled,
}
```
* command - this key should be configured with `SlashCommandBuilder`
* permissions - (optional), limit the command to certain roles/users
* function - this key should be configured with a function that takes in one parameter with type `CommandInteraction`
* disabled - this key is optional and should be configured with a boolean value. If the value is set to `true`, the command will not initialize during runtime.


## Example Usage/Template

```ts
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
const ExampleCmd = new SlashCommandBuilder()
    .setName('commandname')
    .setDescription(`Command Description`)

/* Function Builder */
const ExampleFunc = async (interaction : CommandInteraction) => {
    return await interaction.reply({content: 'Example Content', ephemeral: true});
}

export default {
    command: ExampleCmd,
    permissions: {
        roles: [],
        users: []
    }
    function: ExampleFunc,
    disabled: true,
} as ICommand;
```