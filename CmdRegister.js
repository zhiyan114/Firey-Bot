const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const path = require('path');

const CommandList = []

// Read all the commands from the command directory
const dir = path.join(__dirname, 'commands');
fs.readdirSync(dir).forEach(file => {
    if (file.endsWith('.js')) {
        const cmdModule = require(path.join(dir, file));
        if(!cmdModule.disabled) CommandList.push(cmdModule.command.toJSON());
    }
});

/* Command Loader */
const rest = new REST({ version: '9' }).setToken('OTYzNDIwODYyNDgzMTQ0NzM1.YlV1mQ.06-w0uXaPMtmjKIDgs2gFgoCjMQ');
(async ()=>{
  rest.put(
    Routes.applicationGuildCommands('963420862483144735', '906899666656956436'),
    { body: CommandList },
  ); 
})();