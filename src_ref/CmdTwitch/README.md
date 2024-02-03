# Twitch Commands Documentation
All files here are modular thus should have a default export value.

## Return Value
Refer to `./index.ts -> twitchCmdType` for the proper types
```ts
export default {
    name,
    func,
    disabled,
}
```
* name - Command Name
* func - this key should be configured with a function that takes in one parameter with type `tmiTypes` under `index.ts`
* disabled - this key is optional and should be configured with a boolean value. If the value is set to `true`, the command will not initialize during runtime.


## Example Usage/Template

```ts
import { twitchCmdType } from './index';

const ExampleFunc : twitchCmdType ={
    name: "getpoints",
    func: async (data) => {
        await data.client.say(data.channel,`Hello World!`);
    },
    disabled: false
 }

 export default ExampleFunc;
```