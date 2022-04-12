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
const rest = new REST({ version: '9' }).setToken('OTYxNzI3MTc0ODgzMjgyOTQ0.Yk9MOg.sAUoPK3nnBf27UFLY1Lhel61e5Q');
(async ()=>{
  rest.put(
    Routes.applicationGuildCommands('961727174883282944', '936757132689276948'),
    { body: CommandList },
  ); 
})();