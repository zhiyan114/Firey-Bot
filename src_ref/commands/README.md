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

**Critical: Must set `setDMPermission` to false for privileged commands**

## Example Usage/Template

```ts
import { SlashCommandBuilder } from "discord.js";
import { ICommand } from "../interface";

export default {
    command: new SlashCommandBuilder()
    .setName('commandname')
    .setDMPermission(false)
    .setDescription(`CommandDesc`),
    permissions: {
        roles: ["RoleID"],
        users: ["UserID"]
    },
    function: async (command)=>{
        
    },
    disabled: false,
} as ICommand;
```