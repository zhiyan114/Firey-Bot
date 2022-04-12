const sqlite = require('sqlite');
const db = new sqlite.Database(path.resolve("./Logs.db"),(sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE),(err)=>{
    if(err) {
        console.log(err)
    }
})

// Initialize the table for suspension logging
db.serialize(()=>{
    db.run(`Create Table if not exists \`suspension\` ()`);
})



module.exports = db;