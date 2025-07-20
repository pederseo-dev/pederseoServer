const express = require('express');
const cors = require('cors');
const MagicDef = require('magicdef');

const app = express();
const PORT = process.env.PORT || 3000;

const md = new MagicDef();
md.connect('sala-de-pruebas')

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function test() {
    return "hola desde el server";
}

md.export(test);

// Start server
app.listen(PORT, () => {
});

module.exports = app; 